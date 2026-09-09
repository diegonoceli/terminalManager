// scratch/test-workspaces-nav.cjs
// Teste automatizado abrangente para o release 010-workspaces-nav-spotlight.
// Valida US1 (Mini Sidebar), US2 (Botão Editor), US3 (Notas Avançadas),
// US4 (Fichários/Binders), US5 (Pastas e Grupos) e US6 (Spotlight e Deep Links).

const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert");

console.log("\n🧪 [TEST SUITE] Iniciando testes automatizados 010-workspaces-nav-spotlight...\n");

async function runBackendTests() {
  console.log("▶ 1. Testes de Backend (TerminalManager, Binders, Pastas, Grupos, Spotlight)...");
  
  const { TerminalManager } = await import("../electron/terminal-manager.js");
  const { updateSpotlightIndex } = await import("../electron/spotlight-service.js");
  
  const tmpDir = path.join(__dirname, `test_data_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const stateFile = path.join(tmpDir, "state.json");

  const manager = new TerminalManager({ stateFile });
  manager.restore();

  // 1.1 Testes de Pastas (US5)
  const folder = manager.createFolder({ name: "Projetos Backend" });
  assert(folder && folder.id, "Pasta criada deve ter ID válido");
  assert.strictEqual(folder.name, "Projetos Backend");
  
  const wsList = manager.listWorkspaces();
  assert(wsList.length > 0, "Deve haver ao menos um workspace padrão");
  const wsId = wsList[0].id;
  
  manager.addWorkspaceToFolder(folder.id, wsId);
  const updatedFolder = manager.folders.find((f) => f.id === folder.id);
  assert(updatedFolder.workspaceIds.includes(wsId), "Workspace deve constar na pasta");

  manager.toggleFolder(folder.id, true);
  assert.strictEqual(updatedFolder.collapsed, true, "Pasta deve estar colapsada");

  // 1.2 Testes de Grupos (US5)
  const group = manager.createGroup({ name: "Corporativo", order: 1 });
  assert(group && group.id, "Grupo criado deve ter ID válido");
  assert.strictEqual(group.name, "Corporativo");
  manager.renameGroup(group.id, "Trabalho");
  assert.strictEqual(group.name, "Trabalho", "Grupo deve ser renomeado com sucesso");

  // 1.3 Testes de Notas e Proteção Externa (US3)
  const note1 = manager.createNode({
    type: "note",
    title: "Documentação API",
    internal: true,
  });
  manager.noteWrite(note1.id, "# Visão Geral da API\n\nEndpoint principal: /api/v1\n");
  assert(note1 && note1.id, "Nota interna criada com sucesso");
  
  const extPath = path.join(tmpDir, "EXTERNAL_README.md");
  fs.writeFileSync(extPath, "# Projeto Externo\n", "utf8");
  const noteExt = manager.createNode({
    type: "note",
    title: "README Externo",
    internal: false,
    filePath: extPath,
  });
  assert(noteExt && noteExt.internal === false, "Nota externa registrada");

  // Fechar nota externa não pode apagar o arquivo do disco (Princípio IV)
  manager.removeNode(noteExt.id);
  assert(fs.existsSync(noteExt.filePath), "Arquivo externo NUNCA pode ser excluído do disco ao remover nó!");

  // 1.4 Testes de Fichários / Binders (US4)
  const note2 = manager.createNode({
    type: "note",
    title: "Tarefas Pendentes",
    internal: true,
  });
  manager.noteWrite(note2.id, "- [ ] Criar testes\n- [ ] Lançar release");

  const note3 = manager.createNode({
    type: "note",
    title: "Ideias Futuras",
    internal: true,
  });
  manager.noteWrite(note3.id, "- Canvas infinito com física\n");

  const binder = manager.binderCreate({
    title: "Backlog Sprint 1",
    pageIds: [note1.id, note2.id, note3.id],
    named: true,
  });
  assert(binder && binder.id, "Fichário criado com sucesso");
  assert.strictEqual(binder.pageIds.length, 3, "Fichário deve ter 3 páginas");
  assert.strictEqual(binder.named, true, "Fichário deve reter named=true");

  // Leitura de Fichário por Agente
  const binderContent = manager.noteRead(binder.id);
  assert(binderContent.includes("Visão Geral da API"), "Conteúdo do Fichário lido pelo agente deve conter Página 1");
  assert(binderContent.includes("Tarefas Pendentes"), "Conteúdo do Fichário lido pelo agente deve conter Página 2");

  // Reordenar páginas
  manager.binderReorder(binder.id, [note3.id, note1.id, note2.id]);
  const reorderedBinder = manager.workspaces.get(manager.activeWorkspaceId).nodes.find((n) => n.id === binder.id);
  assert.strictEqual(reorderedBinder.pageIds[0], note3.id, "Primeira página reordenada com sucesso");

  // Remoção de página e permanência de fichário nomeado vazio
  manager.binderRemovePage(binder.id, note3.id);
  manager.binderRemovePage(binder.id, note1.id);
  manager.binderRemovePage(binder.id, note2.id);
  const emptyBinder = manager.workspaces.get(manager.activeWorkspaceId).nodes.find((n) => n.id === binder.id);
  assert(emptyBinder !== undefined, "Fichário nomeado vazio DEVE permanecer no canvas (T018)");

  // 1.5 Testes do Indexador Spotlight (US6)
  updateSpotlightIndex(manager, tmpDir, true);
  const spotlightIndexFile = path.join(tmpDir, "spotlight", "index.json");
  assert(fs.existsSync(spotlightIndexFile), "Arquivo spotlight/index.json deve ser gerado");
  const indexData = JSON.parse(fs.readFileSync(spotlightIndexFile, "utf8"));
  assert(Array.isArray(indexData) && indexData.length > 0, "Índice Spotlight deve conter itens indexados");
  const indexedWs = indexData.find((x) => x.type === "workspace");
  assert(indexedWs && (indexedWs.url.startsWith("terminalmanager://open") || indexedWs.url.startsWith("maestri://open")), "Item do Spotlight deve conter URL terminalmanager://open");

  // Limpeza
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("  ✓ Backend, Binders, Pastas, Grupos, Notas e Spotlight: PASSOU\n");
}

async function runRendererTests() {
  console.log("▶ 2. Testes de Interface e DOM (Mini Sidebar, Atalhos, Editor, Fichários)...");

  await app.whenReady();
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
    },
  });

  const indexPath = path.join(__dirname, "..", "public", "index.html");
  await win.loadFile(indexPath);

  const results = await win.webContents.executeJavaScript(`
    (() => {
      const res = [];
      const ok = (cond, msg) => {
        if (!cond) throw new Error(msg);
        res.push("  ✓ " + msg);
      };

      // 2.1 Botão de Editor (US2)
      const editorBtn = document.getElementById("btn-open-editor");
      ok(!!editorBtn, "Botão 'Abrir no Editor' (#btn-open-editor) existe no DOM");
      ok(editorBtn.title.includes("Editor") || editorBtn.title.includes("VS Code"), "Tooltip do editor está configurado");

      // 2.2 Mini Barra Lateral (US1)
      const sidebar = document.getElementById("sidebar");
      ok(!!sidebar, "Barra lateral (#sidebar) existe");
      ok(typeof window.WorkspaceSidebar !== "undefined", "Objeto global WorkspaceSidebar está definido");

      // 2.3 Suporte a Fichários (US4)
      ok(typeof window.BinderWidget !== "undefined", "Widget global BinderWidget está registrado");

      // 2.4 Renderização de Pastas e Grupos no Sidebar (US5)
      const dummyApp = {
        folders: [{ id: "f1", name: "Projetos Web", collapsed: false, workspaceIds: ["ws1"] }],
        groups: [{ id: "g1", name: "Trabalho", order: 0, workspaceIds: [] }],
        ui: {}
      };
      window.WorkspaceSidebar.app = dummyApp;
      window.WorkspaceSidebar.render(
        [{ id: "ws1", name: "App 1", workingDir: "/test/1", terminals: [] }],
        "ws1"
      );
      const folderEl = sidebar.querySelector(".sb-folder");
      ok(!!folderEl, "Pasta renderizada corretamente na sidebar (.sb-folder)");
      const groupEl = sidebar.querySelector(".sb-section-divider");
      ok(!!groupEl, "Divisor de grupo renderizado (.sb-section-divider)");

      // 2.5 Teste de Mini Sidebar Toggle
      window.WorkspaceSidebar.toggleMiniMode(true);
      ok(window.WorkspaceSidebar.isMini() === true, "Modo mini sidebar ativa classe sb-mini");
      window.WorkspaceSidebar.toggleMiniMode(false);
      ok(window.WorkspaceSidebar.isMini() === false, "Modo mini sidebar desativa corretamente");

      return res;
    })()
  `);

  for (const r of results) {
    console.log(r);
  }
  console.log("  ✓ Interface, Mini Sidebar, Fichários e Botão Editor: PASSOU\n");
}

(async () => {
  try {
    await runBackendTests();
    await runRendererTests();
    console.log("🎉 [SUCESSO] Todos os testes passaram sem erros!\n");
    app.quit();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ [FALHA NO TESTE]:", err);
    app.quit();
    process.exit(1);
  }
})();
