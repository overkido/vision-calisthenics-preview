import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = async () => (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter(file => file.isFile())
  .map(file => relative(root, join(file.parentPath, file.name)).split(/[\\/]/).join('/'));
const hidden = 'assets/node_modules/.pnpm';
const visible = 'assets/node_modules/_pnpm';
if ((await files()).some(path => path.startsWith(hidden + '/'))) {
  // Pages artifacts omit hidden directories.
  await rename(join(root, hidden), join(root, visible));
  for (const file of (await files()).filter(path => path.startsWith('_expo/') && path.endsWith('.js'))) {
    const bundlePath = join(root, file);
    const bundle = await readFile(bundlePath, 'utf8');
    const updated = bundle.replaceAll(hidden + '/', visible + '/');
    if (bundle !== updated) await writeFile(bundlePath, updated);
  }
}
const worker = await readFile(join(root, 'offline.js'), 'utf8');
await writeFile(join(root, 'offline.js'), '// Build ' + crypto.randomUUID() + '\n' + worker);
await writeFile(join(root, 'offline-assets.json'), JSON.stringify((await files()).filter(path => /^(assets\/|_expo\/|index\.html$)/.test(path))));
const entry = join(root, 'index.html');
const html = await readFile(entry, 'utf8');
const base = (process.env.EXPO_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
if (base && !/^\/[a-zA-Z0-9/_-]+$/.test(base)) throw new Error('Invalid Expo public base URL');
const fontFaces = await Promise.all([
  ['VISIONMontserratRegular', 'Montserrat_400Regular'],
  ['VISIONMontserratBold', 'Montserrat_700Bold'],
].map(async ([family, font]) => {
  const path = (await files()).find(file => file.includes('/' + font + '.') && file.endsWith('.ttf'));
  if (!path) throw new Error(`Font missing from web export: ${font}`);
  const data = (await readFile(join(root, path))).toString('base64');
  const url = JSON.stringify(`${base}/${path}`);
  return `@font-face{font-family:${family};src:url(data:font/ttf;base64,${data}) format("truetype"),url(${url}) format("truetype");font-display:swap;}`;
}));
const fontStyle = `<style>${fontFaces.join('')}body,button,input,textarea{font-family:VISIONMontserratRegular,Arial,sans-serif}</style>`;
const registration = `<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register(${JSON.stringify(base + '/offline.js')}).catch(console.warn);</script>`;
await writeFile(entry, html.replace('</head>', fontStyle + '</head>').replace('</body>', registration + '</body>'));
