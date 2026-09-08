// electron/agent-cli.js
// Detecção/spawn/resume de agentes CLI (claude/codex/opencode) e preparo de sessão. US3.

import { spawnSync } from "node:child_process";

export const AGENT_BINS = {
  claude: "claude",
  codex: "codex",
  opencode: "opencode",
};

function which(bin) {
  const cmd = process.platform === "win32" ? "where" : "which";
  try {
    const r = spawnSync(cmd, [bin], { encoding: "utf8" });
    if (r.status === 0 && r.stdout && r.stdout.trim()) {
      return r.stdout.trim().split(/\r?\n/)[0];
    }
  } catch {}
  return null;
}

/** Detecta agentes CLI disponíveis no PATH (FR-011). */
export function detectAgents() {
  const list = [];
  for (const [kind, bin] of Object.entries(AGENT_BINS)) {
    const path = which(bin);
    list.push({ kind, available: !!path, path });
  }
  return list;
}

/**
 * Resolve comando/args para iniciar (ou retomar) um agente.
 * Resume é por agente (FR-052): claude --resume, codex resume, opencode --session.
 */
export function agentCommand(kind, { sessionId } = {}) {
  const bin = AGENT_BINS[kind];
  if (!bin) return null;
  const path = which(bin);
  if (!path) return null;
  let args = [];
  if (sessionId) {
    if (kind === "claude") args = ["--resume", sessionId];
    else if (kind === "codex") args = ["resume", sessionId];
    else if (kind === "opencode") args = ["--session", sessionId];
  }
  return { cmd: path, args, kind };
}
