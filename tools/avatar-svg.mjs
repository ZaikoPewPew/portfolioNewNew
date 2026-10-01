// Turns the flat auto-traced sticker (233 loose paths) into assets/avatar.svg with animatable groups:
//   #avaEyeL / #avaEyeR — whole eye, squashed for a blink
//   .ava-iris inside each eye, clipped to the eye white, shifted to look at the cursor
//   .ava-dash ×4 — the motion strokes around the head
// The white sticker border (largest #FEFEFE path + its #CAC9C9 edge) is dropped and cut out of the black silhouette under it by a mask.
// Path indices were picked by bounding box in lab/ava-inspect.html. Re-check them if the trace changes.
// usage: node tools/avatar-svg.mjs <traced.svg> [out=assets/avatar.svg]
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out = 'assets/avatar.svg'] = process.argv.slice(2);
if (!src) { console.error('usage: node tools/avatar-svg.mjs <traced.svg> [out]'); process.exit(1) }
const paths = readFileSync(src, 'utf8').match(/<path\b[^>]*\/>/g);

const EYE_L = [24,35,53,57,65,69,98,108,128,142,148,150,161,167,169,184,191,207,224,227], IRIS_L = [53,69,169], WHITE_L = 35;
const EYE_R = [19,34,51,58,67,70,91,99,130,181,200,201,211,221], IRIS_R = [51,67], WHITE_R = 34;
const DASHES = { 26: 'tr', 31: 'r', 33: 'lt', 38: 'lb' };   // top-right, right, left-top, left-bottom

const eye = (id, all, iris, white) => {
  const body = all.filter(i => !iris.includes(i)), at = all.indexOf(iris[0]);
  const irisG = `<g clip-path="url(#${id}Clip)"><g class="ava-iris">${iris.map(i => paths[i]).join('')}</g></g>`;
  const parts = body.map(i => paths[i]); parts.splice(body.filter(i => all.indexOf(i) < at).length, 0, irisG);
  return { first: Math.min(...all), svg: `<g class="ava-eye" id="${id}">${parts.join('')}</g>`, clip: `<clipPath id="${id}Clip">${paths[white]}</clipPath>` };
};
const eyes = [eye('avaEyeL', EYE_L, IRIS_L, WHITE_L), eye('avaEyeR', EYE_R, IRIS_R, WHITE_R)];
const grouped = new Set([...EYE_L, ...EYE_R]);
const border = paths.reduce((b, p, i) => p.includes('#FEFEFE') && p.length > paths[b].length ? i : b, paths.findIndex(p => p.includes('#FEFEFE')));
const cut = paths[border].replace('fill="#FEFEFE"', 'fill="#000" stroke="#000" stroke-width="10"');   // stroke eats the silhouette's antialiased hairline
const mask = `<mask id="avaCut" maskUnits="userSpaceOnUse" x="0" y="0" width="4000" height="4000"><rect width="4000" height="4000" fill="#fff"/>${cut}</mask>`;

let body = '', dashes = '';   // dashes sit over the border, so they go outside the mask
paths.forEach((p, i) => {
  const e = eyes.find(e => e.first === i); if (e) { body += e.svg; return }
  if (grouped.has(i) || i === border || p.includes('#CAC9C9')) return;
  if (DASHES[i]) dashes += `<g class="ava-dash" data-d="${DASHES[i]}">${p}</g>`; else body += p;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 930 772" width="930" height="772"><defs>${eyes.map(e => e.clip).join('')}${mask}</defs><g transform="scale(.25)"><g mask="url(#avaCut)">${body}</g>${dashes}</g></svg>\n`;
writeFileSync(out, svg);
console.log(`${out}: ${paths.length} paths, ${(svg.length / 1024).toFixed(0)} KB`);
