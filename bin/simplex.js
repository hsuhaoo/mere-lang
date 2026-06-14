#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ModuleLoader } = require('../dist/module-loader.js');

function printHelp() {
  console.log(`Simplex Language Interpreter v1.0.0

Usage:
  simplex <file.sim> [args...]    Run a Simplex file
  simplex build <file.sim>        Build self-contained HTML for browser
  simplex --help                  Show this help
  simplex --version               Show version

Build options:
  -o, --output <file>     Output HTML file path (default: <name>.html)
  --width <px>            Canvas width (default: 800)
  --height <px>           Canvas height (default: 600)
  --title <text>          Page title (default: "Simplex")
  --background <color>    Page background color (default: "#1a1a2e")`);
}

function build(args) {
  const simFile = args[0];
  if (!simFile) {
    console.error('Error: No input .sim file specified');
    process.exit(1);
  }

  const source = fs.readFileSync(simFile, 'utf-8');
  const baseName = path.basename(simFile, path.extname(simFile));
  const simDir = path.dirname(path.resolve(simFile));

  const opts = {
    output: path.join(simDir, baseName + '.html'),
    width: 800,
    height: 600,
    title: 'Simplex',
    background: '#1a1a2e',
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '-o':
      case '--output':
        opts.output = args[++i];
        break;
      case '--width':
        opts.width = parseInt(args[++i], 10);
        break;
      case '--height':
        opts.height = parseInt(args[++i], 10);
        break;
      case '--title':
        opts.title = args[++i];
        break;
      case '--background':
        opts.background = args[++i];
        break;
    }
  }

  const hasCanvas = /canvas_/.test(source);
  const runtimePath = path.join(__dirname, '..', 'dist', 'simplex.browser.js');

  if (!fs.existsSync(runtimePath)) {
    console.error('Error: Runtime bundle not found at dist/simplex.browser.js');
    console.error('Run "npm run build:browser" first, or use "npx simplex build" from project root');
    process.exit(1);
  }

  const runtime = fs.readFileSync(runtimePath, 'utf-8');
  const escaped = source
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<style>
  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: ${opts.background}; }
  ${hasCanvas ? 'canvas { border: 1px solid #333; }' : ''}
  .error { color: #ff4444; font-family: monospace; white-space: pre; padding: 20px; }
</style>
</head>
<body>
${hasCanvas ? `<canvas id="canvas" width="${opts.width}" height="${opts.height}"></canvas>` : '<div id="output"></div>'}
<script>${runtime}
const { runBrowser } = simplex;
const source = \`${escaped}\`;
try {
  ${hasCanvas
    ? `const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  runBrowser(source, { target: 'browser', canvas: ctx, canvasWidth: ${opts.width}, canvasHeight: ${opts.height} });`
    : `const result = runBrowser(source, { target: 'browser', canvas: null });
  document.getElementById('output').textContent = String(result);`
  }
} catch (e) {
  console.error('Simplex error:', e);
  const el = ${hasCanvas ? "document.getElementById('canvas')" : "document.getElementById('output')"};
  el.after(Object.assign(document.createElement('div'), { className: 'error', textContent: 'Error: ' + e.message }));
}
</script>
</body>
</html>`;

  fs.writeFileSync(opts.output, html, 'utf-8');
  console.log(`Built: ${opts.output}`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('Simplex v1.0.0');
    process.exit(0);
  }

  if (args[0] === 'build') {
    build(args.slice(1));
    return;
  }

  // Run a .sim file
  const filePath = args[0];
  const extraArgs = args.slice(1);
  const baseDir = path.dirname(path.resolve(filePath)) || process.cwd();

  try {
    const loader = new ModuleLoader(baseDir);
    loader.runMain(filePath, extraArgs);
  } catch (e) {
    if (e.line !== undefined && e.column !== undefined) {
      console.error(`${e.name}: ${e.message}`);
    } else {
      console.error(`${e.name || 'Error'}: ${e.message}`);
    }
    process.exit(1);
  }
}

main();
