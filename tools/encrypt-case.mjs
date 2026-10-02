#!/usr/bin/env node
// Encrypts a case so it can live in a public repo.
//
//   node tools/encrypt-case.mjs new <slug>    → cases/_src/<slug>/case.html from tools/case-template.html
//   node tools/encrypt-case.mjs <slug> [--password 123456] [--open]
//        cases/_src/<slug>/case.html + its images  →  cases/<slug>.html (+ cases/<slug>/*.bin)
//
// Open mode (--open, or "mode": "open" in tools/case-meta.json): the case is public and indexable; only elements marked
// data-nda are encrypted — each one separately, with the same key — and replaced by a scratch-off placeholder that asks
// for the password on click (cases/lock.js). Other images and videos are copied as plain files.
//
// Content: PBKDF2-SHA256 → AES-GCM-256 (WebCrypto, same as cases/lock.js).
// Every local <img src> / <audio src> / <video src> in the source is encrypted with the same key into an opaque .bin
// (12-byte IV + ciphertext) and rewritten to data-enc, so no text or image is readable without the password.
import { readFile, writeFile, mkdir, rm, copyFile, access } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto, createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 310000;
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
  '.mp4': 'video/mp4', '.webm': 'video/webm' };
const b64 = u8 => Buffer.from(u8).toString('base64');
const exists = p => access(p).then(() => true, () => false);

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i < 0 ? null : args.splice(i, 2)[1]; };
const password = opt('--password') ?? '123456';
const flag = k => { const i = args.indexOf(k); return i < 0 ? false : (args.splice(i, 1), true); };
const openFlag = flag('--open');
const [cmd, slugArg] = args;
const slug = cmd === 'new' ? slugArg : cmd;
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node tools/encrypt-case.mjs [new] <slug> [--password 123456]   (slug: a-z 0-9 -)');
  process.exit(1);
}
const srcDir = join(ROOT, 'cases/_src', slug);

if (cmd === 'new') {
  const dst = join(srcDir, 'case.html');
  if (await exists(dst)) { console.error(`${dst} already exists`); process.exit(1); }
  await mkdir(join(srcDir, 'img'), { recursive: true });
  await copyFile(join(ROOT, 'tools/case-template.html'), dst);
  console.log(`created cases/_src/${slug}/case.html — fill it, drop images into cases/_src/${slug}/img/, then run:\n  node tools/encrypt-case.mjs ${slug}`);
  process.exit(0);
}

// intrinsic size from the file header, so the page reserves space before the image is decrypted
function size(buf) {
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const k = buf.toString('ascii', 12, 16);
    if (k === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (k === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    if (k === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  }
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length;) {
      const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  return null;
}

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const seal = async data => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv, ct: new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)) };
};

let html = (await readFile(join(srcDir, 'case.html'), 'utf8')).replace(/<!--[\s\S]*?-->/g, '').trim();
// title / description / OG image per case live in tools/case-meta.json (OG image: render tools/og.html?t=&d= → assets/og/<slug>.png)
const meta = JSON.parse(await readFile(join(ROOT, 'tools/case-meta.json'), 'utf8'))[slug] ?? { title: 'Case', description: '' };
const isOpen = openFlag || meta.mode === 'open';

// images, videos + voice-over → cases/<slug>/<hash>.bin (encrypted) or cases/<slug>/<hash>.<ext> (open mode, outside data-nda)
const outDir = join(ROOT, 'cases', slug);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const done = new Map();
let n = 0, plain = 0;
const MEDIA = /<(img|audio|video)\b[^>]*?\ssrc="([^"]+)"[^>]*>/g;
async function media(str, encrypt){
  for (const [tag, el, src] of [...str.matchAll(MEDIA)].map(m => [m[0], m[1], m[2]])) {
    if (/^(https?:|data:|\/\/)/.test(src)) continue;
    const id = (encrypt ? 'e:' : 'p:') + src;
    if (!done.has(id)) {
      const buf = await readFile(join(srcDir, src));
      const wh = el === 'img' && size(buf);
      const dims = wh ? ` width="${wh[0]}" height="${wh[1]}"` : '';
      if (encrypt) {
        const { iv, ct } = await seal(buf);
        const name = createHash('sha256').update(salt).update(src).digest('hex').slice(0, 16) + '.bin';
        await writeFile(join(outDir, name), Buffer.concat([iv, ct]));
        done.set(id, `data-enc="${slug}/${name}" data-type="${MIME[extname(src).toLowerCase()] ?? 'application/octet-stream'}"` + dims);
        n++;
      } else {
        const name = createHash('sha256').update(buf).digest('hex').slice(0, 16) + extname(src).toLowerCase();
        await writeFile(join(outDir, name), buf);
        done.set(id, `src="${slug}/${name}"` + (/\swidth=/.test(tag) ? '' : dims));
        plain++;
      }
    }
    str = str.replace(tag, tag.replace(`src="${src}"`, done.get(id)).replace(/<img\b/, '<img loading="lazy" decoding="async"'));
  }
  return str;
}

// open mode: pull every [data-nda] element out of the page (by tag balance), the rest stays readable
function extract(str){
  const frags = [];
  const open = /<([a-z][a-z0-9]*)\b[^>]*\sdata-nda\b[^>]*>/gi;
  let m;
  while ((m = open.exec(str))) {
    const tag = m[1], start = m.index, re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    re.lastIndex = open.lastIndex;
    let depth = 1, t;
    while (depth && (t = re.exec(str))) depth += t[1] ? -1 : 1;
    if (depth) throw new Error(`unclosed <${tag} data-nda>`);
    frags.push({ tag, outer: str.slice(start, re.lastIndex).replace(/\sdata-nda\b(="[^"]*")?/, '') });
    str = str.slice(0, start) + `\u0000${frags.length - 1}\u0000` + str.slice(re.lastIndex);
    open.lastIndex = start + 1;
  }
  return { str, frags };
}

const LABEL = 'aria-label="hidden data, enter the password to see it"';
async function placeholder(f, i){
  if (f.tag === 'span') {
    const len = f.outer.replace(/<[^>]+>/g, '').trim().length;
    return `<span class="nda" data-nda="${i}" role="button" tabindex="0" ${LABEL} style="--len:${len}"></span>`;
  }
  const img = f.outer.match(/<img\b[^>]*?\ssrc="([^"]+)"/);
  const wh = img && !/^(https?:|data:|\/\/)/.test(img[1]) && size(await readFile(join(srcDir, img[1])));
  const box = `<div class="nda nda-block" role="button" tabindex="0" ${LABEL}${wh ? ` style="aspect-ratio:${wh[0]}/${wh[1]}"` : ''}><span class="nda-lock" aria-hidden="true"><svg><use href="#i-lock"/></svg></span></div>`;
  if (f.tag === 'figure') return `<figure class="c-fig" data-nda="${i}">${box}${f.outer.match(/<figcaption[\s\S]*?<\/figcaption>/)?.[0] ?? ''}</figure>`;
  return box.replace('<div class="nda nda-block"', `<div class="nda nda-block" data-nda="${i}"`);
}

const b64s = async data => { const { iv, ct } = await seal(enc.encode(data)); return { iv: b64(iv), ct: b64(ct) }; };
let payload, content = '';
if (isOpen) {
  const { str, frags } = extract(html);
  content = await media(str, false);
  const sealed = [];
  for (const [i, f] of frags.entries()) {
    content = content.replace(`\u0000${i}\u0000`, await placeholder(f, i));
    sealed.push(await b64s(await media(f.outer, true)));
  }
  payload = JSON.stringify({ v: 2, mode: 'open', iter: ITER, salt: b64(salt), frags: sealed });
} else {
  html = await media(html, true);
  const { iv, ct } = await seal(enc.encode(html));
  payload = JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
}
const shell = await readFile(join(ROOT, 'tools/case-shell.html'), 'utf8');
// shared assets get ?v=<content hash> so browsers pick up style / script changes instead of serving a cached copy
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let page = shell.replaceAll('{{SLUG}}', slug).replaceAll('{{TITLE}}', attr(meta.title)).replaceAll('{{DESC}}', attr(meta.description)).replace('{{PAYLOAD}}', () => payload)
  .replace('{{ROBOTS}}', isOpen ? '' : '<meta name="robots" content="noindex">').replace('{{CONTENT}}', () => content);
for (const f of ['case.css', 'cases.js', 'case-ui.js', 'lock.js']) {
  const v = createHash('sha256').update(await readFile(join(ROOT, 'cases', f))).digest('hex').slice(0, 8);
  page = page.replace(new RegExp(`(href|src)="${f.replace('.', '\\.')}"`), `$1="${f}?v=${v}"`);
}
await writeFile(join(ROOT, 'cases', `${slug}.html`), page);
console.log(isOpen
  ? `cases/${slug}.html  ·  open, ${JSON.parse(payload).frags.length} hidden fragments  ·  ${n} encrypted + ${plain} plain media files → cases/${slug}/`
  : `cases/${slug}.html  ·  ${(JSON.parse(payload).ct.length * .75 / 1024).toFixed(1)} KB text  ·  ${n} media files → cases/${slug}/`);
