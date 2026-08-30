import { chmodSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prebuilds = join(__dirname, "..", "node_modules", "node-pty", "prebuilds");

if (existsSync(prebuilds)) {
  for (const arch of readdirSync(prebuilds)) {
    const dir = join(prebuilds, arch);
    if (!existsSync(dir)) continue;
    for (const bin of ["spawn-helper", "pty.node", "conpty.node"]) {
      const p = join(dir, bin);
      if (existsSync(p)) {
        chmodSync(p, 0o755);
        console.log(`chmod +x ${p}`);
      }
    }
  }
}
