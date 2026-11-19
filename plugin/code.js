// FigJam to Paper export. Read-only: never changes the FigJam file.
// Converts every section on the current page (plus loose page items) to absolutely positioned HTML
// and collects image bytes, then hands one JSON file to ui.html for download.
// Image src values use ASSET as a placeholder; tools/split_export.py rewrites it to the real location.
const ASSET = '__FIGJAM_ASSET__';
const R = v => Math.round(v * 100) / 100;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Figma reports render bounds smaller than an exported SVG's own width/height (arrow heads and stroke
// caps sit outside them; a straight connector has zero height). Sizing the SVG to the render bounds
// squashes it, so use the SVG's own size and centre it on the render bounds. bb: render bounds, P: parent origin.
function placeSvg(svg, name, bb, P) {
  const w = svg.match(/^<svg[^>]*?\swidth="([\d.]+)"/), h = svg.match(/^<svg[^>]*?\sheight="([\d.]+)"/);
  if (!w || !h) throw new Error(`exported SVG for "${name}" has no width/height attributes`);
  const aw = Number(w[1]), ah = Number(h[1]);
  const left = R(bb.x - P.x - (aw - bb.width) / 2), top = R(bb.y - P.y - (ah - bb.height) / 2);
  return svg.replace(/^<svg/, `<svg layer-name="${esc(name)}" style="position:absolute;left:${left}px;top:${top}px;width:${aw}px;height:${ah}px"`);
}
if (typeof module !== 'undefined') module.exports = { placeSvg };
if (typeof figma !== 'undefined') run();

function run() {
figma.showUI(__html__, { width: 420, height: 260 });
const images = {};
const log = m => figma.ui.postMessage({ type: 'log', text: m });
(async () => {
try {
const page = figma.currentPage;
const hx = x => Math.round(x * 255).toString(16).padStart(2, '0');
const css = (c, a) => a >= 0.999 ? ('#' + hx(c.r) + hx(c.g) + hx(c.b)).toUpperCase() : `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${R(a)})`;
const paint = p => (!p || p.visible === false || p.type !== 'SOLID') ? null : css(p.color, p.opacity ?? 1);
const topFill = f => (f && f !== figma.mixed) ? f.map(paint).filter(Boolean).pop() || null : null;
const W = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 };
const fw = st => W[st.replace(/\s*Italic/, '').replace(/\s+/g, '').trim() || 'Regular'] ?? 400;
const lhOf = s => s.lineHeight.unit === 'PERCENT' ? R(s.fontSize * s.lineHeight.value / 100) : s.lineHeight.unit === 'PIXELS' ? R(s.lineHeight.value) : R(s.fontSize * 1.21);
const lsOf = s => s.letterSpacing.unit === 'PERCENT' ? R(s.letterSpacing.value / 100 * 1000) / 1000 + 'em' : R(s.letterSpacing.value) + 'px';
const fontCss = s => {
  const o = { 'font-family': s.fontName.family, 'font-weight': fw(s.fontName.style), 'font-size': R(s.fontSize) + 'px', 'letter-spacing': lsOf(s), color: topFill(s.fills) || '#000000' };
  if (/Italic/.test(s.fontName.style)) o['font-style'] = 'italic';
  if (s.textDecoration && s.textDecoration !== 'NONE') o['text-decoration'] = s.textDecoration === 'UNDERLINE' ? 'underline' : 'line-through';
  if (s.textCase === 'UPPER') o['text-transform'] = 'uppercase';
  return o;
};
const st = o => Object.entries(o).map(([k, v]) => `${k}:${esc(String(v).replace(/[;{}]/g, ''))}`).join(';');
const diff = (o, base) => { const d = {}; for (const k in o) if (o[k] !== base[k]) d[k] = o[k]; return d; };

// t: TextNode or TextSublayer. box: {abs: css string for positioning, width: number|null, align, name}
function textHTML(t, box) {
  const segs = t.getStyledTextSegments(['fontName', 'fontSize', 'fills', 'lineHeight', 'letterSpacing', 'textDecoration', 'listOptions', 'textCase']);
  if (!segs.length) return '';
  const lines = [[]];
  for (const s of segs) {
    s.characters.split('\n').forEach((p, i) => { if (i > 0) lines.push([]); lines[lines.length - 1].push({ s, c: p }); });
  }
  const base = fontCss(segs[0]);
  const align = { CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' }[box.align] || null;
  const wcss = box.width != null ? `width:${R(box.width)}px;white-space:pre-wrap` : 'white-space:pre';
  const lineSpans = ln => {
    let h = '';
    const lt = ln.find(x => x.s.listOptions && x.s.listOptions.type !== 'NONE');
    if (lt && ln.some(x => x.c.length)) h += lt.s.listOptions.type === 'ORDERED' ? '' : '•  ';
    for (const x of ln) { if (!x.c.length) continue; const d = st(diff(fontCss(x.s), base)); h += d ? `<span style="${d}">${esc(x.c)}</span>` : esc(x.c); }
    return h;
  };
  const lhs = lines.map(ln => Math.max(...ln.map(x => lhOf(x.s))));
  const uniform = lhs.every(v => v === lhs[0]);
  const nm = box.name ? ` layer-name="${esc(box.name)}"` : '';
  if (uniform) {
    const inner = lines.map(lineSpans).join('\n');
    return `<p${nm} style="${box.abs || ''}${box.abs ? ';' : ''}${wcss};${st(base)};line-height:${lhs[0]}px${align ? ';text-align:' + align : ''}">${inner}</p>`;
  }
  const ps = lines.map((ln, i) => `<p style="${box.width != null ? `width:${R(box.width)}px;white-space:pre-wrap` : 'white-space:pre'};line-height:${lhs[i]}px${align ? ';text-align:' + align : ''}">${lineSpans(ln) || '&nbsp;'}</p>`).join('');
  return `<div${nm} style="${box.abs || ''}${box.abs ? ';' : ''}display:flex;flex-direction:column;${st(base)}">${ps}</div>`;
}

const pos = (bb, P) => `position:absolute;left:${R(bb.x - P.x)}px;top:${R(bb.y - P.y)}px;width:${R(bb.width)}px;height:${R(bb.height)}px`;
function strokeCss(n) {
  if (!('strokes' in n) || !n.strokes.length) return '';
  const c = n.strokes.map(paint).filter(Boolean).pop(); if (!c) return '';
  const w = typeof n.strokeWeight === 'number' ? n.strokeWeight : 1;
  return n.strokeAlign === 'OUTSIDE' ? `0 0 0 ${w}px ${c}` : `inset 0 0 0 ${w}px ${c}`;
}
function effectsCss(n) {
  if (!('effects' in n)) return [];
  return n.effects.filter(e => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'))
    .map(e => `${e.type === 'INNER_SHADOW' ? 'inset ' : ''}${R(e.offset.x)}px ${R(e.offset.y)}px ${R(e.radius)}px ${R(e.spread || 0)}px ${css(e.color, e.color.a)}`);
}
const shadow = arr => arr.filter(Boolean).length ? `;box-shadow:${arr.filter(Boolean).join(', ')}` : '';
const radius = n => ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius) ? `;border-radius:${R(n.cornerRadius)}px` : '';
const opac = n => ('opacity' in n && n.opacity < 1) ? `;opacity:${R(n.opacity)}` : '';

async function svgOf(n, P) {
  const bb = n.absoluteRenderBounds || n.absoluteBoundingBox;
  let s = await n.exportAsync({ format: 'SVG_STRING' });
  s = s.replace(/<\?xml[^>]*>\s*/, '').trim();
  if (/<image[\s>]/.test(s) || s.length > 60000) {
    // embedded bitmaps: export a PNG file instead of inlining base64
    const key = 'n' + n.id.replace(/[:;]/g, '-');
    images[key] = figma.base64Encode(await n.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } }));
    return `<img layer-name="${esc(n.name.slice(0, 60))}" src="${ASSET}/${key}.png" style="position:absolute;left:${R(bb.x - P.x)}px;top:${R(bb.y - P.y)}px;width:${R(bb.width)}px;height:${R(bb.height)}px" />`;
  }
  return placeSvg(s, n.name, bb, P);
}
async function conv(n, P) {
  if (n.visible === false) return '';
  const bb = n.absoluteBoundingBox;
  const nm = esc(n.name.slice(0, 60));
  switch (n.type) {
    case 'STICKY': {
      const sc = bb.width / (n.isWideWidth ? 416 : 240), ins = R(20 * sc);
      const sh = `0 ${R(sc)}px ${R(3 * sc)}px rgba(0,0,0,0.1), 0 ${R(4 * sc)}px ${R(10 * sc)}px rgba(0,0,0,0.06)`;
      return `<div layer-name="${nm}" style="${pos(bb, P)};background-color:${topFill(n.fills) || '#FFD966'};box-shadow:${sh};padding:${ins}px;display:flex;flex-direction:column${opac(n)}">${textHTML(n.text, { width: bb.width - 2 * ins, align: n.text.textAlignHorizontal })}</div>`;
    }
    case 'SHAPE_WITH_TEXT': {
      const isE = n.shapeType === 'ELLIPSE';
      const padX = isE ? R(bb.width * 0.1464) : (bb.width > 600 ? 32 : 16);
      const br = isE ? ';border-radius:50%' : radius(n);
      return `<div layer-name="${nm}" style="${pos(bb, P)};background-color:${topFill(n.fills) || 'transparent'}${br}${shadow([strokeCss(n), ...effectsCss(n)])};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 ${padX}px${opac(n)}">${n.text.characters.length ? textHTML(n.text, { width: bb.width - 2 * padX, align: n.text.textAlignHorizontal }) : ''}</div>`;
    }
    case 'TEXT': {
      const auto = n.textAutoResize;
      let abs = `position:absolute;left:${R(bb.x - P.x)}px;top:${R(bb.y - P.y)}px` + (auto === 'NONE' ? `;height:${R(bb.height)}px` : '') + opac(n);
      return textHTML(n, { abs, width: auto === 'WIDTH_AND_HEIGHT' ? null : bb.width, align: n.textAlignHorizontal, name: n.name.slice(0, 60) });
    }
    case 'RECTANGLE': {
      const img = n.fills !== figma.mixed && n.fills.some(f => f.type === 'IMAGE' && f.visible !== false);
      if (img) {
        const sw = typeof n.strokeWeight === 'number' && n.strokes.length ? n.strokeWeight : 0;
        const sc = n.strokes.map(paint).filter(Boolean).pop();
        return `<img layer-name="${nm}" src="${ASSET}/${n.id.replace(':', '-')}.png" style="${pos(bb, P)};object-fit:cover;background-color:#FFFFFF${sw ? `;border:${sw}px solid ${sc}` : ''}${radius(n)}${shadow(effectsCss(n))}${opac(n)}" />`;
      }
      return `<div layer-name="${nm}" style="${pos(bb, P)};background-color:${topFill(n.fills) || 'transparent'}${radius(n)}${shadow([strokeCss(n), ...effectsCss(n)])}${opac(n)}"></div>`;
    }
    case 'SECTION': case 'FRAME': case 'GROUP': case 'COMPONENT': case 'INSTANCE': {
      let kids = '';
      for (const c of n.children) kids += await conv(c, bb);
      const fill = n.type === 'GROUP' ? null : topFill(n.fills);
      const clip = (n.type === 'FRAME' && n.clipsContent) ? ';overflow:hidden' : '';
      return `<div layer-name="${nm}" style="${pos(bb, P)}${fill ? ';background-color:' + fill : ''}${radius(n)}${shadow([strokeCss(n), ...effectsCss(n)])}${clip}${opac(n)}">${kids}</div>`;
    }
    default:
      return await svgOf(n, P); // CONNECTOR, STAMP, VECTOR, ELLIPSE, LINE, etc.
  }
}
async function collectImage(n) {
  const f = n.fills.find(f => f.type === 'IMAGE' && f.visible !== false);
  const key = n.id.replace(':', '-');
  if (images[key] || !f || !f.imageHash) return;
  const img = figma.getImageByHash(f.imageHash);
  if (img) images[key] = figma.base64Encode(await img.getBytesAsync());
}
async function walkImages(n) {
  if (n.type === 'RECTANGLE' && n.fills !== figma.mixed && n.fills.some(f => f.type === 'IMAGE' && f.visible !== false)) await collectImage(n);
  if ('children' in n) for (const c of n.children) await walkImages(c);
}
async function htmlOf(kids, P) {
  let html = '';
  for (const k of kids) html += await conv(k, P);
  return html;
}
const sections = [];
const secs = page.children.filter(c => c.type === 'SECTION');
for (const sec of secs) {
  log(`Converting ${sec.name} (${sec.id})...`);
  const P = sec.absoluteBoundingBox;
  for (const c of sec.children) await walkImages(c);
  const firstText = (sec.findOne(n => n.type === 'TEXT') || {}).characters || '';
  sections.push({ id: sec.id, name: sec.name, firstText: firstText.slice(0, 80), x: P.x, y: P.y, w: P.width, h: P.height,
    fill: topFill(sec.fills), stroke: strokeCss(sec), r: sec.cornerRadius ?? null, total: sec.children.length, html: await htmlOf(sec.children, P) });
}
const loose = page.children.filter(c => c.type !== 'SECTION');
if (loose.length) {
  log('Converting loose page items...');
  const bs = loose.map(c => c.absoluteBoundingBox);
  const P = { x: Math.min(...bs.map(b => b.x)), y: Math.min(...bs.map(b => b.y)) };
  for (const c of loose) await walkImages(c);
  sections.push({ id: 'LOOSE', name: 'Loose page items', x: P.x, y: P.y, total: loose.length, html: await htmlOf(loose, P) });
}
log(`Done: ${sections.length} boards, ${Object.keys(images).length} images. Preparing download...`);
figma.ui.postMessage({ type: 'result', json: JSON.stringify({ fileKey: figma.fileKey || null, page: page.id, sections, images }) });
} catch (e) {
  figma.ui.postMessage({ type: 'log', text: 'ERROR: ' + (e && e.stack || e) });
}
})();
figma.ui.onmessage = async m => {
  if (m === 'close') return figma.closePlugin();
  if (m === 'pngs') {
    try {
      const page = figma.currentPage;
      const shots = {};
      for (const sec of page.children.filter(c => c.type === 'SECTION')) {
        log(`Rendering ${sec.name} (${sec.id})...`);
        shots[sec.id.replace(':', '-')] = figma.base64Encode(await sec.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: 2400 } }));
      }
      figma.ui.postMessage({ type: 'pngs', json: JSON.stringify(shots) });
    } catch (e) { log('ERROR: ' + (e && e.stack || e)); }
  }
};
}
