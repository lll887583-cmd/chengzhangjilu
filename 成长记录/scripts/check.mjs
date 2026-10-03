// 「成长记录」静态自检
//
// 这个项目没有构建链、没有测试框架，白屏和「改完不生效」这两类最容易出的事故，
// 光靠 node --check 是查不出来的。这个脚本把几个已经踩过的坑固化成断言。
//
// 用法：
//   node scripts/check.mjs                                   # 检查当前目录
//   node scripts/check.mjs "/Users/macbookpro/Documents/Daily/成长记录"
//
// 退出码 0 = 全部通过，1 = 有问题。改动 store.js / cloud.js / data.js / index.html 之后建议跑一遍。

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(process.argv[2] || dirname(fileURLToPath(import.meta.url)) + '/..');

const problems = [];
const notes = [];

function readIfExists(...parts) {
  const full = join(ROOT, ...parts);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

/* ---------- 1. 模块图：引用了不存在的文件 / 不存在的导出 ---------- */

function listFiles(exts) {
  const out = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (exts.some(ext => entry.name.endsWith(ext))) out.push(full);
    }
  };
  walk(ROOT);
  return out;
}

function exportsOf(file, seen = new Set()) {
  if (seen.has(file)) return new Set();
  seen.add(file);
  const text = readFileSync(file, 'utf8');
  const names = new Set();
  const patterns = [
    /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/g,
    /export\s+class\s+([A-Za-z0-9_$]+)/g
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) names.add(m[1]);
  }
  let m;
  const reExport = /export\s*\{([^}]*)\}(?!\s*from)/g;
  while ((m = reExport.exec(text))) {
    for (const piece of m[1].split(',')) {
      const name = piece.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  if (/export\s+default/.test(text)) names.add('default');
  // 转发导出：export { x } from './y.js'
  const reForward = /export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = reForward.exec(text))) {
    const source = resolve(dirname(file), m[2].split('?')[0]);
    if (!existsSync(source)) continue;
    for (const name of exportsOf(source, seen)) names.add(name);
  }
  return names;
}

function checkModuleGraph() {
  for (const file of listFiles(['.js'])) {
    const text = readFileSync(file, 'utf8');
    const importRe = /import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRe.exec(text))) {
      const clause = m[1].trim();
      const spec = m[2];
      if (!spec.startsWith('.')) continue;
      const target = resolve(dirname(file), spec.split('?')[0]);
      const where = `${relative(ROOT, file)} -> ${spec}`;
      if (!existsSync(target)) {
        problems.push(`模块图：文件不存在 ${where}`);
        continue;
      }
      const braceMatch = clause.match(/\{([^}]*)\}/);
      if (!braceMatch) continue;
      const available = exportsOf(target);
      for (const piece of braceMatch[1].split(',')) {
        const raw = piece.trim();
        if (!raw) continue;
        const imported = raw.split(/\s+as\s+/)[0].trim();
        if (!available.has(imported)) problems.push(`模块图：缺少导出 ${where} 的 ${imported}`);
      }
    }
  }
}

/* ---------- 2. 版本号后缀：同一文件被引用时必须同版本 ---------- */
//
// ES 模块按完整 URL 去重：'./store.js?v=a' 和 './store.js?v=b' 是两个各自独立的模块实例。
// store.js / cloud.js 一旦被实例化两份，待同步队列就会「写进 A 份、读的是 B 份」，
// 表现是「同步一直成功但数据始终不变」，非常难查。

function checkVersionSuffixes() {
  const versions = new Map();
  for (const file of listFiles(['.js', '.html', '.css'])) {
    const text = readFileSync(file, 'utf8');
    const re = /from\s*['"](\.[^'"]+)\?v=([^'"]+)['"]|["'](\.[^'"]+)\?v=([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(text))) {
      const spec = m[1] || m[3];
      const version = m[2] || m[4];
      if (!spec || !version) continue;
      const target = relative(ROOT, resolve(dirname(file), spec.split('?')[0]));
      if (!versions.has(target)) versions.set(target, new Map());
      const seen = versions.get(target);
      if (!seen.has(version)) seen.set(version, []);
      seen.get(version).push(relative(ROOT, file));
    }
  }
  for (const [target, seen] of versions) {
    if (seen.size <= 1) continue;
    const detail = [...seen].map(([v, files]) => `${v}（${[...new Set(files)].join('、')}）`).join(' | ');
    problems.push(`版本号不一致：${target} 被引用了 ${seen.size} 个版本 -> ${detail}`);
  }
  const html = readIfExists('index.html');
  const css = readIfExists('styles.css');
  if (html && css) {
    const htmlCssVersion = html.match(/styles\.css\?v=([^"']+)/)?.[1];
    const cssImports = [...css.matchAll(/@import url\('\.\/([^']+)\?v=([^']+)'\)/g)];
    if (htmlCssVersion && cssImports.length) {
      notes.push(`当前缓存版本：index.html 引用 styles.css?v=${htmlCssVersion}，styles.css 内部 ${cssImports.length} 个子样式`);
    }
  }
}

/* ---------- 3. 快照字段覆盖：数组字段必须明确归到某一档 ---------- */
//
// cloud.js 把 state 分成三档：
//   DEVICE_LOCAL_KEYS（不同步）、ARRAY_MERGE_KEYS（按 id 求并集）、SET_UNION_KEYS（按值求并集）。
// 剩下的字段走整包覆盖。新增一个数组字段却忘了归类，就会出现
// 「平板上改了，手机一同步就被推回原样」，且只在两端都用过之后才暴露。
// 这个断言就是为了在提交前拦住它。

function stringsInside(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return [];
  const end = text.indexOf(endMarker, start + startMarker.length);
  const body = text.slice(start + startMarker.length, end < 0 ? text.length : end);
  return [...body.matchAll(/['"]([A-Za-z0-9_$]+)['"]/g)].map(m => m[1]);
}

function objectKeysInside(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return [];
  const end = text.indexOf(endMarker, start + startMarker.length);
  const body = text.slice(start + startMarker.length, end < 0 ? text.length : end);
  return [...body.matchAll(/^\s{2}([A-Za-z0-9_$]+)\s*:/gm)].map(m => m[1]);
}

function arrayFieldsInDefaultState(dataText) {
  const start = dataText.indexOf('export const defaultState = {');
  if (start < 0) return [];
  const end = dataText.indexOf('\n};', start);
  const body = dataText.slice(start, end < 0 ? dataText.length : end);
  const fields = [];
  // 字面量数组： xxx: [], / xxx: [ ...
  for (const m of body.matchAll(/^\s{2}([A-Za-z0-9_$]+):\s*\[/gm)) fields.push(m[1]);
  // 由 map 得到的数组： xxx: SOMETHING.map((
  for (const m of body.matchAll(/^\s{2}([A-Za-z0-9_$]+):\s*[A-Za-z0-9_$.]+\.map\(/gm)) fields.push(m[1]);
  return [...new Set(fields)];
}

function checkSnapshotCoverage() {
  const dataText = readIfExists('data.js');
  const cloudText = readIfExists('cloud.js');
  if (!dataText || !cloudText) return;
  const deviceLocal = new Set(stringsInside(cloudText, 'const DEVICE_LOCAL_KEYS = new Set([', ']);'));
  const mergeById = new Set(objectKeysInside(cloudText, 'const ARRAY_MERGE_KEYS = {', '\n};'));
  const unionByValue = new Set(stringsInside(cloudText, 'const SET_UNION_KEYS = [', '];'));
  if (!deviceLocal.size || !mergeById.size) {
    problems.push('字段覆盖：cloud.js 里没读到 DEVICE_LOCAL_KEYS / ARRAY_MERGE_KEYS，可能改名了，请同步更新 scripts/check.mjs');
    return;
  }
  for (const field of arrayFieldsInDefaultState(dataText)) {
    if (deviceLocal.has(field) || mergeById.has(field) || unionByValue.has(field)) continue;
    problems.push(
      `字段覆盖：data.js 的数组字段 ${field} 没有归类到 cloud.js 的同步策略里。` +
      '请补充到 DEVICE_LOCAL_KEYS（不同步）/ ARRAY_MERGE_KEYS（按 id 并集）/ SET_UNION_KEYS（按值并集），' +
      '否则跨设备会互相回滚。'
    );
  }
}

/* ---------- 4. PWA 外观一致性 ---------- */

function checkPwaConsistency() {
  const manifestText = readIfExists('manifest.json');
  const html = readIfExists('index.html');
  if (!manifestText || !html) return;
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    problems.push('PWA：manifest.json 不是合法 JSON');
    return;
  }
  const meta = html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1];
  if (!meta) return;
  if (manifest.theme_color && manifest.theme_color.toLowerCase() !== meta.toLowerCase()) {
    problems.push(
      `PWA：manifest.json 的 theme_color（${manifest.theme_color}）与 index.html 的 meta theme-color（${meta}）不一致，` +
      '状态栏颜色会出现两套。'
    );
  }
}

/* ---------- 5. DEVICE_LOCAL_KEYS 里是否有已经改名失效的键 ---------- */

function defaultStateFields(text) {
  const start = text.indexOf('export const defaultState = {');
  if (start < 0) return new Set();
  const end = text.indexOf('\n};', start);
  const body = text.slice(start, end < 0 ? text.length : end);
  return new Set([...body.matchAll(/^\s{2}([A-Za-z0-9_$]+)\s*:/gm)].map(m => m[1]));
}

function checkDeviceLocalKeysAlive() {
  const cloudText = readIfExists('cloud.js');
  const dataText = readIfExists('data.js');
  if (!cloudText || !dataText) return;
  const deviceLocal = new Set(stringsInside(cloudText, 'const DEVICE_LOCAL_KEYS = new Set([', ']);'));
  const stateFields = defaultStateFields(dataText);
  const storeText = readFileSync(join(ROOT, 'store.js'), 'utf8');
  for (const key of deviceLocal) {
    // points / records 由 store.js 与云端流水共同维护，不落在默认状态快照里
    if (['points', 'records'].includes(key)) continue;
    // normalizeState 里补齐的字段（例如 customRuleDraftType）也算数
    if (!stateFields.has(key) && !storeText.includes(key)) {
      notes.push(`提示：DEVICE_LOCAL_KEYS 里的 ${key} 不在 data.js 的默认状态里，确认是不是改过名`);
    }
  }
}

/* ---------- 执行 ---------- */

checkModuleGraph();
checkVersionSuffixes();
checkSnapshotCoverage();
checkPwaConsistency();
checkDeviceLocalKeysAlive();

const jsCount = listFiles(['.js']).length;
console.log(`自检对象：${ROOT}（${jsCount} 个 JS 文件）`);
if (notes.length) {
  console.log('');
  notes.forEach(note => console.log(`  · ${note}`));
}
if (problems.length) {
  console.log('');
  problems.forEach(problem => console.log(`  ✗ ${problem}`));
  console.log(`\n发现 ${problems.length} 个问题`);
  process.exit(1);
}
console.log('\n全部通过：模块图完整、版本号一致、快照字段已归类、PWA 配色一致');
