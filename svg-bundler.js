#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getFiles(root) {
  const stat = fs.statSync(root);
  if (stat.isDirectory()) {
    return fs.readdirSync(root)
      .map(fn => getFiles(path.join(root, fn)))
      .reduce((pv, acc) => [...acc, ...pv], [])
  }

  if (path.extname(root) === '.svg') return [root];
  return [];
}

function generateExports() {

  const cmd = path.basename(process.argv[1]);
  const args = process.argv.slice(2);

  let output = process.stdout;
  if (process.argv[4]) {
    output = fs.createWriteStream(process.argv[3]);
  }

  const files = getFiles(process.argv[2]);

  output.write('/*\n *\n');
  output.write(` * This file was generated with '${cmd}'\n`);
  output.write(` * DO NOT EDIT MANUALLY, run command below to regenerate:\n *\n`)
  output.write(` * \t${cmd} ${args.join(' ')}\n`);
  output.write(' *\n */\n\n');

  output.write(`export const resources = new Map<string, string>([\n`);

  files.forEach(fn => {
    const relativePath = path.relative(process.argv[3], fn);
    const name = path.relative(process.argv[2], fn).slice(0, -4);
    output.write(`  ['${name}', require('!!raw-loader!${relativePath}')],\n`);
  });

  output.write(`]);\n`);
}

function usage() {
  console.log(`Usage: ${path.basename(process.argv[1])} <input_directory> <output>`);
  console.log(`\nparam input_directory:\n\tpath to the folder in which the svg assets reside`);
  console.log(`\nparam basepath:\n\tpath to folder relative to which the import paths should be;`);
  console.log(`\tfor instance, if we load images from 'src/assets/images' but the system import`);
  console.log(`\tpath is src, 'basepath' should be set to src so that the generated imports will`);
  console.log(`\tlook like: !!raw-loader!/assets/... instead of !!raw-loader!/src/assets/...`);
  console.log(`\nparam output:\n\tpath to the file in which the output should be; defaults to stdout\n`);
}

// usage();
generateExports();

// console.log(process.argv);
// console.log(generateExports(process.argv[2], process.argv[3]));

