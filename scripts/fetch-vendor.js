import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const vendorDir = join(__dirname, "..", "public", "vendor");
mkdirSync(vendorDir, { recursive: true });

const XTERM_VERSION = "5.5.0";

const files = {
  "xterm.min.js": `https://cdn.jsdelivr.net/npm/@xterm/xterm@${XTERM_VERSION}/lib/xterm.min.js`,
  "xterm.min.css": `https://cdn.jsdelivr.net/npm/@xterm/xterm@${XTERM_VERSION}/css/xterm.min.css`,
  "xterm-addon-fit.js": `https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.11.0/lib/addon-fit.js`,
};

async function fetchFile(name, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const body = await res.arrayBuffer();
  writeFileSync(join(vendorDir, name), Buffer.from(body));
  console.log(`ok  ${name} (${Buffer.from(body).length} bytes)`);
}

for (const [name, url] of Object.entries(files)) {
  await fetchFile(name, url);
}

console.log("vendor atualizado.");
