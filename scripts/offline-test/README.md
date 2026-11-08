# 离线测试运行器（无需 npm install）

在无法访问 npm 的环境中验证业务逻辑用。需要 Node.js ≥ 22.18：

- 用 Node 内置的 TypeScript 类型擦除直接运行 `.ts`
- 用 `node:sqlite` 模拟 better-sqlite3 的同步 API
- 用极简 shim 替代 vitest 的 `describe / it / expect`

```bash
node --import ./scripts/offline-test/register.mjs --experimental-transform-types --no-warnings \
  ./scripts/offline-test/run.mjs $PWD/tests/logic/*.test.ts $PWD/tests/db/*.test.ts
```

正式环境请使用 `npm test`（真实 vitest + better-sqlite3）。
