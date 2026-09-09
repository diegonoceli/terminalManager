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

/**
 * Executa comandos da CLI do TerminalManager invocados por agentes ou scripts.
 * - terminalmanager note read <note_id|name> [--chain] (FR-023)
 * - terminalmanager send <receiver_id|title> "<prompt>" (FR-031)
 * - terminalmanager device tree <device_id> (FR-044)
 */
export async function executeTerminalManagerCli(args = [], { manager, deviceManager } = {}) {
  const [cmd, subcmd, ...rest] = args;
  if (!cmd) {
    return { ok: false, error: "Uso: terminalmanager <note|send|portal|device> [opções]" };
  }

  if (cmd === "note" && subcmd === "read") {
    const chain = rest.includes("--chain");
    const target = rest.find((a) => a !== "--chain");
    if (!target) return { ok: false, error: "Especifique o ID ou nome da nota: terminalmanager note read <id|nome> [--chain]" };
    if (!manager) return { ok: false, error: "Terminal manager indisponível." };
    const content = manager.noteRead(target, { chain });
    return { ok: true, output: content };
  }

  if (cmd === "send") {
    const to = subcmd;
    const prompt = rest.join(" ").replace(/^["']|["']$/g, "");
    if (!to || !prompt) return { ok: false, error: "Uso: terminalmanager send <id_ou_titulo> \"<mensagem>\"" };
    if (!manager) return { ok: false, error: "Terminal manager indisponível." };
    const res = manager.sendAgentMessage(null, to, prompt);
    return { ok: res.ok, output: res.ok ? `Mensagem despachada para ${to}` : res.error };
  }

  if (cmd === "portal") {
    const portalId = rest[0];
    const actionArgs = rest.slice(1);
    if (!subcmd || !portalId) {
      return { ok: false, error: "Uso: terminalmanager portal <click|type|navigate|eval|dom|screenshot|scroll> <portal_id> [args...]" };
    }
    if (!manager) return { ok: false, error: "Terminal manager indisponível." };
    const res = await manager.portalAction(portalId, subcmd, actionArgs);
    return { ok: res.ok, output: res.output || res.error };
  }

  if (cmd === "device" && subcmd === "tree") {
    const devId = rest[0];
    if (!devId) return { ok: false, error: "Uso: terminalmanager device tree <device_id>" };
    if (!deviceManager) return { ok: false, error: "Device manager indisponível." };
    const tree = await deviceManager.dumpAccessibilityTree(devId);
    return { ok: true, output: JSON.stringify(tree, null, 2) };
  }

  if (cmd === "device" && subcmd === "action") {
    const devId = rest[0];
    const action = rest[1];
    const param = rest.slice(2).join(" ");
    if (!devId || !action) return { ok: false, error: "Uso: terminalmanager device action <device_id> <tap|type|key> [params]" };
    if (!deviceManager) return { ok: false, error: "Device manager indisponível." };
    const isIOS = devId.includes("-") && devId.length > 20;
    const platform = isIOS ? "ios" : "android";
    const params = action === "key" ? { key: param } : (action === "type" ? { text: param } : {});
    const res = await deviceManager.performAction(devId, platform, action, params);
    return { ok: res.ok, output: res.ok ? `Ação ${action} executada no dispositivo ${devId}` : res.error };
  }

  return { ok: false, error: `Comando desconhecido: terminalmanager ${cmd}` };
}

export const executeMaestriCli = executeTerminalManagerCli;

