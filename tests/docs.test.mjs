import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VERSION} from '../packages/core/version.mjs';

const HTML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../documents/html');
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
// Site pages only: the sample reports under samples/ are produced by the product and tested elsewhere.
const pages = walk(HTML).filter(f => f.endsWith('.html') && !/samples[\\/](audit|reports)[\\/]/.test(f));

test('docs site has the expected pages', () => {
  assert.ok(pages.length >= 17, `only ${pages.length} pages`);
  for (const f of ['index.html', '14-real-world-scenarios.html', '15-how-it-works.html', 'samples/index.html', 'sitemap.xml', 'robots.txt', 'assets/site.css']) assert.ok(fs.existsSync(path.join(HTML, f)), f);
});

test('every page: light by default, theme toggle, responsive, current version, nothing unresolved', () => {
  for (const f of pages) {
    const h = fs.readFileSync(f, 'utf8'), name = path.relative(HTML, f);
    assert.match(h, /<html lang="en" data-theme="light">/, name);
    assert.match(h, /id="theme-btn"/, name);
    assert.match(h, /name="viewport"/, name);
    assert.ok(h.includes(`v${VERSION}`), `${name} is stale: rebuild with npm run docs`);
    assert.ok(!/\{\{[A-Z]+\}\}|@@\w+|NaN GB|NaN ms/.test(h), `unresolved content in ${name}`);
  }
});

test('every internal link and anchor resolves', () => {
  const broken = [];
  for (const f of pages) {
    for (const [, href] of fs.readFileSync(f, 'utf8').matchAll(/<a [^>]*href="([^"]+)"/g)) {
      if (/^(https?:|mailto:|data:)/.test(href)) continue;
      const [file, hash] = href.split('#');
      const target = file ? path.resolve(path.dirname(f), file) : f;
      if (!fs.existsSync(target)) broken.push(`${path.basename(f)} -> ${href}`);
      else if (hash && target.endsWith('.html') && !fs.readFileSync(target, 'utf8').includes(`id="${hash}"`)) broken.push(`${path.basename(f)} -> #${hash}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('scenario page shows real output and states that no real model was run', () => {
  const h = fs.readFileSync(path.join(HTML, '14-real-world-scenarios.html'), 'utf8');
  assert.match(h, /Nothing on this page ran a real language model/);
  assert.match(h, /verified: false/);
  assert.match(h, /Non-loopback runtime endpoint blocked|Only http loopback is allowed/);
  assert.match(h, /prompt\/output text in report: none/);
});
