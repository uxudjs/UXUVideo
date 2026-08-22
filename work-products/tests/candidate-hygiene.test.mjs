import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import {
  INVENTORIES, classifyInventoryRow, decodeText,
} from './section21-inventory.mjs';

const workerRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pagesRoot = resolve(workerRoot, '..', 'UXUV-Pages');
const evidenceRoot = join(workerRoot, 'work-products', 'evidence', 'section21');
const GIT_FILE_LIST_MAX_BUFFER = 128 * 1024 * 1024;
const baselinePlanSha256 = '6ef4a9515b3929695b04b0886b3fca64680dce765b0a7f5f16dd6ceba64cd91a';
const binaryMime = new Map([
  ['.gif', 'image/gif'], ['.ico', 'image/x-icon'], ['.jpeg', 'image/jpeg'], ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'], ['.webp', 'image/webp'], ['.woff', 'font/woff'], ['.woff2', 'font/woff2'],
  ['.zip', 'application/zip'],
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function gitFiles(root, execute = execFileSync) {
  return execute('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root,
    maxBuffer: GIT_FILE_LIST_MAX_BUFFER,
  })
    .toString('utf8').split('\0').filter(Boolean);
}

function generatedFiles(root, relativeRoot) {
  const start = join(root, relativeRoot);
  if (!existsSync(start)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      const metadata = lstatSync(path);
      if (metadata.isSymbolicLink()) throw new Error(`candidate path is a symbolic link: ${relative(root, path)}`);
      if (metadata.isDirectory()) visit(path);
      else files.push(relative(root, path).replaceAll('\\', '/'));
    }
  };
  visit(start);
  return files;
}

function candidateFiles(repository) {
  const processArtifact = (path) => path === 'work-products/plan.md'
    || path === 'work-products/todo.md'
    || path === 'work-products/SPEC.md'
    || path.startsWith('work-products/debug/')
    || path.startsWith('work-products/evidence/section22/')
    || path.startsWith('work-products/tests/work/');
  const extras = repository.name === 'pages'
    ? [
      ...generatedFiles(repository.root, 'out'),
      ...generatedFiles(repository.root, 'release/current'),
      ...generatedFiles(repository.root, 'work-products/tests/fixtures/ui-review/section21-candidate'),
    ]
    : generatedFiles(repository.root, 'work-products/evidence/section21');
  return [...new Set([...gitFiles(repository.root), ...extras])]
    .filter((path) => !processArtifact(path))
    .sort();
}

function syntheticSecret(value) {
  return /(?:example|fixture|placeholder|redacted|test|password|secret|must-not-leak|must-not-ship|bootstrap)/i.test(value);
}

function highEntropy(value) {
  if (value.length < 32 || value.length > 256 || /^[a-f0-9]{32,}$/i.test(value) || /^https?:/i.test(value)) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[_./+=~-]/].filter((pattern) => pattern.test(value)).length;
  if (classes < 3 || new Set(value).size < 12) return false;
  const counts = new Map();
  for (const character of value) counts.set(character, (counts.get(character) ?? 0) + 1);
  const entropy = [...counts.values()].reduce((total, count) => {
    const probability = count / value.length;
    return total - probability * Math.log2(probability);
  }, 0);
  return entropy >= 4;
}

function textFindings(text) {
  const findings = [];
  const secretPrefix = new RegExp(`(?:github${'_pat_'}[A-Za-z0-9_]{20,}|gh[pousr]${'_'}[A-Za-z0-9]{30,}|sk${'-(?:proj-)?'}(?=[A-Za-z0-9_-]{20,})(?=[A-Za-z0-9_-]*[A-Z0-9_])[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})`, 'g');
  const privateKey = new RegExp(`BEGIN [A-Z ]*PRIVATE ${'KEY'}`, 'g');
  const machinePath = /(?:^|[\s"'`(])([A-Za-z]:(?:\\{1,2}|\/)(?:Users|Code|Windows|tmp|Temp)(?:\\{1,2}|\/)[^\s"'`]+)/g;
  const credentialAssignment = /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY))\b\s*[:=]\s*(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s#;]+))/g;
  const bearerOrSession = /\b(?:Bearer\s+[A-Za-z0-9._~-]{24,}|__Host-uxuv_session=[A-Za-z0-9_-]{32,})/g;
  const contextualCandidate = /\b([A-Za-z_][A-Za-z0-9_]*(?:token|secret|password|key))\b\s*[:=]\s*(?:"([A-Za-z0-9_./+=~-]{32,256})"|'([A-Za-z0-9_./+=~-]{32,256})'|([A-Za-z0-9_./+=~-]{32,256}))/gi;

  for (const pattern of [secretPrefix, privateKey, bearerOrSession, machinePath]) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) findings.push(`${match.index}:${match[0]}`);
  }
  credentialAssignment.lastIndex = 0;
  for (const match of text.matchAll(credentialAssignment)) {
    const value = match[2] ?? match[3] ?? match[4];
    if (value.length >= 12 && !syntheticSecret(value)) findings.push(`${match.index}:${match[1]}=<redacted>`);
  }
  contextualCandidate.lastIndex = 0;
  for (const match of text.matchAll(contextualCandidate)) {
    const value = match[2] ?? match[3] ?? match[4];
    if (/_KEY$/i.test(match[1]) && /^uxuv-[a-z0-9-]+$/i.test(value)) continue;
    if (highEntropy(value) && !syntheticSecret(value)) findings.push(`${match.index}:HIGH_ENTROPY=<redacted>`);
  }
  return [...new Set(findings)];
}

function zipMembers(bytes) {
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const minimumEocd = 22;
  let eocd = -1;
  for (let offset = bytes.length - minimumEocd; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === eocdSignature) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error('missing ZIP end-of-central-directory record');
  const entryCount = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  if (entryCount > 4_096 || centralOffset + centralSize > bytes.length) throw new Error('ZIP central directory exceeds limits');

  const members = [];
  let offset = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== centralSignature) throw new Error('invalid ZIP central directory');
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const nameEnd = offset + 46 + nameLength;
    if (nameEnd + extraLength + commentLength > bytes.length) throw new Error('truncated ZIP member metadata');
    const name = bytes.subarray(offset + 46, nameEnd).toString('utf8').replaceAll('\\', '/');
    if (!name || name.includes('\0') || /^(?:\/|[A-Za-z]:)/.test(name) || name.split('/').includes('..')) {
      throw new Error(`unsafe ZIP member path: ${name || '<empty>'}`);
    }
    if ((flags & 0x1) !== 0 || ![0, 8].includes(method)) throw new Error(`unsupported ZIP member encoding: ${name}`);
    if (uncompressedSize > 32 * 1024 * 1024 || totalBytes + uncompressedSize > 128 * 1024 * 1024) {
      throw new Error(`ZIP member exceeds scan limits: ${name}`);
    }
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== localSignature) throw new Error(`invalid ZIP local header: ${name}`);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > bytes.length) throw new Error(`truncated ZIP member: ${name}`);
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    const content = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: 32 * 1024 * 1024 });
    if (content.length !== uncompressedSize) throw new Error(`ZIP member size mismatch: ${name}`);
    totalBytes += content.length;
    if (!name.endsWith('/')) members.push({ name, content });
    offset = nameEnd + extraLength + commentLength;
  }
  if (offset !== centralOffset + centralSize) throw new Error('ZIP central directory size mismatch');
  return members;
}

function zipTextFindings(bytes, prefix = '', depth = 0) {
  if (depth > 3) return [`${prefix}:ARCHIVE_DEPTH_LIMIT`];
  const findings = [];
  try {
    for (const member of zipMembers(bytes)) {
      const memberPath = prefix ? `${prefix}!${member.name}` : member.name;
      if (extname(member.name).toLowerCase() === '.zip') {
        findings.push(...zipTextFindings(member.content, memberPath, depth + 1));
        continue;
      }
      const text = decodeText(member.content);
      if (text !== null) {
        for (const finding of textFindings(text)) findings.push(`${memberPath}:${finding}`);
      }
    }
  } catch (error) {
    findings.push(`${prefix || '<archive>'}:UNSCANNABLE_ARCHIVE:${error.message}`);
  }
  return findings;
}

function storedZip(name, content) {
  const nameBytes = Buffer.from(name);
  const contentBytes = Buffer.from(content);
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(contentBytes.length, 18);
  local.writeUInt32LE(contentBytes.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  nameBytes.copy(local, 30);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(contentBytes.length, 20);
  central.writeUInt32LE(contentBytes.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  nameBytes.copy(central, 46);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(local.length + contentBytes.length, 16);
  return Buffer.concat([local, contentBytes, central, eocd]);
}

function binaryAllowlist() {
  const value = JSON.parse(readFileSync(join(evidenceRoot, 'binary-allowlist.json'), 'utf8'));
  assert.equal(value.schemaVersion, 1);
  assert.ok(Array.isArray(value.files));
  return new Map(value.files.map((entry) => [`${entry.repository}:${entry.path}`, entry]));
}

function requiresBinaryReceipt(repository, path) {
  return path.startsWith('work-products/evidence/section21/')
    || (repository === 'pages' && path.startsWith('work-products/tests/fixtures/ui-review/section21-candidate/'));
}

function hygieneFindings() {
  const findings = [];
  const allowedBinaries = binaryAllowlist();
  for (const repository of [{ name: 'worker', root: workerRoot }, { name: 'pages', root: pagesRoot }]) {
    for (const path of candidateFiles(repository)) {
      const absolute = join(repository.root, path);
      if (!existsSync(absolute) || lstatSync(absolute).isDirectory()) continue;
      const bytes = readFileSync(absolute);
      const text = decodeText(bytes);
      if (text !== null) {
        for (const finding of textFindings(text)) findings.push(`${repository.name}:${path}:${finding}`);
        continue;
      }
      const mime = binaryMime.get(extname(path).toLowerCase());
      if (!mime) {
        findings.push(`${repository.name}:${path}:UNREVIEWED_BINARY`);
        continue;
      }
      if (requiresBinaryReceipt(repository.name, path)) {
        const receipt = allowedBinaries.get(`${repository.name}:${path}`);
        if (!receipt || receipt.mime !== mime || receipt.sha256 !== sha256(bytes)) {
          findings.push(`${repository.name}:${path}:UNRECEIPTED_BINARY`);
        }
      }
      if (mime === 'application/zip') {
        for (const finding of zipTextFindings(bytes, `${repository.name}:${path}`)) findings.push(finding);
      }
    }
  }
  return findings;
}

test('S21-T01 verifies immutable inventory schema and path-first classifications without rewriting evidence', () => {
  for (const definition of INVENTORIES) {
    const content = readFileSync(join(evidenceRoot, definition.name), 'utf8');
    const lines = content.split(/\r?\n/);
    assert.equal(lines[0], `plan-sha256\t${baselinePlanSha256}`);
    assert.equal(lines[1], 'columns\trepository:path\tline\tclassification\tfile-sha256\tmatching-line');
    assert.ok(lines.length > 3, `${definition.name} is unexpectedly empty`);
    for (const row of lines.slice(2).filter(Boolean)) {
      const fields = row.split('\t');
      assert.ok(fields.length >= 5, `invalid inventory row: ${row}`);
      const separator = fields[0].indexOf(':');
      const repository = fields[0].slice(0, separator);
      const path = fields[0].slice(separator + 1);
      const matchingLine = fields.slice(4).join('\t');
      assert.match(fields[1], /^[1-9]\d*$/);
      assert.match(fields[3], /^[a-f0-9]{64}$/);
      assert.equal(fields[2], classifyInventoryRow(
        definition.name, repository, path, matchingLine, definition.negativeFile,
      ), `${definition.name}:${fields[0]}:${fields[1]}`);
    }
  }
});

test('S21-T01 hygiene rules detect every required credential and machine-path class', () => {
  const samples = [
    `github${'_pat_'}${'A'.repeat(40)}`,
    `gh${'p_'}${'B'.repeat(36)}`,
    `sk${'-proj-'}${'C'.repeat(32)}`,
    `AKIA${'D'.repeat(16)}`,
    `-----BEGIN PRIVATE ${'KEY'}-----`,
    `Bearer ${'Ee7_'.repeat(9)}`,
    `__Host-uxuv_session=${'Ff8_'.repeat(12)}`,
    `${'C:'}\\${'Code'}\\project\\file.txt`,
    `${'C:'}/${'Users'}/name/project/file.txt`,
    `${'CLOUDFLARE_API_'}TOKEN="${'Gh9_Jk2-Lm3.Np4/Qr5+'.repeat(2)}"`,
    `${'AUTH_'}SECRET=${'Ij0_Kl3-Mn4.Op5/Qr6+'.repeat(2)}`,
    `${'ADMIN_'}PASSWORD=${'Ks1_Lm4-No5.Pq6/Rs7+'.repeat(2)}`,
    `service${'Token'}="${'Aa1_Bb2-Cc3.Dd4/Ee5+Ff6=Gg7~Hh8'.repeat(2)}"`,
  ];
  for (const sample of samples) assert.ok(textFindings(sample).length > 0, sample.slice(0, 24));
});

test('S21-T01 hygiene recursively scans textual ZIP members', () => {
  const archive = storedZip('test.trace/0-trace.stacks', `${'C:'}\\${'Code'}\\UXUV-Pages\\work-products\\tests\\fixture.ts`);
  assert.match(zipTextFindings(archive, 'fixture.zip').join('\n'), /fixture\.zip!test\.trace\/0-trace\.stacks:.*C:\\Code/);
});

test('S21-T15 candidate evidence remains internally bound after active repositories advance', () => {
  const evidencePath = join(evidenceRoot, 't15-candidate-evidence.json');
  const evidenceBytes = readFileSync(evidencePath);
  const evidence = JSON.parse(evidenceBytes);
  const approval = JSON.parse(readFileSync(join(evidenceRoot, 't15-visual-approval.json'), 'utf8'));
  const rollback = JSON.parse(readFileSync(join(evidenceRoot, 'pair-rollback.json'), 'utf8'));
  assert.equal(resolve(workerRoot, approval.preapprovalEvidence.path), resolve(evidencePath));
  assert.equal(approval.preapprovalEvidence.sha256, sha256(evidenceBytes));
  assert.equal(evidence.repositories.worker.head, rollback.drillBase.worker.commit);
  assert.equal(evidence.repositories.pages.head, rollback.drillBase.pages.commit);
  assert.equal(evidence.repositories.worker.version, rollback.identities.v2.workerVersion);
  assert.equal(evidence.repositories.worker.apiContract, rollback.identities.v2.workerApiContract);
  assert.equal(evidence.repositories.pages.version, rollback.identities.v2.pagesVersion);
  assert.equal(evidence.repositories.pages.apiContract, rollback.identities.v2.pagesApiContract);
  assert.equal(evidence.repositories.pages.workerRange, rollback.identities.v2.workerRange);
  for (const digest of [
    evidence.repositories.worker.runtime.sha256,
    evidence.repositories.worker.candidateManifestSha256,
    evidence.repositories.pages.candidateManifestSha256,
    evidence.repositories.pages.packageSha256,
    evidence.repositories.pages.packageLockSha256,
    evidence.repositories.pages.nextEnvSha256,
    evidence.repositories.pages.releaseScope.sha256,
  ]) assert.match(digest, /^[a-f0-9]{64}$/u);
  assert.ok(evidence.repositories.worker.runtime.bytes > 0);
  assert.ok(evidence.repositories.worker.runtime.gzipBytes < evidence.repositories.worker.runtime.gzipLimitBytes);
  assert.ok(evidence.repositories.pages.releaseScope.fileCount > 0);
});

test('S21-T15 final matrix binds the active candidate and visual decision', () => {
  const evidence = JSON.parse(readFileSync(join(evidenceRoot, 't15-candidate-evidence.json'), 'utf8'));
  const approval = JSON.parse(readFileSync(join(evidenceRoot, 't15-visual-approval.json'), 'utf8'));
  const matrix = readFileSync(join(evidenceRoot, 'red-matrix.md'), 'utf8');
  const bindings = [
    evidence.planSha256,
    `attempt ${evidence.attempt}`,
    evidence.repositories.worker.runtime.sha256,
    evidence.repositories.worker.candidateManifestSha256,
    evidence.repositories.pages.candidateManifestSha256,
    evidence.repositories.pages.releaseScope.sha256,
    evidence.candidate.combinedSha256,
    evidence.performance.trace.sha256,
    evidence.release.releaseManifest.sha256,
    evidence.rollback.pairRollback.sha256,
    approval.decision,
  ];
  for (const binding of bindings) assert.ok(matrix.includes(binding), `red-matrix missing current binding: ${binding}`);
  assert.equal((matrix.match(/^\| \d+ \|/gm) ?? []).length, 23);
  if (approval.decision === 'PENDING') {
    assert.doesNotMatch(matrix, /USER APPROVED|已获用户视觉批准|视觉批准均已闭合/);
  }
});

test('S21-T15 machine-readable visual decision is chained to the current evidence and review', () => {
  const approvalBytes = readFileSync(join(evidenceRoot, 't15-visual-approval.json'));
  const approval = JSON.parse(approvalBytes);
  const taskReceipt = JSON.parse(readFileSync(join(evidenceRoot, 'receipts', 'S21-T15.json'), 'utf8'));
  const todo = readFileSync(join(evidenceRoot, 'final-todo.md'), 'utf8');
  assert.equal(approval.schemaVersion, 2);
  assert.equal(approval.receiptKind, 'visual_approval');
  assert.ok(['NOT_READY', 'PENDING', 'APPROVED', 'REJECTED'].includes(approval.decision));
  assert.match(approval.candidateLabel, /^S21-T15 视觉候选 \d+$/);
  assert.ok(Array.isArray(approval.previewPaths) && approval.previewPaths.length > 0);
  assert.equal(approval.humanDecisionContract.shaRequired, false);
  assert.doesNotMatch(`${approval.humanDecisionContract.approvePhrase}\n${approval.humanDecisionContract.rejectPhrase}`, /SHA-?256|[a-f0-9]{64}/i);
  assert.equal(approval.preapprovalEvidence.sha256, sha256(readFileSync(join(workerRoot, approval.preapprovalEvidence.path))));
  assert.equal(approval.visualReview.sha256, sha256(readFileSync(join(workerRoot, approval.visualReview.path))));
  const evidence = JSON.parse(readFileSync(join(workerRoot, approval.preapprovalEvidence.path), 'utf8'));
  assert.equal(approval.machineBinding.candidateCombinedSha256, evidence.candidate.combinedSha256);
  assert.equal(approval.machineBinding.releaseScopeSha256, evidence.repositories.pages.releaseScope.sha256);
  assert.equal(approval.preapprovalEvidence.gateStatus, evidence.gateStatus);
  assert.equal(taskReceipt.attempt, approval.attempt);
  if (approval.decision === 'PENDING') {
    assert.deepEqual(taskReceipt.gate, { local: 'GREEN', release: 'HOLD', visualApproval: 'PENDING' });
    assert.deepEqual(taskReceipt.verification.remaining, [`user visual decision for candidate ${approval.attempt}`]);
    assert.match(todo, new RegExp(`视觉候选 ${approval.attempt} 已就绪，等待用户视觉决定，保持 HOLD`));
  }
  if (approval.decision === 'APPROVED') {
    assert.equal(approval.exactApprovalText, approval.humanDecisionContract.approvePhrase);
    assert.equal(taskReceipt.state, 'completed');
    assert.deepEqual(taskReceipt.gate, { local: 'GREEN', release: 'HOLD', visualApproval: 'APPROVED' });
    assert.deepEqual(taskReceipt.verification.remaining, []);
    assert.equal(taskReceipt.visualDecision.decision, 'APPROVED');
    assert.equal(taskReceipt.visualDecision.candidateLabel, approval.candidateLabel);
    assert.equal(taskReceipt.visualDecision.approvalSha256, sha256(approvalBytes));
    assert.match(todo, new RegExp(`视觉候选 ${approval.attempt} 已获用户批准，本地计划完成，发布保持 HOLD`));
  }
  if (['APPROVED', 'REJECTED'].includes(approval.decision)) {
    assert.match(approval.decidedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(typeof approval.decisionSummary, 'string');
    assert.ok(approval.decisionSummary.length > 0);
  } else {
    assert.equal(approval.decidedAt, null);
    assert.equal(approval.decisionSummary, null);
  }
  assert.equal(approval.authorization.commit, false);
  assert.equal(approval.authorization.push, false);
  assert.equal(approval.authorization.deploy, false);
});

test('S21-T15 rejected attempts keep candidate evidence as immutable self-contained archives', () => {
  const rejectedRoot = join(evidenceRoot, 'receipts', 'invalidated', 'debug-20260820');
  for (const attempt of [11, 12]) {
    const approvalPath = join(rejectedRoot, `t15-visual-approval-attempt${attempt}-rejected.json`);
    const approvalBytes = readFileSync(approvalPath);
    const approval = JSON.parse(approvalBytes);
    const evidencePath = join(workerRoot, approval.preapprovalEvidence.path);
    const reviewPath = join(workerRoot, approval.visualReview.path);
    const evidenceBytes = readFileSync(evidencePath);
    const evidence = JSON.parse(evidenceBytes);
    assert.equal(approval.attempt, attempt);
    assert.equal(approval.decision, 'REJECTED');
    assert.equal(evidence.attempt, attempt);
    assert.equal(evidencePath, join(rejectedRoot, `t15-candidate-evidence-attempt${attempt}-rejected.json`));
    assert.equal(reviewPath, join(rejectedRoot, `t15-visual-review-attempt${attempt}-rejected.md`));
    assert.equal(sha256(evidenceBytes), approval.preapprovalEvidence.sha256);
    assert.equal(sha256(readFileSync(reviewPath)), approval.visualReview.sha256);
    if (approval.supersedesDecision?.sha256) {
      assert.equal(approval.supersedesDecision.sha256, sha256(readFileSync(join(workerRoot, approval.supersedesDecision.path))));
    }
  }
});

test('S21-T15 rejected visual archives fail closed when attempt-specific previews are unavailable', () => {
  const rejectedRoot = join(evidenceRoot, 'receipts', 'invalidated', 'debug-20260820');
  const taskReceipt = JSON.parse(readFileSync(join(evidenceRoot, 'receipts', 'S21-T15.json'), 'utf8'));
  assert.deepEqual(taskReceipt.historicalArchiveCorrections?.map(({ attempt }) => attempt), [11, 12]);

  for (const entry of taskReceipt.historicalArchiveCorrections) {
    const correctionPath = join(workerRoot, entry.path);
    const correctionBytes = readFileSync(correctionPath);
    const correction = JSON.parse(correctionBytes);
    assert.equal(entry.sha256, sha256(correctionBytes));
    assert.equal(correction.schemaVersion, 1);
    assert.equal(correction.taskId, 'S21-T15');
    assert.equal(correction.attempt, entry.attempt);
    assert.equal(correction.receiptKind, 'historical_visual_archive_correction');
    assert.equal(correction.authoritativeDecision.status, 'REJECTED');
    assert.equal(correction.authoritativeDecision.sourcePath, correction.targets.approval.path);
    assert.equal(correction.authoritativeDecision.sourceSha256, correction.targets.approval.sha256);

    for (const target of Object.values(correction.targets)) {
      assert.equal(target.sha256, sha256(readFileSync(join(workerRoot, target.path))), target.path);
    }

    const approval = JSON.parse(readFileSync(join(workerRoot, correction.targets.approval.path), 'utf8'));
    const evidence = JSON.parse(readFileSync(join(workerRoot, correction.targets.candidateEvidence.path), 'utf8'));
    assert.equal(approval.attempt, entry.attempt);
    assert.equal(approval.decision, 'REJECTED');
    assert.equal(evidence.attempt, entry.attempt);
    assert.equal(correction.originalCandidate.combinedSha256, evidence.candidate.combinedSha256);
    assert.equal(correction.originalCandidate.totalBytes, evidence.candidate.totalBytes);
    assert.deepEqual(correction.previewDisposition.recoverablePaths, []);
    assert.equal(correction.previewDisposition.status, 'UNAVAILABLE');
    assert.equal(correction.previewDisposition.legacyPathsMustNotResolve, true);
    assert.equal(correction.previewDisposition.currentCandidateMustNotBeUsed, true);
    assert.equal(correction.preservation.archivedTargetsRewritten, false);
    assert.equal(correction.preservation.decisionChanged, false);
    assert.equal(correction.authorization.commit, false);
    assert.equal(correction.authorization.push, false);
    assert.equal(correction.authorization.deploy, false);
    assert.equal(correction.authorization.remoteChanges, false);

    const expectedReviewStatus = entry.attempt === 12
      ? 'PREDECISION_PENDING_SNAPSHOT_SUPERSEDED'
      : 'REJECTION_RECORD_WITH_UNAVAILABLE_PREVIEWS';
    assert.equal(correction.reviewDisposition.status, expectedReviewStatus);
    const expectedTaskReceiptStatus = entry.attempt === 12
      ? 'PREDECISION_READINESS_FIELDS_SUPERSEDED'
      : 'CONSISTENT_REJECTION';
    assert.equal(correction.taskReceiptDisposition.status, expectedTaskReceiptStatus);
    assert.equal(correction.presentation.userPresented, entry.attempt === 11);
    if (entry.attempt === 12) {
      const archivedTask = JSON.parse(readFileSync(join(workerRoot, correction.targets.taskReceipt.path), 'utf8'));
      assert.equal(archivedTask.gate.visualApproval, 'REJECTED');
      assert.equal(archivedTask.failure.userPresented, false);
      assert.deepEqual(archivedTask.verification.remaining, ['user visual decision for candidate 12']);
    }
  }
});

test('S21-T01 Git file enumeration budgets output above the Node default buffer', () => {
  const output = Buffer.from(`${'a'.repeat(1024 * 1024 + 1)}\0`);
  let observedOptions;
  const files = gitFiles(workerRoot, (file, arguments_, options) => {
    assert.equal(file, 'git');
    assert.deepEqual(arguments_, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
    observedOptions = options;
    return output;
  });
  assert.ok(
    observedOptions.maxBuffer >= output.byteLength,
    `maxBuffer ${observedOptions.maxBuffer ?? 'missing'} cannot hold ${output.byteLength} bytes`,
  );
  assert.equal(files.length, 1);
});

test('S21-T01 candidate contains no machine path, unreviewed binary, or credible secret material', () => {
  assert.deepEqual(hygieneFindings(), []);
});
