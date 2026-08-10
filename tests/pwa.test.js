/**
 * Tests for the PWA surface — manifest validity, SW shell completeness,
 * and the assets the browser/installer depends on.
 *
 * These are static-file checks (no server needed): a broken manifest or a
 * missing shell asset silently kills installability / offline, so we pin
 * them here.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const manifest = JSON.parse(read('pwa/manifest.json'));
const swSource = read('pwa/sw.js');
const html = read('pwa/index.html');

/** Map a SW-shell URL path like /app/main.js to a repo-relative file path. */
function shellPathToFile(urlPath) {
  const segments = urlPath.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  const [top, ...rest] = segments;
  const dir = { app: 'pwa', shared: 'shared' }[top];
  if (!dir) return null;
  return join(dir, ...rest) || null;
}

describe('web app manifest', () => {
  it('has every field Chrome requires for installability', () => {
    for (const key of ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons']) {
      assert.ok(manifest[key] !== undefined && manifest[key] !== '', `missing ${key}`);
    }
    assert.equal(manifest.start_url, '/app/');
    assert.equal(manifest.scope, '/app/');
    assert.ok(['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay'].includes(manifest.display));
  });

  it('has an explicit stable id', () => {
    assert.equal(manifest.id, '/app/');
  });

  it('does not prefer related applications', () => {
    assert.ok(!manifest.prefer_related_applications);
  });

  it('includes 192px and 512px icons for any + maskable purposes', () => {
    const combos = new Set(
      manifest.icons.map((i) => `${i.sizes} ${i.purpose}`),
    );
    assert.ok(combos.has('192x192 any'), 'missing 192x192 any');
    assert.ok(combos.has('512x512 any'), 'missing 512x512 any');
    assert.ok(combos.has('192x192 maskable'), 'missing 192x192 maskable');
    assert.ok(combos.has('512x512 maskable'), 'missing 512x512 maskable');
  });

  it('references icon files that exist on disk', () => {
    for (const icon of manifest.icons) {
      const file = shellPathToFile(icon.src);
      assert.ok(file && existsSync(join(ROOT, file)), `icon not found: ${icon.src}`);
    }
  });

  it('declares screenshots that exist and meet Chrome\'s limits', () => {
    assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 2);
    for (const shot of manifest.screenshots) {
      const file = shellPathToFile(shot.src);
      assert.ok(file && existsSync(join(ROOT, file)), `screenshot not found: ${shot.src}`);
      assert.match(shot.sizes, /^\d+x\d+$/);
      const [w, h] = shot.sizes.split('x').map(Number);
      // Chrome: 320-3840px per side, max dimension <= 2.3x min dimension
      assert.ok(w >= 320 && w <= 3840 && h >= 320 && h <= 3840, `size out of range: ${shot.sizes}`);
      assert.ok(Math.max(w, h) <= 2.3 * Math.min(w, h), `aspect ratio too extreme: ${shot.sizes}`);
      assert.ok(['narrow', 'wide', undefined].includes(shot.form_factor));
    }
  });
});

describe('service worker shell', () => {
  it('lists only real files in the precache list', () => {
    const match = swSource.match(/const SHELL = \[([\s\S]*?)\];/);
    assert.ok(match, 'could not find SHELL array in sw.js');
    const paths = [...match[1].matchAll(/["'](\/app\/[^"']+|"\/shared\/[^"']+|[^"']*\/app[^"']*)["']/g)].map((m) => m[1]);
    assert.ok(paths.length >= 8, 'SHELL list looks too small');
    for (const path of paths) {
      if (path.startsWith('/app') || path.startsWith('/shared')) {
        const file = shellPathToFile(path) || (path === '/app' && 'pwa/index.html');
        assert.ok(file && existsSync(join(ROOT, file)), `shell asset missing: ${path}`);
      }
    }
  });

  it('keeps font cache alongside shell and data caches on activate', () => {
    assert.ok(swSource.includes('k !== FONT_CACHE'), 'FONT_CACHE would be wiped on activate');
  });
});

describe('PWA entry page', () => {
  it('links the manifest and registers the service worker', () => {
    assert.match(html, /rel="manifest" href="\/app\/manifest\.json"/);
    assert.match(html, /navigator\.serviceWorker\.register\("\/app\/sw\.js"/);
  });

  it('has iOS install metadata and touch icon', () => {
    assert.match(html, /apple-mobile-web-app-capable/);
    assert.match(html, /apple-touch-icon/);
    assert.ok(existsSync(join(ROOT, 'pwa/icons/apple-touch-icon.png')));
  });
});
