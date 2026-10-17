import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertBuildOutput } from '../scripts/build-path.mjs';

describe('保护手写原型与仓库目录', () => {
  const root = resolve('owner-test-workspace');

  it('允许专用构建目录', () => {
    expect(assertBuildOutput(root, 'build')).toBe(resolve(root, 'build'));
  });

  it.each(['dist', '.', '..', '../build', 'src', 'build/../dist'])(
    '拒绝危险输出路径 %s',
    (outDir) => {
      expect(() => assertBuildOutput(root, outDir)).toThrow('构建输出必须');
    },
  );
});
