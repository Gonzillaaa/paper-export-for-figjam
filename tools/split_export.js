// Prepare a downloaded FigJam export for Paper using only Node's standard library.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { parseArgs } = require('node:util');

const tagPattern = /<(\/?)([a-zA-Z][\w:.-]*)(?:[^<>"']|"[^"]*"|'[^']*')*?(\/?)>/g;
const attributePattern = /(\s+)([^\s=/>]+)(\s*=\s*)("[^"]*"|'[^']*')/g;
const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);
const placeholder = '__FIGJAM_ASSET__/';
const reservedName = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

const usage = [
  'Usage: node tools/split_export.js <export.json> <output-folder> [options]',
  'Split a FigJam board into a Paper plan, ordered HTML parts and image files.',
  'Choose a new or empty output folder.',
  '  --budget N          Maximum characters per part (from tools/settings.json).',
  '  --asset-prefix URL  Image URL prefix (defaults to the local output assets).',
  '  -h, --help          Show this help.',
].join('\n');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJson(file) {
  // Reject invalid UTF-8 rather than quietly changing a layer. TextDecoder strips a BOM.
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file)));
}

function elements(html) {
  const result = [];
  const stack = [];
  let start = 0;
  for (const match of html.matchAll(tagPattern)) {
    const [token, closing, name, selfClosing] = match;
    const tag = name.toLowerCase();
    if (!stack.length && match.index !== start) throw new Error('unbalanced HTML: text outside a layer');
    if (closing) {
      if (stack.pop() !== tag) throw new Error('unbalanced HTML: unexpected </' + tag + '>');
    } else if (!selfClosing && !voidTags.has(tag)) {
      stack.push(tag);
    }
    if (!stack.length) {
      const end = match.index + token.length;
      result.push(html.slice(start, end));
      start = end;
    }
  }
  if (stack.length || start !== html.length) throw new Error('unbalanced HTML: incomplete layer');
  return result;
}

function* partsFor(layers, budget) {
  let parts = [];
  let chars = 0;
  for (const layer of layers) {
    // String.length counts an astral character twice. The export budget counts code points.
    let length = 0;
    for (let i = 0; i < layer.length; i++, length++) {
      if (layer.codePointAt(i) > 0xFFFF) i++;
    }
    if (parts.length && chars + length > budget) {
      yield { html: parts.join(''), elements: parts.length, chars };
      parts = [];
      chars = 0;
    }
    parts.push(layer);
    chars += length;
  }
  if (parts.length) yield { html: parts.join(''), elements: parts.length, chars };
}

function decodeImage(value, key) {
  if (typeof value !== 'string' || !value) throw new Error('missing base64 data for image ' + key);
  // Buffer.from is deliberately forgiving. Validate the alphabet and final padding first.
  const match = /^([A-Za-z0-9+/]+)(=*)$/.exec(value);
  if (!match) throw new Error('invalid base64 for image ' + key);
  const remaining = match[1].length % 4;
  if (remaining === 1 || (remaining !== 0 && match[2].length !== 4 - remaining)) {
    throw new Error('invalid base64 for image ' + key);
  }
  return Buffer.from(value, 'base64');
}

function writeImages(images, dir) {
  const names = new Map();
  const used = new Set();
  for (const [key, value] of Object.entries(images)) {
    if (!key || /[^A-Za-z0-9_-]/.test(key) || reservedName.test(key) || used.has(key.toLowerCase())) {
      throw new Error('invalid or duplicate image key ' + JSON.stringify(key));
    }
    used.add(key.toLowerCase());
    const bytes = decodeImage(value, key);
    // Earlier exports used PNG references for the original JPEG and GIF bytes.
    const signature = bytes.toString('latin1', 0, 6);
    let ext = '.png';
    if (signature.startsWith('\xFF\xD8\xFF')) ext = '.jpg';
    else if (signature === 'GIF87a' || signature === 'GIF89a') ext = '.gif';
    names.set(key, key + ext);
    fs.writeFileSync(path.join(dir, key + ext), bytes);
  }
  return names;
}

function resolveImages(html, names, prefix, boardId) {
  const escapedPrefix = prefix.replace(/\/+$/, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
  return html.replace(tagPattern, (token, closing, tag) => {
    if (closing || tag.toLowerCase() !== 'img') return token;
    return token.replace(attributePattern, (attribute, space, name, equals, quoted) => {
      const value = quoted.slice(1, -1);
      if (name.toLowerCase() !== 'src' || !value.startsWith(placeholder)) return attribute;
      const key = value.slice(placeholder.length).replace(/\.png$/, '');
      if (!names.has(key)) throw new Error('board ' + boardId + ' uses image missing from the export: ' + key);
      return space + name + equals + '"' + escapedPrefix + '/' + names.get(key) + '"';
    });
  });
}

function validateBoard(board) {
  if (!isObject(board) || !['id', 'name', 'html'].every(key => typeof board[key] === 'string')) {
    throw new Error('each board needs an id, name and HTML string');
  }
  if (!Number.isSafeInteger(board.total) || board.total < 0) throw new Error('invalid item count for board ' + board.id);
  for (const key of ['x', 'y', 'w', 'h', 'r']) {
    if (board[key] == null && key !== 'x' && key !== 'y') continue;
    if (!Number.isFinite(board[key])) throw new Error('board ' + board.id + ' has invalid geometry for ' + key);
  }
}

function offset(value, origin) {
  const diff = value - origin;
  if (!Number.isFinite(diff)) throw new Error('board offset is outside the supported range');
  // Match the previous two-decimal, ties-to-even rounding. Exact half-cent ties
  // in a binary float are odd eighths (0.125, 0.375, ...).
  if ((diff * 8) % 2 === 1) return 2 * Math.round(diff * 50) / 100;
  return Number(diff.toFixed(2));
}

function writeExport(data, stage, budget, assetPrefix) {
  const partsDir = path.join(stage, 'parts');
  const assetsDir = path.join(stage, 'assets');
  fs.mkdirSync(partsDir);
  fs.mkdirSync(assetsDir);
  const names = writeImages(data.images, assetsDir);
  const minX = data.sections.reduce((min, s) => Math.min(min, s.x), Infinity);
  const minY = data.sections.reduce((min, s) => Math.min(min, s.y), Infinity);
  const sections = data.sections.map((s, i) => {
    const layers = elements(resolveImages(s.html, names, assetPrefix, s.id));
    if (layers.length !== s.total) {
      throw new Error('board ' + s.id + ': HTML has ' + layers.length + ' top-level elements, export says ' + s.total);
    }
    const parts = [];
    const slug = s.id.replace(/[^\p{L}\p{N}_-]/gu, '-').toLowerCase();
    for (const part of partsFor(layers, budget)) {
      const file = [String(i).padStart(2, '0'), slug, String(parts.length).padStart(2, '0')].join('-') + '.html';
      fs.writeFileSync(path.join(partsDir, file), part.html);
      parts.push({ file, elements: part.elements, chars: part.chars, over_budget: part.chars > budget });
    }
    return {
      id: s.id, name: s.name, left: offset(s.x, minX), top: offset(s.y, minY),
      width: s.w ?? null, height: s.h ?? null, fill: s.fill ?? null, border: s.stroke || null, radius: s.r ?? null, parts,
    };
  });
  const plan = { budget, asset_prefix: assetPrefix, sections };
  fs.writeFileSync(path.join(stage, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
  return plan;
}

function paperAssetUrl(assets) {
  const url = pathToFileURL(assets);
  // Encode each component as before, retaining the drive separator on Windows.
  const parts = url.pathname.split('/').map((part, index) => {
    if (process.platform === 'win32' && index === 1 && /^[A-Z]:$/i.test(part)) return part;
    return encodeURIComponent(decodeURIComponent(part)).replace(/[!'()*]/g,
      char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
  });
  return 'paper-asset://' + url.host + parts.join('/');
}

function splitExport(input, destination, budget, prefix) {
  if (!Number.isSafeInteger(budget) || budget <= 0) throw new Error('budget must be a positive integer');
  const data = readJson(input);
  if (!isObject(data) || !Array.isArray(data.sections) || !isObject(data.images)) {
    throw new Error('expected a board export with sections and images; use figjam-export.json');
  }
  data.sections.forEach(validateBoard);
  const out = path.resolve(destination);
  const existing = fs.lstatSync(out, { throwIfNoEntry: false });
  if (existing && (!existing.isDirectory() || fs.readdirSync(out).length)) {
    throw new Error('output path ' + out + ' is not empty or is not a directory; choose a new one');
  }
  const parent = path.dirname(out);
  fs.mkdirSync(parent, { recursive: true });
  const assets = path.join(fs.realpathSync(parent), path.basename(out), 'assets');
  const assetPrefix = prefix || paperAssetUrl(assets);
  const stage = fs.mkdtempSync(path.join(parent, '.board-export-'));
  let removedEmptyOutput = false;
  try {
    const plan = writeExport(data, stage, budget, assetPrefix);
    if (process.platform === 'win32' && existing) {
      // Windows cannot rename a directory over an empty one. Never remove its contents.
      fs.rmdirSync(out);
      removedEmptyOutput = true;
    }
    fs.renameSync(stage, out);
    return plan;
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true });
    if (removedEmptyOutput && !fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
    throw error;
  }
}

function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    budget: { type: 'string' }, 'asset-prefix': { type: 'string' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) return console.log(usage);
  if (positionals.length !== 2) throw new Error(usage);
  const [input, out] = positionals;
  const settings = readJson(path.join(__dirname, 'settings.json'));
  if (!Number.isSafeInteger(settings?.partBudget) || settings.partBudget <= 0) {
    throw new Error('expected a positive partBudget in tools/settings.json');
  }
  if (values.budget !== undefined && !/^\+?\d+$/.test(values.budget)) throw new Error('budget must be a positive integer');
  const budget = values.budget === undefined ? settings.partBudget : Number(values.budget);
  const plan = splitExport(input, out, budget, values['asset-prefix']);
  let totalParts = 0;
  for (const board of plan.sections) {
    totalParts += board.parts.length;
    const count = board.parts.reduce((sum, part) => sum + part.elements, 0);
    console.log(board.name + ': ' + board.parts.length + ' part(s), ' + count + ' items');
    for (const p of board.parts) {
      if (p.over_budget) console.log('  warning: ' + p.file + ' is ' + p.chars + ' characters, over the budget (one large item)');
    }
  }
  console.log('Wrote ' + totalParts + ' parts and the plan to ' + out);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error('error: ' + error.message);
    process.exitCode = 1;
  }
}
