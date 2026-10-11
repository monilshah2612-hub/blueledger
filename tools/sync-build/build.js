const esbuild = require('esbuild');
const path = require('path');
esbuild.build({
  entryPoints: [path.join(__dirname, 'entry.js')],
  bundle: true, minify: true, format: 'iife', target: ['chrome80'],
  outfile: path.join(__dirname, '..', '..', 'www', 'js', 'firebase.bundle.js'),
  legalComments: 'none'
}).then(() => console.log('built www/js/firebase.bundle.js')).catch(() => process.exit(1));
