#!/usr/bin/env node
/**
 * scripts/bundle-single.js
 * 
 * Standalone Single-File HTML Distribution Generator for Workout App.
 * Inlines www/style.css, www/app.js, and base64 app-icon.png into www/index.html.
 * Produces:
 *   - dist/index.html (distribution directory)
 *   - workout-single.html (project root fallback as per design.md)
 * 
 * Zero external dependencies — uses only Node.js standard library (fs, path).
 */

const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = (bytes / 1024).toFixed(1);
  return `${kb} KB (${bytes} bytes)`;
}

function bundleSingle() {
  const rootDir = path.resolve(__dirname, '..');
  const wwwDir = path.join(rootDir, 'www');
  const distDir = path.join(rootDir, 'dist');

  const indexHtmlPath = path.join(wwwDir, 'index.html');
  const styleCssPath = path.join(wwwDir, 'style.css');
  const appJsPath = path.join(wwwDir, 'app.js');
  const iconPngPath = path.join(rootDir, 'app-icon.png');

  const distHtmlPath = path.join(distDir, 'index.html');
  const rootSingleHtmlPath = path.join(rootDir, 'workout-single.html');

  console.log('[bundle-single] Starting single-file standalone bundling...');
  console.log(`[bundle-single] Workspace root: ${rootDir}`);

  // 1. Verify existence of all input assets
  const requiredFiles = [
    { name: 'HTML shell', path: indexHtmlPath },
    { name: 'Stylesheet', path: styleCssPath },
    { name: 'Application JS', path: appJsPath },
    { name: 'App icon PNG', path: iconPngPath }
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file.path)) {
      throw new Error(`Required asset missing: ${file.name} at "${file.path}"`);
    }
  }

  // 2. Read source assets
  const rawHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const rawCss = fs.readFileSync(styleCssPath, 'utf8');
  const rawJs = fs.readFileSync(appJsPath, 'utf8');
  const iconBuffer = fs.readFileSync(iconPngPath);

  console.log(`[bundle-single] Source assets loaded:`);
  console.log(`  - www/index.html:    ${formatBytes(Buffer.byteLength(rawHtml, 'utf8'))}`);
  console.log(`  - www/style.css:     ${formatBytes(Buffer.byteLength(rawCss, 'utf8'))}`);
  console.log(`  - www/app.js:        ${formatBytes(Buffer.byteLength(rawJs, 'utf8'))}`);
  console.log(`  - app-icon.png:      ${formatBytes(iconBuffer.length)}`);

  // 3. Prepare base64 favicon & touch-icon
  const iconBase64 = iconBuffer.toString('base64');
  const iconDataUrl = `data:image/png;base64,${iconBase64}`;
  const iconTags = [
    `  <link rel="icon" type="image/png" href="${iconDataUrl}">`,
    `  <link rel="apple-touch-icon" href="${iconDataUrl}">`
  ].join('\n');

  // 4. Transform HTML: Inlining Favicon
  let bundled = rawHtml;
  const existingIconRegex = /<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i;
  if (existingIconRegex.test(bundled)) {
    bundled = bundled.replace(existingIconRegex, iconTags);
  } else {
    bundled = bundled.replace('</head>', `${iconTags}\n</head>`);
  }

  // 5. Transform HTML: Inlining CSS
  // Robust regex matching <link ... href="style.css" ...> regardless of attribute order
  const linkCssRegex = /<link\b(?=[^>]*\bhref=["']style\.css["'])(?=[^>]*\brel=["']stylesheet["'])[^>]*>/i;
  const fallbackCssRegex = /<link\s+[^>]*href=["']style\.css["'][^>]*>/i;
  const targetCssRegex = linkCssRegex.test(bundled) ? linkCssRegex : fallbackCssRegex;

  if (!targetCssRegex.test(bundled)) {
    throw new Error('Could not find stylesheet link for "style.css" in www/index.html');
  }

  // Defensive escaping of any accidental closing </style> tags
  const safeCss = rawCss.replace(/<\/style/gi, '<\\/style');
  const inlineStyleBlock = `<style>\n/* Inlined from www/style.css */\n${safeCss}\n</style>`;
  bundled = bundled.replace(targetCssRegex, inlineStyleBlock);

  // 6. Transform HTML: Inlining JS
  // Robust regex matching <script ... src="app.js" ...></script>
  const scriptJsRegex = /<script\b(?=[^>]*\bsrc=["']app\.js["'])[^>]*>\s*<\/script>/i;
  const fallbackJsRegex = /<script\s+[^>]*src=["']app\.js["'][^>]*><\/script>/i;
  const targetJsRegex = scriptJsRegex.test(bundled) ? scriptJsRegex : fallbackJsRegex;

  if (!targetJsRegex.test(bundled)) {
    throw new Error('Could not find script tag for "app.js" in www/index.html');
  }

  // Defensive escaping of any accidental closing </script> tags in JS string literals
  const safeJs = rawJs.replace(/<\/script/gi, '<\\/script');
  const inlineScriptBlock = `<script>\n/* Inlined from www/app.js */\n${safeJs}\n</script>`;
  bundled = bundled.replace(targetJsRegex, inlineScriptBlock);

  // 7. Verification of self-contained invariant
  if (bundled.includes('href="style.css"') || bundled.includes("href='style.css'")) {
    throw new Error('Integrity check failed: External reference to style.css still present in bundle');
  }
  if (bundled.includes('src="app.js"') || bundled.includes("src='app.js'")) {
    throw new Error('Integrity check failed: External reference to app.js still present in bundle');
  }

  // Verify no unbundled external network dependencies
  const externalHttpRegex = /(?:href|src)=["']https?:\/\/[^"']+["']/i;
  if (externalHttpRegex.test(bundled)) {
    console.warn('[bundle-single] Warning: External HTTP(S) URL detected in bundled HTML!');
  }

  // 8. Ensure output directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log(`[bundle-single] Created directory: ${distDir}`);
  }

  // 9. Write output files (dist/index.html and root workout-single.html)
  fs.writeFileSync(distHtmlPath, bundled, 'utf8');
  fs.writeFileSync(rootSingleHtmlPath, bundled, 'utf8');

  const totalBytes = Buffer.byteLength(bundled, 'utf8');

  console.log(`[bundle-single] Successfully generated bundles:`);
  console.log(`  ✔ ${path.relative(rootDir, distHtmlPath)}: ${formatBytes(totalBytes)}`);
  console.log(`  ✔ ${path.relative(rootDir, rootSingleHtmlPath)}: ${formatBytes(totalBytes)}`);
  console.log('[bundle-single] Standalone bundle is ready for offline execution.');

  return {
    distHtmlPath,
    rootSingleHtmlPath,
    totalBytes
  };
}

// Execute when called directly from CLI
if (require.main === module) {
  try {
    bundleSingle();
    process.exit(0);
  } catch (err) {
    console.error(`[bundle-single] FATAL ERROR: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { bundleSingle };
