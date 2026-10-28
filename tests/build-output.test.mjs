import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertBuildOutput } from '../scripts/build-path.mjs';
import { assertProductionCode } from '../scripts/production-audit.mjs';

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

describe('生产依赖边界', () => {
  it('拒绝实际渲染开发版 React 的构建结果', () => {
    expect(() => assertProductionCode('console.log("Download the React DevTools")')).toThrow(
      'React 开发代码',
    );
    expect(() => assertProductionCode('/* react-dom-client.development.js */')).toThrow(
      'React 开发代码',
    );
    expect(() => assertProductionCode('/* react.production.js */')).not.toThrow();
  });
});
