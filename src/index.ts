#!/usr/bin/env node

import { createMonorepo } from './main';

/** CLI 入口：负责输出和错误兜底，主流程都在 main/main.ts 里。 */
async function run(): Promise<void> {
  console.log('Creating a Monorepo project scaffold...\n');

  const result = await createMonorepo((message) => console.log(message));

  console.log('\nProject created successfully.');
  console.log(`Package name: ${result.packageName}`);
  console.log(`Workspace scope: @${result.packageName}`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('\nFailed to create the project:', message);
  process.exitCode = 1;
});
