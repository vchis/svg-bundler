#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xmldom = require('xmldom');
const parser = new xmldom.DOMParser();
const serializer = new xmldom.XMLSerializer();

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

  if (process.argv.length < 3) {
    usage();
    return;
  }

  const cmd = path.basename(process.argv[1]);
  const args = process.argv.slice(2);

  let output = process.stdout;
  if (process.argv[3]) {
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
    const name = path.relative(process.argv[2], fn).slice(0, -4);
    // output.write(`  ['${name}', require('!!raw-loader!${relativePath}')],\n`);
    output.write(`  ['${name}', ${loadFile(fn)}],\n`);
  });

  output.write(`]);\n`);
}

function loadFile(path) {
  const content = fs.readFileSync(path, { encoding: 'utf8' });
  const xml = parser.parseFromString(content, 'image/svg+xml')
  const serialized = serializer.serializeToString(xml, false, (node) => {
    const ignoredNodeTypes = [
      8, // comments,
      7, // processing instructions
      10, // doctype
    ]
    if (ignoredNodeTypes.indexOf(node.nodeType) >= 0) return false;

    // remove whitespace
    if (node.nodeType === 3) {

      const value = String(node.nodeValue).trim();
      if (value === '') return false;
    }

    // filter title & description
    const nodeNameFilter = ['title', 'desc'];
    if (node.nodeType === 1 && nodeNameFilter.indexOf(node.tagName) >= 0) return false;
    return node;
  });

  if (serialized.indexOf('`') >= 0)
    return JSON.stringify(serialized);
  return ['`', serialized.replace(/[\r\n]+/, ' '),  '`'].join('');
}

function usage() {
  console.log(`Usage: ${path.basename(process.argv[1])} <input_directory> <output>`);
  console.log(`\nparam input_directory:\n\tpath to the folder in which the svg assets reside`);
  console.log(`\nparam output:\n\tpath to the file in which the output should be; defaults to stdout\n`);
}

generateExports();

