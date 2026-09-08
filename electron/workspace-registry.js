// electron/workspace-registry.js
// Registry de workspaces em runtime (US2): rastreia quais possuem processos vivos,
// aplica política LRU (ativo + N recentes) e aciona pausa dos excedentes.

export class WorkspaceRegistry {
  /**
   * @param {import("./terminal-manager.js").TerminalManager} manager
   */
  constructor(manager) {
    this.manager = manager;
  }

  /** Workspaces que possuem ao menos um PTY vivo, ordenados por lastActiveAt (mais recente 1º). */
  listAlive() {
    const aliveIds = new Set();
    for (const t of this.manager.terminals.values()) {
      if (t.workspaceId) aliveIds.add(t.workspaceId);
    }
    const arr = [];
    for (const id of aliveIds) {
      const ws = this.manager.workspaces.get(id);
      if (ws) {
        arr.push({ id, lastActiveAt: ws.lastActiveAt || 0, isActive: id === this.manager.activeWorkspaceId });
      }
    }
    arr.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return arr;
  }

  /**
   * Política LRU (FR-054): mantém vivos o workspace ativo + os N-1 mais recentes
   * (total N = settings.backgroundKeepalive, padrão 3). Excedentes são pausados.
   * @returns {Array<{id:string,lastActiveAt:number,isActive:boolean}>} workspaceIds pausados
   */
  applyPolicy() {
    const cap = Math.max(1, Number(this.manager.settings.backgroundKeepalive) || 3);
    const alive = this.listAlive();
    const paused = [];
    for (let i = cap; i < alive.length; i++) {
      const entry = alive[i];
      if (entry.isActive) continue; // nunca pausa o ativo
      if (this.manager.pauseWorkspace(entry.id)) {
        paused.push(entry);
      }
    }
    return paused;
  }
}
