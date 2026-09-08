import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const vendorDir = join(__dirname, "..", "public", "vendor");
mkdirSync(vendorDir, { recursive: true });

const XTERM_VERSION = "5.5.0";
const CODEMIRROR_VERSION = "5.65.16";
const MARKED_VERSION = "12.0.2";

const files = {
  "xterm.min.js": `https://cdn.jsdelivr.net/npm/@xterm/xterm@${XTERM_VERSION}/lib/xterm.min.js`,
  "xterm.min.css": `https://cdn.jsdelivr.net/npm/@xterm/xterm@${XTERM_VERSION}/css/xterm.min.css`,
  "xterm-addon-fit.js": `https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.11.0/lib/addon-fit.js`,

  // CodeMirror 5 (editor embutido — FR-031)
  "codemirror.min.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/lib/codemirror.min.js`,
  "codemirror.min.css": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/lib/codemirror.min.css`,
  "codemirror/closebrackets.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/addon/edit/closebrackets.min.js`,
  "codemirror/matchbrackets.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/addon/edit/matchbrackets.min.js`,
  "codemirror/search.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/addon/search/search.min.js`,
  "codemirror/searchcursor.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/addon/search/searchcursor.min.js`,
  "codemirror/dialog.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/addon/dialog/dialog.min.js`,
  "codemirror/dialog.css": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/addon/dialog/dialog.min.css`,
  "codemirror/mode/javascript.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/javascript/javascript.min.js`,
  "codemirror/mode/xml.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/xml/xml.min.js`,
  "codemirror/mode/css.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/css/css.min.js`,
  "codemirror/mode/htmlmixed.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/htmlmixed/htmlmixed.min.js`,
  "codemirror/mode/markdown.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/markdown/markdown.min.js`,
  "codemirror/mode/clike.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/clike/clike.min.js`,
  "codemirror/mode/python.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/python/python.min.js`,
  "codemirror/mode/shell.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/shell/shell.min.js`,
  "codemirror/mode/json.js": `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/mode/javascript/javascript.min.js`,

  // marked (render Markdown de notas — FR-020)
  "marked.min.js": `https://cdn.jsdelivr.net/npm/marked@${MARKED_VERSION}/marked.min.js`,
};

async function fetchFile(name, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const body = await res.arrayBuffer();
  const dest = join(vendorDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(body));
  console.log(`ok  ${name} (${Buffer.from(body).length} bytes)`);
}

for (const [name, url] of Object.entries(files)) {
  await fetchFile(name, url);
}

console.log("vendor atualizado.");
