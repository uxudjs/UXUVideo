# T01 双仓迁移基线

日期：2026-08-07  
结论：应用测试入口已恢复并通过；lint、build、typecheck 与严格验证仍有既有阻塞，后续任务不得把它们误报为新回归或通过。

## 证据摘要

- UXUVideo 的 T01 前用户改动由完整 `git status --porcelain=v1`、tracked diff SHA-256 和关键未跟踪文件 SHA-256 冻结；T01 未执行 reset、checkout、commit 或 push。
- 当前基线为 21 个 API 路由、8 个页面入口、22 个应用测试文件，显式枚举及修复后的 `npm test` 均为 80/80 通过。
- 原 `npm test` 的 `tests/**/*.test.ts` 在 Windows/Node 20 被当作字面路径；T01 以零依赖 `scripts/run-app-tests.mjs` 恢复跨平台入口。
- `npm run lint` 失败：199 项（139 errors、60 warnings），为现有全仓质量债务。
- `npm run build` 失败：Next webpack 以 CommonJS `require()` 加载 ESM-only `postcss-preset-env`，报 `ERR_REQUIRE_ESM`。
- `next typegen` 成功后，`tsc --noEmit` 仍因 `tests/auth.test.ts` 四处修改只读 `process.env.NODE_ENV` 失败。
- `./verification/run --quick` 执行完成但有 22 个 ERROR finding；其中包含上述 lint/type/build、脏工作树策略、Chrome 不可用、依赖/覆盖率/复杂度等独立门槛。
- `git diff --check` 退出码 0；仅报告已有 LF→CRLF 提示。

## 后续判定规则

新增失败只有在 T01 通过项变红，或既有失败的错误集合/严重度扩大时，才能归类为迁移回归。lint、build、typecheck 和 quick gate 在对应根因修复前均是本地候选的 NO-GO 条件；本地结果不证明 GitHub Pages、Cloudflare、D1 或真实第三方媒体可用。

<!-- baseline-contract:start -->
```json
{
  "schemaVersion": 1,
  "capturedAt": "2026-08-07",
  "environment": {
    "os": "Windows",
    "node": "v20.19.2",
    "npm": "10.8.2"
  },
  "repositories": {
    "uxuVideo": {
      "branch": "main",
      "trackedDiffSha256": "0cd2ff7988c2bc9098eadb3f4dc7fff84bb6ec38512d8dcab702eceba1232703",
      "trackedDiffScope": "git diff --binary --no-ext-diff before T01 changes; untracked files excluded",
      "status": [
        " D .dockerignore",
        " M .github/workflows/Github_Upstream_Sync.yml",
        " D .github/workflows/android-tv-apk.yml",
        " D .github/workflows/docker-publish.yml",
        " D Dockerfile",
        " M README.md",
        " D android-tv/app/build.gradle.kts",
        " D android-tv/app/src/main/AndroidManifest.xml",
        " D android-tv/app/src/main/java/com/kvideo/tv/MainActivity.kt",
        " D android-tv/app/src/main/res/drawable/tv_banner.xml",
        " D android-tv/app/src/main/res/layout/activity_main.xml",
        " D android-tv/app/src/main/res/mipmap-hdpi/ic_launcher.png",
        " D android-tv/app/src/main/res/mipmap-mdpi/ic_launcher.png",
        " D android-tv/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
        " D android-tv/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
        " D android-tv/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
        " D android-tv/app/src/main/res/values/strings.xml",
        " D android-tv/app/src/main/res/values/styles.xml",
        " D android-tv/build.gradle.kts",
        " D android-tv/gradle.properties",
        " D android-tv/gradle/wrapper/gradle-wrapper.jar",
        " D android-tv/gradle/wrapper/gradle-wrapper.properties",
        " D android-tv/gradlew",
        " D android-tv/gradlew.bat",
        " D android-tv/settings.gradle.kts",
        " M app/api/proxy/route.ts",
        " M app/layout.tsx",
        " D apple-tv/KVideoTV/KVideoTV/ContentView.swift",
        " D apple-tv/KVideoTV/KVideoTV/KVideoTVApp.swift",
        " D apple-tv/README.md",
        " M components/settings/PlayerSettings.tsx",
        " D docker-compose.yml",
        " M lib/config/deployment.ts",
        " M lib/config/runtime-features.ts",
        " M lib/hooks/useConfigSync.ts",
        " M lib/server/auth-helpers.ts",
        " M lib/server/redis.ts",
        " M lib/server/runtime-env.ts",
        " M lib/server/runtime-features.ts",
        " M lib/utils/grouped-sources-cache.ts",
        " M package-lock.json",
        " M package.json",
        " M tests/deployment.test.ts",
        " M verification/README.md",
        " M verification/package-lock.json",
        " M verification/package.json",
        " D verification/src/checks/android-config.mjs",
        " D verification/src/checks/android.mjs",
        " D verification/src/checks/deployment.mjs",
        " D verification/src/checks/docker-context.mjs",
        " D verification/src/checks/docker-local.mjs",
        " M verification/src/checks/duplicates.mjs",
        " M verification/src/checks/security-headers.mjs",
        " M verification/src/checks/source-policy.mjs",
        " M verification/src/checks/static-tools.mjs",
        " M verification/src/checks/visual.mjs",
        " M verification/src/config.mjs",
        " M verification/src/core/files.mjs",
        " M verification/src/history/catalog.mjs",
        " M verification/src/main.mjs",
        " M verification/src/policy/pr-evidence.mjs",
        " M verification/tests/harness/action.test.mjs",
        " M verification/tests/harness/boundary.test.mjs",
        " M verification/tests/harness/core.test.mjs",
        " D verification/tests/harness/docker-context.test.mjs",
        " M verification/tests/harness/integration-order.test.mjs",
        " M verification/tests/harness/visual.test.mjs",
        " M verification/tests/regression/deployment.test.ts",
        " M verification/tests/regression/verification-layout.test.ts",
        " D wrangler.toml",
        "?? .codegraph/",
        "?? AGENTS.md",
        "?? scripts/check-web-only.mjs",
        "?? work-products/"
      ],
      "protectedUntrackedSha256": {
        "AGENTS.md": "60708fc94f5718f2761f47022b1829a136fce8958ed457508094760844f8721c",
        "scripts/check-web-only.mjs": "e8a03bb4b3bd05d5ac3fe72d4969124c90b3d4600a9f6a52e5b0d7481a128339",
        "work-products/SPEC.md": "e792cb881cd98c6bc4683c23fb84640b5c6b0468c0b15290807431cb8022828d",
        "work-products/plan.md": "d51f93723daf4060b826c9330d1aa8a1ed4a6cf6bc452660682fdbb84919b815",
        "work-products/todo.md": "2121408a03a8ef2fcd100926a86209c078e2744138e19c330228097cbfbe43c5"
      }
    },
    "uxuvPages": {
      "branch": "main",
      "origin": "https://github.com/uxudjs/UXUV-Pages.git",
      "initialState": "empty-unborn-main",
      "status": "No commits yet on main; origin/main is gone; no project files"
    }
  },
  "inventory": {
    "apiRoutes": [
      "app/api/app-update/route.ts",
      "app/api/auth/accounts/[accountId]/route.ts",
      "app/api/auth/accounts/route.ts",
      "app/api/auth/route.ts",
      "app/api/auth/session/route.ts",
      "app/api/config/route.ts",
      "app/api/danmaku/route.ts",
      "app/api/detail/route.ts",
      "app/api/douban/image/route.ts",
      "app/api/douban/recommend/route.ts",
      "app/api/douban/tags/route.ts",
      "app/api/iptv/route.ts",
      "app/api/iptv/stream/route.ts",
      "app/api/ping/route.ts",
      "app/api/premium/category/route.ts",
      "app/api/premium/types/route.ts",
      "app/api/probe-resolution/route.ts",
      "app/api/proxy/route.ts",
      "app/api/search-parallel/route.ts",
      "app/api/user/config/route.ts",
      "app/api/user/sync/route.ts"
    ],
    "pages": [
      "app/favorites/page.tsx",
      "app/iptv/page.tsx",
      "app/page.tsx",
      "app/player/page.tsx",
      "app/premium/favorites/page.tsx",
      "app/premium/page.tsx",
      "app/premium/settings/page.tsx",
      "app/settings/page.tsx"
    ],
    "appTests": [
      "tests/account-actions-view.test.ts",
      "tests/android-pip-utils.test.ts",
      "tests/api-responses.test.ts",
      "tests/auth.test.ts",
      "tests/danmaku-canvas-utils.test.ts",
      "tests/deployment.test.ts",
      "tests/douban-image-fallback.test.ts",
      "tests/floating-button-position.test.ts",
      "tests/lan-access.test.ts",
      "tests/m3u8-ad-detector.test.ts",
      "tests/m3u8-duration-grid.test.ts",
      "tests/m3u8-filter-regression.test.ts",
      "tests/mobile-player-controls.test.ts",
      "tests/password-gate-state.test.ts",
      "tests/player-cursor-visibility.test.ts",
      "tests/player-settings-snapshot.test.ts",
      "tests/player-source-list.test.ts",
      "tests/resolution-probe-utils.test.ts",
      "tests/search-reliability.test.ts",
      "tests/sync-records.test.ts",
      "tests/tag-management-view.test.ts",
      "tests/webview83-assets.test.ts"
    ]
  },
  "validations": [
    {
      "id": "app-tests-explicit",
      "command": "PowerShell: enumerate tests/**/*.test.ts, then npx.cmd tsx --test <files>",
      "exitCode": 0,
      "classification": "pass",
      "evidence": "80 tests passed; npm test also passed 80/80 after the T01 runner fix"
    },
    {
      "id": "lint",
      "command": "npm run lint",
      "exitCode": 1,
      "classification": "fail",
      "evidence": "199 problems: 139 errors and 60 warnings; pre-existing full-tree debt"
    },
    {
      "id": "build",
      "command": "npm run build",
      "exitCode": 1,
      "classification": "blocked",
      "evidence": "ERR_REQUIRE_ESM while Next webpack requires postcss-preset-env/dist/index.mjs"
    },
    {
      "id": "diff-check",
      "command": "git diff --check",
      "exitCode": 0,
      "classification": "pass",
      "evidence": "No whitespace errors; only existing LF-to-CRLF working-copy warnings"
    },
    {
      "id": "verification-quick",
      "command": "bash ./verification/run --quick",
      "exitCode": 1,
      "classification": "fail",
      "evidence": "Runner completed with 22 ERROR findings; application unit tests and web-only policy passed"
    }
  ],
  "knownLimitations": {
    "npmTestGlob": {
      "classification": "existing-blocker",
      "observed": "tsx --test tests/**/*.test.ts treated the glob as a literal Windows path",
      "resolution": "T01 replaced the package entry with scripts/run-app-tests.mjs; npm test now passes 80/80"
    },
    "lint": {
      "classification": "existing-blocker",
      "observed": "139 errors and 60 warnings across existing source"
    },
    "build": {
      "classification": "existing-blocker",
      "observed": "ERR_REQUIRE_ESM from postcss-preset-env under Next webpack"
    },
    "typecheck": {
      "classification": "existing-blocker",
      "observed": "After next typegen succeeds, tests/auth.test.ts has four readonly NODE_ENV mutations"
    },
    "verificationQuick": {
      "classification": "mixed-existing-and-environment-blockers",
      "observed": "22 ERROR findings, including missing Chrome, dirty-tree policy, quality debt, dependencies, coverage, type and build"
    }
  }
}
```
<!-- baseline-contract:end -->
