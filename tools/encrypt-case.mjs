#!/usr/bin/env node
// Encrypts a case so it can live in a public repo.
//
//   node tools/encrypt-case.mjs new <slug>    → cases/_src/<slug>/case.html from tools/case-template.html
//   node tools/encrypt-case.mjs <slug> [--password 123456]
//        cases/_src/<slug>/case.html + its images  →  cases/<slug>.html (+ cases/<slug>/*.bin)
//
// Content: PBKDF2-SHA256 → AES-GCM-256 (WebCrypto, same as cases/lock.js).
// Every local <img src> / <audio src> in the source is encrypted with the same key into an opaque .bin
// (12-byte IV + ciphertext) and rewritten to data-enc, so no text or image is readable without the password.
import { readFile, writeFile, mkdir, rm, copyFile, access } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto, createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 310000;
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav' };
const b64 = u8 => Buffer.from(u8).toString('base64');
const exists = p => access(p).then(() => true, () => false);

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i < 0 ? null : args.splice(i, 2)[1]; };
const password = opt('--password') ?? '123456';
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

// images + voice-over → cases/<slug>/<hash>.bin
const outDir = join(ROOT, 'cases', slug);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const done = new Map();
let n = 0;
for (const [tag, el, src] of [...html.matchAll(/<(img|audio)\b[^>]*?\ssrc="([^"]+)"[^>]*>/g)].map(m => [m[0], m[1], m[2]])) {
  if (/^(https?:|data:|\/\/)/.test(src)) continue;
  if (!done.has(src)) {
    const buf = await readFile(join(srcDir, src));
    const { iv, ct } = await seal(buf);
    const name = createHash('sha256').update(salt).update(src).digest('hex').slice(0, 16) + '.bin';
    await writeFile(join(outDir, name), Buffer.concat([iv, ct]));
    const wh = el === 'img' && size(buf);
    done.set(src, `data-enc="${slug}/${name}" data-type="${MIME[extname(src).toLowerCase()] ?? 'application/octet-stream'}"` + (wh ? ` width="${wh[0]}" height="${wh[1]}"` : ''));
    n++;
  }
  html = html.replace(tag, tag.replace(`src="${src}"`, done.get(src)).replace(/<img\b/, '<img loading="lazy" decoding="async"'));
}

const { iv, ct } = await seal(enc.encode(html));
const payload = JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
const shell = await readFile(join(ROOT, 'tools/case-shell.html'), 'utf8');
await writeFile(join(ROOT, 'cases', `${slug}.html`), shell.replace('{{PAYLOAD}}', payload));
console.log(`cases/${slug}.html  ·  ${(ct.length / 1024).toFixed(1)} KB text  ·  ${n} media files → cases/${slug}/`);
