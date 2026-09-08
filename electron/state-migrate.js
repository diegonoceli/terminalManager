// electron/state-migrate.js
// Migração do state.json v1/v2 (workflows/"floors") → v3 (workspaces). US1/Foundational.
// Mantém compatibilidade: v3 é a identidade; v1/v2 são convertidos em memória e regravados.

const DEFAULT_SETTINGS = {
  backgroundKeepalive: 3,
  attentionNotifications: true,
  snapEnabled: false,
};

const DEFAULT_UI = {
  sidebar: { collapsed: false },
  folders: [],
  sections: [],
};

function nowIso() {
  return new Date().toISOString();
}

function toWorkspace(wf, fallbackName) {
  const name = (wf && wf.name) || fallbackName;
  return {
    id: (wf && wf.id) || "ws_default",
    name,
    icon: (wf && wf.icon) || "",
    workingDir: (wf && wf.workingDir) || "",
    instructions:
      (wf && wf.instructions) || { source: "none", syncBetween: false, claudeMd: undefined, agentsMd: undefined },
    groups: Array.isArray(wf && wf.groups) ? wf.groups : [],
    nodes: Array.isArray(wf && wf.nodes) ? wf.nodes : [],
    connections: Array.isArray(wf && wf.connections) ? wf.connections : [],
    createdAt: (wf && wf.createdAt) || nowIso(),
    updatedAt: (wf && wf.updatedAt) || nowIso(),
    lastActiveAt: (wf && typeof wf.lastActiveAt === "number") ? wf.lastActiveAt : 0,
  };
}

function migrateWorkflowsToWorkspaces(data) {
  const workspaces = [];
  const idMap = new Map(); // workflowId -> workspaceId

  if (Array.isArray(data.workflows) && data.workflows.length > 0) {
    for (const wf of data.workflows) {
      const ws = toWorkspace(wf, "Workspace");
      workspaces.push(ws);
      idMap.set(wf.id, ws.id);
    }
  } else {
    // Legacy v1: terminais/portais avulsos + conexões → workspace único
    const legacyNodes = Array.isArray(data.terminals)
      ? data.terminals.map((t) => (t.type ? { ...t } : { type: "terminal", ...t }))
      : [];
    const defaultWs = toWorkspace(
      {
        id: "ws_default",
        name: "Workspace 1",
        nodes: legacyNodes,
        connections: Array.isArray(data.connections) ? data.connections : [],
      },
      "Workspace 1"
    );
    workspaces.push(defaultWs);
  }

  const activeWf = data.activeWorkflowId;
  const activeWorkspaceId =
    (activeWf && idMap.get(activeWf)) || (workspaces.length ? workspaces[0].id : "ws_default");

  return { workspaces, activeWorkspaceId };
}

/**
 * @param {any} raw Objeto parseado de state.json
 * @returns {{ state: object, migrated: boolean }}
 */
export function migrateState(raw) {
  if (!raw || typeof raw !== "object") {
    raw = {};
  }

  if (raw.version >= 3) {
    // Já v3 — apenas garante defaults de seções novas.
    return {
      state: {
        version: 3,
        activeWorkspaceId: raw.activeWorkspaceId || (Array.isArray(raw.workspaces) && raw.workspaces[0]?.id) || "ws_default",
        workspaces: Array.isArray(raw.workspaces) ? raw.workspaces : [],
        ui: { ...DEFAULT_UI, ...(raw.ui || {}) },
        settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
        roles: Array.isArray(raw.roles) ? raw.roles : [],
      },
      migrated: false,
    };
  }

  const hasLegacy = Array.isArray(raw.workflows) || Array.isArray(raw.terminals);
  const { workspaces, activeWorkspaceId } = hasLegacy
    ? migrateWorkflowsToWorkspaces(raw)
    : { workspaces: [toWorkspace(null, "Workspace 1")], activeWorkspaceId: "ws_default" };

  return {
    state: {
      version: 3,
      activeWorkspaceId,
      workspaces,
      ui: { ...DEFAULT_UI, ...(raw.ui || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
      roles: Array.isArray(raw.roles) ? raw.roles : [],
    },
    migrated: hasLegacy,
  };
}
