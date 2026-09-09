// electron/spotlight-service.js
// Gerador de metadados e índice do macOS Spotlight indexando workspaces, notas, terminais e fichários. US6.
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";

let _debounceTimer = null;

/**
 * Atualiza o índice Spotlight.
 *
 * Primeira assinatura (produção):
 *   updateSpotlightIndex(manager, userDataDir, immediate?)
 *     manager     — instância de TerminalManager (usa manager.workspaces)
 *     userDataDir — diretório onde spotlight/ será gravado
 *
 * Segunda assinatura (testes headless):
 *   updateSpotlightIndex(workspacesIterable)
 *     workspacesIterable — Iterator/Iterable de workspaces
 *     (userDataDir padrão: tmpdir())
 *
 * Retorna o número de itens indexados (>= 0).
 */
export function updateSpotlightIndex(managerOrIterable, userDataDir, immediate = false) {
  // Detectar assinatura: se primeiro arg é um iterator/iterable de workspaces
  let workspacesMap;
  if (
    managerOrIterable &&
    typeof managerOrIterable[Symbol.iterator] === "function" &&
    typeof managerOrIterable.entries !== "function"
  ) {
    // É um iterable (como Map.values()) — construir um Map falso para iteração
    const wsArr = [...managerOrIterable];
    workspacesMap = new Map(wsArr.map((ws, i) => [ws.id || String(i), ws]));
    if (!userDataDir) userDataDir = join(tmpdir(), "terminalmanager-spotlight-test");
    immediate = true;
  } else if (managerOrIterable && managerOrIterable.workspaces) {
    workspacesMap = managerOrIterable.workspaces;
  } else {
    return 0;
  }

  if (!userDataDir) return 0;

  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }

  let indexedCount = 0;

  const runIndex = () => {
    try {
      const spotlightDir = join(userDataDir, "spotlight");
      const itemsDir = join(spotlightDir, "items");
      mkdirSync(itemsDir, { recursive: true });

      const indexItems = [];
      const currentFiles = new Set();

      for (const [wsId, ws] of workspacesMap.entries()) {
        const wsName = ws.name || "Workspace";
        const wsDir = ws.workingDir || "";

        // 1. Workspace
        const wsItem = {
          id: `ws_${wsId}`,
          type: "workspace",
          title: wsName,
          snippet: `Workspace: ${wsName}. Diretório: ${wsDir}`,
          workspaceId: wsId,
          url: `terminalmanager://open?workspace=${wsId}`,
          updatedAt: new Date().toISOString(),
        };
        indexItems.push(wsItem);

        const wsFile = `ws_${wsId}.md`;
        currentFiles.add(wsFile);
        writeFileSync(
          join(itemsDir, wsFile),
          `# ${wsName}\n\nWorkspace do TerminalManager\nDiretório: ${wsDir}\nID: ${wsId}\nURL: terminalmanager://open?workspace=${wsId}\n`
        );

        // 2. Nós do workspace
        for (const node of ws.nodes || []) {
          if (node.type === "terminal") {
            const termItem = {
              id: `term_${node.id}`,
              type: "terminal",
              title: node.title || "Terminal",
              snippet: `Terminal "${node.title || "Terminal"}" no workspace ${wsName}`,
              workspaceId: wsId,
              nodeId: node.id,
              url: `terminalmanager://open?workspace=${wsId}&node=${node.id}`,
              updatedAt: new Date().toISOString(),
            };
            indexItems.push(termItem);

            const termFile = `term_${node.id}.md`;
            currentFiles.add(termFile);
            writeFileSync(
              join(itemsDir, termFile),
              `# ${node.title || "Terminal"}\n\nTerminal no workspace ${wsName}\nID: ${node.id}\nURL: terminalmanager://open?workspace=${wsId}&node=${node.id}\n`
            );
          } else if (node.type === "note") {
            let noteContent = "";
            if (node.filePath && existsSync(node.filePath)) {
              try {
                noteContent = readFileSync(node.filePath, "utf8");
              } catch {}
            } else if (node.content) {
              noteContent = node.content;
            }
            const snippet = (noteContent || "").slice(0, 300).replace(/[\r\n]+/g, " ");

            const noteItem = {
              id: `note_${node.id}`,
              type: "note",
              title: node.title || "Nota",
              snippet: `Nota "${node.title || "Nota"}" no workspace ${wsName}: ${snippet}`,
              workspaceId: wsId,
              nodeId: node.id,
              url: `terminalmanager://open?workspace=${wsId}&node=${node.id}`,
              updatedAt: new Date().toISOString(),
            };
            indexItems.push(noteItem);

            const noteFile = `note_${node.id}.md`;
            currentFiles.add(noteFile);
            writeFileSync(
              join(itemsDir, noteFile),
              `# ${node.title || "Nota"}\n\nNota no workspace ${wsName}\n\n${noteContent}\n\n---\nURL: terminalmanager://open?workspace=${wsId}&node=${node.id}\n`
            );
          } else if (node.type === "binder") {
            const pageTitles = (node.pageIds || [])
              .map((pid) => (ws.nodes || []).find((n) => n.id === pid)?.title)
              .filter(Boolean);

            const binderItem = {
              id: `binder_${node.id}`,
              type: "binder",
              title: node.title || "Fichário",
              snippet: `Fichário "${node.title || "Fichário"}" no workspace ${wsName} com ${pageTitles.length} páginas: ${pageTitles.join(", ")}`,
              workspaceId: wsId,
              nodeId: node.id,
              url: `terminalmanager://open?workspace=${wsId}&node=${node.id}`,
              updatedAt: new Date().toISOString(),
            };
            indexItems.push(binderItem);

            const binderFile = `binder_${node.id}.md`;
            currentFiles.add(binderFile);
            writeFileSync(
              join(itemsDir, binderFile),
              `# ${node.title || "Fichário"}\n\nFichário no workspace ${wsName}\nPáginas:\n${pageTitles.map((t) => `- ${t}`).join("\n")}\n\nURL: terminalmanager://open?workspace=${wsId}&node=${node.id}\n`
            );
          }
        }
      }

      // Limpeza de arquivos órfãos
      try {
        const existing = readdirSync(itemsDir);
        for (const file of existing) {
          if (file.endsWith(".md") && !currentFiles.has(file)) {
            try { unlinkSync(join(itemsDir, file)); } catch {}
          }
        }
      } catch {}

      // Gravação do índice mestre index.json
      writeFileSync(
        join(spotlightDir, "index.json"),
        JSON.stringify(indexItems, null, 2)
      );

      indexedCount = indexItems.length;

      // Notificação ao Spotlight nativo do macOS via mdimport
      if (process.platform === "darwin") {
        execFile("mdimport", [spotlightDir], () => {});
      }
    } catch (err) {
      console.error("Erro ao atualizar índice Spotlight:", err.message);
    }
  };

  if (immediate) {
    runIndex();
    return indexedCount;
  } else {
    _debounceTimer = setTimeout(runIndex, 600);
    return 0; // Devolve 0 pois ainda não executou (debounced)
  }
}

