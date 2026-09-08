// electron/roles.js
// Responsabilidades (Configurações → Agentes), role.json sidecar (US3) e
// leitura/escrita/sincronização dos arquivos de instrução CLAUDE.md / AGENTS.md (US1, FR-010).

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

export const CLAUDE_FILE = "CLAUDE.md";
export const AGENTS_FILE = "AGENTS.md";

/** Lê os arquivos de instrução do diretório (se existirem). */
export function readInstructions(workingDir) {
  const out = {};
  if (!workingDir) return out;
  const claude = join(workingDir, CLAUDE_FILE);
  const agents = join(workingDir, AGENTS_FILE);
  if (existsSync(claude)) {
    try {
      out.claudeMd = readFileSync(claude, "utf8");
    } catch {}
  }
  if (existsSync(agents)) {
    try {
      out.agentsMd = readFileSync(agents, "utf8");
    } catch {}
  }
  return out;
}

/** Grava arquivos de instrução de forma atômica. Escreve apenas quando conteúdo é string não vazia. */
export function writeInstructions(workingDir, { claudeMd, agentsMd } = {}) {
  if (!workingDir || (!claudeMd && !agentsMd)) return;
  mkdirSync(dirname(workingDir), { recursive: true });
  if (typeof claudeMd === "string" && claudeMd.length > 0) {
    atomicWrite(join(workingDir, CLAUDE_FILE), claudeMd);
  }
  if (typeof agentsMd === "string" && agentsMd.length > 0) {
    atomicWrite(join(workingDir, AGENTS_FILE), agentsMd);
  }
}

/** Sincroniza CLAUDE.md ⇄ AGENTS.md (espelho do conteúdo quando syncBetween). */
export function syncBoth(workingDir, content) {
  if (!workingDir || typeof content !== "string") return;
  mkdirSync(dirname(workingDir), { recursive: true });
  atomicWrite(join(workingDir, CLAUDE_FILE), content);
  atomicWrite(join(workingDir, AGENTS_FILE), content);
}

function atomicWrite(filePath, content) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, filePath);
  } catch {
    // Fallback: escrita direta + limpeza do tmp
    writeFileSync(filePath, content, "utf8");
    try {
      renameSync(tmp, filePath);
    } catch {}
  }
}

export const ROLE_FILE = "role.json";

/** Grava role.json (sidecar) no diretório do projeto — FR-016. */
export function writeRolesSidecar(workingDir, roles, workspaceId) {
  if (!workingDir || !roles) return;
  const dir = join(workingDir, ".maestri");
  mkdirSync(dir, { recursive: true });
  atomicWrite(
    join(dir, ROLE_FILE),
    JSON.stringify(
      {
        version: 1,
        workspaceId,
        updatedAt: new Date().toISOString(),
        roles,
      },
      null,
      2
    )
  );
}

/** Lê role.json sidecar do diretório do projeto, se existir. */
export function readRolesSidecar(workingDir) {
  if (!workingDir) return null;
  const file = join(workingDir, ".maestri", ROLE_FILE);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(parsed.roles) ? parsed : null;
  } catch {
    return null;
  }
}
