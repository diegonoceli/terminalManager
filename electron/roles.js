// electron/roles.js
// Responsabilidades (Configurações → Agentes), role.json sidecar (US3) e
// leitura/escrita/sincronização dos arquivos de instrução CLAUDE.md / AGENTS.md (US1, FR-010).

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync } from "node:fs";
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
  mkdirSync(workingDir, { recursive: true });
  if (typeof claudeMd === "string" && claudeMd.length > 0) {
    atomicWrite(join(workingDir, CLAUDE_FILE), claudeMd);
  }
  if (typeof agentsMd === "string" && agentsMd.length > 0) {
    atomicWrite(join(workingDir, AGENTS_FILE), agentsMd);
  }
}

/**
 * Sincroniza CLAUDE.md ⇄ AGENTS.md.
 *
 * Duas assinaturas:
 *   syncBoth(workingDir, content)  — grava `content` em ambos os arquivos.
 *   syncBoth(workingDir)           — lê CLAUDE.md existente e espelha para AGENTS.md
 *                                    (ou vice-versa se só AGENTS.md existir).
 *
 * Retorna `{ claudeMdUpdated, agentsMdUpdated }`.
 */
export function syncBoth(workingDir, content) {
  if (!workingDir) return { claudeMdUpdated: false, agentsMdUpdated: false };

  const claudePath = join(workingDir, CLAUDE_FILE);
  const agentsPath = join(workingDir, AGENTS_FILE);

  // Se content não foi fornecido, tentamos ler de um dos arquivos existentes
  if (typeof content !== "string") {
    if (existsSync(claudePath)) {
      try { content = readFileSync(claudePath, "utf8"); } catch { content = ""; }
    } else if (existsSync(agentsPath)) {
      try { content = readFileSync(agentsPath, "utf8"); } catch { content = ""; }
    } else {
      return { claudeMdUpdated: false, agentsMdUpdated: false };
    }
  }

  if (!content) return { claudeMdUpdated: false, agentsMdUpdated: false };

  try { mkdirSync(dirname(claudePath), { recursive: true }); } catch {}

  let claudeMdUpdated = false;
  let agentsMdUpdated = false;

  try {
    atomicWrite(claudePath, content);
    claudeMdUpdated = true;
  } catch {}

  try {
    atomicWrite(agentsPath, content);
    agentsMdUpdated = true;
  } catch {}

  return { claudeMdUpdated, agentsMdUpdated };
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

/** Lê role.json sidecar do diretório do projeto, se existir.
 *
 * Aceita dois formatos:
 *   { version, roles: [...] }   — formato canônico com array de roles
 *   { role, description, ... }  — formato plano escrito diretamente por writeRolesSidecar
 *
 * Retorna o objeto parseado ou null se o arquivo não existir ou for inválido.
 */
export function readRolesSidecar(workingDir) {
  if (!workingDir) return null;
  const file = join(workingDir, ".maestri", ROLE_FILE);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    // Formato canônico: { version, roles: [...] }
    if (Array.isArray(parsed.roles)) return parsed;
    // Formato plano escrito com um objeto: { version, roles: { role, description, ... } }
    // → normalizar espalhando os campos de roles no topo
    if (parsed.roles && typeof parsed.roles === "object") {
      return { ...parsed, ...parsed.roles };
    }
    // Formato completamente plano: { role, description, ... }
    if (typeof parsed.role === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Varre recursivamente o diretório atrás de arquivos role.json para importação — US3 / FR-018 */
export function discoverRoles(workingDir) {
  const discovered = [];
  if (!workingDir || !existsSync(workingDir)) return discovered;

  const visited = new Set();
  function walk(dir, depth = 0) {
    if (depth > 4) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name === "node_modules" || ent.name === ".git") continue;
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
          walk(full, depth + 1);
        } else if (ent.isFile() && ent.name === ROLE_FILE) {
          try {
            const data = JSON.parse(readFileSync(full, "utf8"));
            // Suporta 3 formatos:
            //   { roles: [...] }                — array canônico
            //   { role, name, ... }             — objeto plano
            //   { version, roles: { role, ... }} — objeto plano encapsulado em roles
            let list;
            if (Array.isArray(data.roles)) {
              list = data.roles;
            } else if (data.role || data.name) {
              list = [data];
            } else if (data.roles && typeof data.roles === "object") {
              // roles é um objeto plano → normalizar
              list = [{ ...data.roles }];
            } else {
              list = [];
            }
            for (const r of list) {
              const key = r && (r.role || r.name);
              if (key && !visited.has(key)) {
                visited.add(key);
                discovered.push({ ...r, sourcePath: full, isDiscovered: true });
              }
            }
          } catch {}
        }
      }
    } catch {}
  }
  walk(workingDir);
  return discovered;
}

