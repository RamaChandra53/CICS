import { rm } from 'node:fs/promises';

// These are generated outputs, never source, migrations, dependencies, or user data.
for (const path of ['.next', 'test-results', 'playwright-report']) {
  await rm(path, { recursive: true, force: true });
  console.log(`removed generated artifact: ${path}`);
}
