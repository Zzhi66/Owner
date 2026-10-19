import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

export function initialChunks(manifest) {
  const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
  if (!entry) throw new Error('生产 manifest 缺少入口');
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    if (!manifest[key]) throw new Error(`生产 manifest 缺少依赖：${key}`);
    visited.add(key);
    for (const dependency of manifest[key].imports ?? []) visit(dependency);
  };
  visit(entry);
  return [...visited];
}
export async function auditProduction(directory) {
  const manifest = JSON.parse(await readFile(resolve(directory, '.vite/manifest.json'), 'utf8'));
  const initial = initialChunks(manifest);
  if (initial.some((key) => /(?:engine|echarts|zrender)/iu.test(`${key} ${manifest[key].file}`)))
    throw new Error('图表引擎不得进入总览首屏的静态依赖');
  if (
    Object.values(manifest).filter((chunk) => /(?:trend|habit|asset)-engine/u.test(chunk.src ?? ''))
      .length !== 3
  )
    throw new Error('缺少按类型延迟加载的图表入口');
  const root = resolve(directory) + sep;
  for (const chunk of Object.values(manifest)) {
    for (const file of [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])]) {
      const path = resolve(directory, file);
      if (!path.startsWith(root)) throw new Error('构建文件越出 build/');
      const size = (await stat(path)).size;
      if (file.endsWith('.js') && size > 500_000)
        throw new Error(`生产 JS 分包超出 500 kB：${file}`);
    }
  }
  const html = await readFile(resolve(directory, 'index.html'), 'utf8');
  if (/<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["'](?:https?:)?\/\//iu.test(html))
    throw new Error('生产入口存在外部脚本或样式依赖');
  console.log(
    `Production audit passed: ${Object.keys(manifest).length} chunks; charts load on demand; each JS chunk ≤500 kB.`,
  );
}
