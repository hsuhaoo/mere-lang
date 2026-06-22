#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ModuleLoader } = require('../dist/module-loader.js');

function printHelp() {
  console.log(`Mere Language Interpreter v1.0.0

Usage:
  mere <file.sim> [args...]    Run a Mere file
  mere build <file.sim>        Build self-contained HTML for browser
  mere --help                  Show this help
  mere --version               Show version

Build options:
  -o, --output <file>     Output HTML file path (default: <name>.html)
  --width <px>            Canvas width (default: 800)
  --height <px>           Canvas height (default: 600)
  --title <text>          Page title (default: "Mere")
  --background <color>    Page background color (default: "#1a1a2e")`);
}

function build(args) {
  const simFile = args[0];
  if (!simFile) {
    console.error('Error: No input .sim file specified');
    process.exit(1);
  }

  const baseName = path.basename(simFile, path.extname(simFile));
  const simDir = path.dirname(path.resolve(simFile));

  const opts = {
    output: path.join(simDir, baseName + '.html'),
    width: 800,
    height: 600,
    title: 'Mere',
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

  const runtimePath = path.join(__dirname, '..', 'dist', 'mere.browser.js');

  if (!fs.existsSync(runtimePath)) {
    console.error('Error: Runtime bundle not found at dist/mere.browser.js');
    console.error('Run "npm run build" first to build the project');
    process.exit(1);
  }

  // Walk import tree and collect all module sources
  const absSimFile = path.resolve(simFile);
  const simBaseDir = path.dirname(absSimFile);
  let moduleSources = {};
  try {
    const loader = new ModuleLoader(simBaseDir);
    moduleSources = loader.collectSources(absSimFile);
  } catch (e) {
    console.warn('Warning: Could not resolve all module imports:', e.message);
    const source = fs.readFileSync(simFile, 'utf-8');
    moduleSources = { 'main.sim': source };
  }

  // Check if any module uses canvas API
  const hasCanvas = Object.values(moduleSources).some((s) => /canvas_/.test(s));

  const runtime = fs.readFileSync(runtimePath, 'utf-8');
  const sourcesJson = JSON.stringify(moduleSources);
  // The main file key is the absolute path used in collectSources
  const mainKey = absSimFile;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: ${opts.background}; }
  ${hasCanvas ? 'canvas { display: block; width: 100%; height: 100%; }' : ''}
  .error { color: #ff4444; font-family: monospace; white-space: pre; padding: 20px; }
</style>
</head>
<body>
${hasCanvas ? '<canvas id="canvas"></canvas>' : '<div id="output"></div>'}
<script>${runtime}
const { runBrowser } = mere;
const moduleSources = ${sourcesJson};
const mainKey = ${JSON.stringify(mainKey)};
try {
  ${hasCanvas
    ? `const canvas = document.getElementById('canvas');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  const ctx = canvas.getContext('2d');
  runBrowser(moduleSources[mainKey], {
    target: 'browser',
    canvas: ctx,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    sources: moduleSources,
    mainKey: mainKey,
  });`
    : `const result = runBrowser(moduleSources[mainKey], {
    target: 'browser',
    canvas: null,
    sources: moduleSources,
    mainKey: mainKey,
  });
  document.getElementById('output').textContent = String(result);`
  }
} catch (e) {
  console.error('Mere error:', e);
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
    console.log('Mere v1.0.0');
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
