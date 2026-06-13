#!/usr/bin/env node
/**
 * CLI entry point for the Simplex language interpreter.
 * 
 * Usage:
 *   simplex <file.sim> [args...]
 *   simplex --help
 *   simplex --version
 */

const { ModuleLoader } = require('../src/module-loader');
const path = require('path');

function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Simplex Language Interpreter v1.0.0

Usage:
  simplex <file.sim> [args...]
  simplex --help
  simplex --version

Examples:
  simplex hello.sim
  simplex math.sim 5 10
  simplex --help`);
    process.exit(0);
  }

  // Version
  if (args.includes('--version') || args.includes('-v')) {
    console.log('Simplex v1.0.0');
    process.exit(0);
  }

  // No file specified
  if (args.length === 0) {
    console.error('Error: No input file specified');
    console.error('Usage: simplex <file.sim> [args...]');
    process.exit(1);
  }

  const filePath = args[0];
  const extraArgs = args.slice(1);
  const baseDir = process.cwd();

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
