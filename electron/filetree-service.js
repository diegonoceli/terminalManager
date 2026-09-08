// electron/filetree-service.js
// Serviço de arquivos + Git para o nó Árvore de Arquivos (US5/US9).
// fs nativo + CLI git via child_process (sem dependência JS de git).

import {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
  rmSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { execFile, execFileSync } from "node:child_process";

function run(args, cwd) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err ? err.code ?? 1 : 0, out: String(stdout || ""), err: String(stderr || (err && err.message) || "") });
    });
  });
}

export function isRepo(cwd) {
  return existsSync(join(cwd, ".git")) || existsSync(cwd);
}

export function readDir(path) {
  if (!path || !existsSync(path)) return { ok: false, entries: [], error: "Diretório inexistente ou inacessível" };
  try {
    const entries = readdirSync(path, { withFileTypes: true })
      .map((d) => {
        const full = join(path, d.name);
        let size = 0;
        try {
          const st = statSync(full);
          size = st.size;
        } catch {}
        return {
          name: d.name,
          path: full,
          type: d.isDirectory() ? "dir" : "file",
          size,
        };
      })
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return { ok: true, entries, error: null };
  } catch (e) {
    return { ok: false, entries: [], error: e.message };
  }
}

export function fsCrud(action, { path, newName, toPath } = {}) {
  try {
    if (action === "create") {
      const target = join(path, newName || "novo-arquivo");
      if (!existsSync(target)) writeFileSync(target, "");
      return { ok: true };
    }
    if (action === "mkdir") {
      mkdirSync(join(path, newName || "nova-pasta"), { recursive: true });
      return { ok: true };
    }
    if (action === "rename") {
      renameSync(path, join(dirname(path), newName));
      return { ok: true };
    }
    if (action === "move") {
      mkdirSync(dirname(toPath), { recursive: true });
      renameSync(path, toPath);
      return { ok: true };
    }
    if (action === "delete") {
      const st = statSync(path);
      if (st.isDirectory()) rmSync(path, { recursive: true, force: true });
      else unlinkSync(path);
      return { ok: true };
    }
    return { ok: false, error: `Ação desconhecida: ${action}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function gitOps(cwd, action, { branch, message, stash } = {}) {
  if (!cwd || !existsSync(cwd)) return { ok: false, error: "Diretório inválido" };
  switch (action) {
    case "branch_show":
      return run(["branch", "--show-current"], cwd);
    case "status": {
      const r = await run(["status", "--short", "--branch"], cwd);
      return r;
    }
    case "commit": {
      if (!message) return { ok: false, error: "Mensagem de commit obrigatória" };
      await run(["add", "-A"], cwd);
      const r = await run(["commit", "-m", message], cwd);
      return r;
    }
    case "pull":
      return run(["pull"], cwd);
    case "push":
      return run(["push"], cwd);
    case "fetch":
      return run(["fetch", "--all"], cwd);
    case "checkout":
      return branch ? run(["checkout", branch], cwd) : { ok: false, error: "Branch obrigatória" };
    case "branch":
      return branch ? run(["checkout", "-b", branch], cwd) : run(["branch"], cwd);
    case "merge":
      return branch ? run(["merge", branch], cwd) : { ok: false, error: "Branch obrigatória" };
    case "stash":
      return run(["stash"], cwd);
    case "stash_pop":
      return run(["stash", "pop"], cwd);
    default:
      return { ok: false, error: `Ação git desconhecida: ${action}` };
  }
}

export async function gitDiff(cwd, file) {
  const args = ["diff", "--no-color"];
  if (file) args.push("--", file);
  return run(args, cwd);
}

export async function gitGraph(cwd) {
  return run(["log", "--graph", "--all", "--decorate", "--oneline", "-n", "300"], cwd);
}

export function readFileText(path) {
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : "";
  } catch {
    return "";
  }
}

export function writeFileText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content ?? "", "utf8");
  return { ok: true };
}

const TEXT_EXT = /\.(txt|md|json|ya?ml|toml|js|jsx|ts|tsx|css|scss|html|htm|xml|svg|c|h|cpp|hpp|java|kt|py|rb|go|rs|php|sh|bash|zsh|sql|env|ini|cfg|log|vue|svelte)$/i;
const IGNORE_DIRS = /^(node_modules|\.git|dist|build|out|vendor|\.cache)$/;

/** Busca por nome (fuzzy simples) ou conteúdo (>query) — FR-033/SC-010. */
export async function fileSearch(cwd, query, byContent) {
  const q = String(query || "").toLowerCase();
  if (!q || !cwd || !existsSync(cwd)) return { ok: false, matches: [], error: !cwd ? "Sem diretório" : null };

  // Conteúdo: tenta ripgrep (rápido), senão varredura limitada
  if (byContent) {
    try {
      const r = execFileSync("rg", ["-l", "-i", "--max-filesize", "1M", "--", q, cwd], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      const matches = String(r).split("\n").filter(Boolean).slice(0, 200).map((p) => ({ path: p }));
      return { ok: true, matches };
    } catch {
      return { ok: true, matches: await contentFallback(cwd, q) };
    }
  }

  // Nome: varredura recursiva (limitada)
  const matches = [];
  const walk = (dir, depth) => {
    if (depth > 8 || matches.length > 10000) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (matches.length >= 10000) return;
      const full = join(dir, e.name);
      const rel = full.slice(cwd.length).replace(/^[/\\]/, "");
      if (e.isDirectory()) {
        if (IGNORE_DIRS.test(e.name)) continue;
        walk(full, depth + 1);
      } else if (rel.toLowerCase().includes(q)) {
        matches.push({ path: full });
      }
    }
  };
  walk(cwd, 0);
  return { ok: true, matches: matches.slice(0, 300) };
}

async function contentFallback(cwd, q) {
  const matches = [];
  const walk = (dir, depth) => {
    if (depth > 7 || matches.length >= 60) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (matches.length >= 60) return;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.test(e.name)) walk(full, depth + 1);
      } else if (TEXT_EXT.test(e.name)) {
        try {
          const st = statSync(full);
          if (st.size <= 1024 * 1024 && readFileSync(full, "utf8").toLowerCase().includes(q)) {
            matches.push({ path: full });
          }
        } catch {}
      }
    }
  };
  walk(cwd, 0);
  return matches;
}
