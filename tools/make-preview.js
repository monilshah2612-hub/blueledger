// Builds a single-file preview (preview.html) of the app that opens in any browser.
// Usage: node tools/make-preview.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'www');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, p) => '<style>' + fs.readFileSync(path.join(root, p), 'utf8') + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => '<script>' + fs.readFileSync(path.join(root, p), 'utf8') + '</script>');
const out = path.join(__dirname, '..', 'preview.html');
fs.writeFileSync(out, html);
console.log('Wrote ' + out + ' (' + Math.round(html.length / 1024) + ' KB)');
