import path from 'node:path';
import { findWebOnlyViolations } from '../../../scripts/check-web-only.mjs';
import { finding } from '../core/finding.mjs';
import { lineCount, relative, walk, writeJson } from '../core/files.mjs';

const codeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss',
  '.json', '.yaml', '.yml', '.svg', '.html', '.sh']);
const generatedNames = /(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(?:js|css))$/;

export function projectSourceFile(file) {
  return !generatedNames.test(file) && codeExt.has(path.extname(file));
}

function inventory(root, files) {
  return files.map((file) => ({ file: relative(root, file), lines: lineCount(file) })).sort((a, b) => b.lines - a.lines);
}

export async function checkSourcePolicy(ctx) {
  const root = ctx.config.root;
  const webOnlyViolations = findWebOnlyViolations(root);
  finding(ctx, {
    id: 'source.web-only-policy', category: 'source', title: 'Repository contains only supported web delivery surfaces',
    status: webOnlyViolations.length ? 'FAIL' : 'PASS', severity: 'critical', expected: 'No Cloudflare deployment adapter, Docker packaging, or native app project',
    actual: webOnlyViolations.length ? JSON.stringify(webOnlyViolations) : '0 forbidden deployment surfaces',
    reason: webOnlyViolations.length ? 'Unsupported deployment or native application capability was reintroduced.' : 'Only supported web delivery surfaces are present.',
    remediation: 'Remove every reported path, script, or dependency before merging.',
  });
  const projectFiles = walk(root, (file) => projectSourceFile(file) && !file.includes('/verification/'));
  const project = inventory(root, projectFiles);
  const oversized = project.filter((item) => item.lines > ctx.config.maxSourceLines);
  const totalLines = project.reduce((sum, item) => sum + item.lines, 0);
  writeJson(path.join(ctx.dirs.metrics, 'source-inventory.json'), { totalLines, files: project, oversized });
  finding(ctx, {
    id: 'source.project-line-policy', category: 'source', title: 'Project source files respect the 150-line policy',
    status: oversized.length ? 'FAIL' : 'PASS', severity: 'high', expected: `Every source file <= ${ctx.config.maxSourceLines} lines`,
    actual: `${oversized.length}/${project.length} files exceed the limit; ${totalLines} total lines`,
    reason: oversized.length ? 'Large files concentrate responsibilities and materially increase review and regression risk.' : 'All source files meet the limit.',
    impact: oversized.slice(0, 20).map((item) => `${item.file}:${item.lines}`).join(', '),
    evidence: [path.join(ctx.dirs.metrics, 'source-inventory.json')], remediation: 'Split oversized business files by cohesive responsibility in a separate change.',
  });
  const authored = walk(ctx.config.verifyDir, (file) => !file.includes('/node_modules/') && !file.includes('/artifacts/')
    && !file.includes('/tmp/') && path.basename(file) !== 'package-lock.json');
  const validator = inventory(ctx.config.verifyDir, authored);
  const validatorOversized = validator.filter((item) => item.lines > ctx.config.maxSourceLines);
  writeJson(path.join(ctx.dirs.metrics, 'verification-inventory.json'), validator);
  finding(ctx, {
    id: 'source.verification-line-policy', category: 'harness', title: 'Verification files respect the 150-line policy',
    status: validatorOversized.length ? 'FAIL' : 'PASS', severity: 'critical', expected: `Every authored verification file <= ${ctx.config.maxSourceLines} lines`,
    actual: validatorOversized.length ? JSON.stringify(validatorOversized) : `${validator.length} files comply`,
    reason: validatorOversized.length ? 'The delivered validation code violates the explicit file-size constraint.' : 'The validation implementation is partitioned within the limit.',
    evidence: [path.join(ctx.dirs.metrics, 'verification-inventory.json')], remediation: 'Split the listed verification files before trusting or publishing the suite.',
  });
}
