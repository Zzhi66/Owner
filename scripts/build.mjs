import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { build, resolveConfig } from 'vite';
import { assertBuildOutput } from './build-path.mjs';
import { auditProduction } from './production-audit.mjs';

async function fingerprint(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result[entry.name] = await fingerprint(path);
    else if (entry.isFile()) {
      result[entry.name] = createHash('sha256')
        .update(await readFile(path))
        .digest('hex');
    } else throw new Error(`原型目录包含不支持的文件类型：${path}`);
  }
  return result;
}

// resolveConfig defaults to development even for the build command.
process.env.NODE_ENV = 'production';
const config = await resolveConfig({}, 'build', 'production', 'production');
assertBuildOutput(config.root, config.build.outDir);
const prototypePath = join(config.root, 'dist');
const before = JSON.stringify(await fingerprint(prototypePath));
await build();
const after = JSON.stringify(await fingerprint(prototypePath));
if (before !== after) throw new Error('构建期间原型目录发生变化，请检查 dist/。');
console.log('Prototype integrity verified: dist/ unchanged.');
await auditProduction(join(config.root, 'build'));
