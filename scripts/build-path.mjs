import { resolve } from 'node:path';

/** Only the dedicated build directory may be emptied by the bundler. */
export function assertBuildOutput(root, outDir) {
  const output = resolve(root, outDir);
  if (output !== resolve(root, 'build')) {
    throw new Error('构建输出必须为项目 build/ 目录，禁止覆盖手写 dist/ 原型或其他目录。');
  }
  return output;
}
