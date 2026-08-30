import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const app = "dist/mac-arm64/terminal-manager.app";
if (!existsSync(app)) {
  console.log("app não encontrado em dist/mac-arm64 — pulando assinatura.");
  process.exit(0);
}
console.log("Assinando app ad-hoc…");
execSync(`codesign --force --deep --sign - "${app}"`, { stdio: "inherit" });
console.log("App assinado ad-hoc.");
