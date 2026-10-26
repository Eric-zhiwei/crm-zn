# AGENTS.md

本仓库的 AI 协作约定。目录内更近的 `AGENTS.md` 优先。

## 项目

`crm-zn` 是生成 Monorepo 项目骨架的 CLI。TypeScript（`strict`）+ tsup（CJS）+ pnpm + ESLint 9 flat config + Prettier + Husky/lint-staged，发版用 standard-version。Node `>= 20.12.0`，运行时依赖仅 `fs-extra`、`inquirer`。

## 命令

```bash
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm run lint        # eslint + prettier --check，CI 同款
pnpm run build       # clean + typecheck + tsup
```

提交前 `pnpm run typecheck` 与 `pnpm run lint` 需通过。

## 结构

```text
src/index.ts            # CLI 入口：输出与错误兜底
src/main/index.ts       # main 模块出口，只导出主流程函数
src/main/main.ts        # 主流程：交互、拷贝模板、改写包名
src/main/main.config.ts # 常量与工具函数
src/main/main.type.ts   # 类型定义
templates/              # 生成用户项目的模板，属于产物
eslint.config.mjs      # 本仓库配置：ESLint / Prettier / TS / tsup
prettier.config.mjs
tsconfig.json
tsup.config.ts
README.md               # 中文主文档，README.en.md 为英文版
```

业务逻辑只写 `src/`：`tsconfig.json` 的 `include` 与 ESLint 的类型感知规则均只覆盖 `src/**/*.ts`。

依赖方向单向：`index.ts` → `main/index.ts` → `main/main.ts` → `main/main.config.ts` → `main/main.type.ts`。

## 编码

- 注释用中文，说明意图，不复述代码逻辑。
- 外部数据（用户输入、读入的 JSON）先用类型守卫收窄，`any` 不进入后续逻辑。
- 类型用 `import type` 导入；禁止悬空 Promise；`console` 仅限 `src/index.ts`，主流程用 `ProgressReporter` 回调把进度交给入口输出。
- 格式交给 Prettier（分号、单引号、尾随逗号、80 列），换行符 LF，见 `.gitattributes`。

## templates/

模板内容会原样复制进用户项目，改动风险高于 `src/`。

- `templates/**` 被 ESLint、Prettier 忽略，没有自动检查兜底。
- 子包名以 `@template/` 占位，由 CLI 改写为 `@<项目名>/<子包名>`，依赖引用同步改写；相关逻辑在 `src/main/main.config.ts` 的常量与工具函数、`src/main/main.ts` 的 `updateSubpackages`。
- 模板中的 tsconfig、ESLint/Prettier/Stylelint 配置必须能被对应工具直接解析。
- 根 tsconfig 的 `include` 须写具体源码路径，`"files": []` 与 `"include": []` 分别触发 TS18002、TS18003。

## 提交与发版

- 提交信息用 Conventional Commits：`feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `test:`。
- `CHANGELOG.md` 与 `package.json` 的 `version` 由 `pnpm run release` 生成，不手改。
- 不本地执行 `npm publish`；`dist/`、`node_modules/`、`.husky/_/` 不入库。

## 文档

- 面向用户的说明写 `README.md`，并同步 `README.en.md`。
- Markdown 同样经过 Prettier，`format:check` 含 `.md`。

## 约束

- 包管理器固定 pnpm，不改 `packageManager`。
- 打包固定 tsup + CJS，不更换构建工具或输出格式。
- 不放宽 `strict`，不用 `@ts-ignore` 绕过类型错误。

## 验证

改 `src/`：`typecheck` → `lint` → `build` → 在临时目录执行 `node dist/index.js`，核对目录结构与子包名改写结果。

改 `templates/`：在临时目录生成项目，在其中执行模板自带的 lint 与类型检查。

完成后报告改动文件、原因、已执行的验证，以及未覆盖的部分。
