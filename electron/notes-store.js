// electron/notes-store.js
// Persistência de notas .md (FR-019..025): pasta interna do app ou no projeto,
// mapeamento noteId→arquivo e remoção segura.

import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";

export class NotesStore {
  /** @param {string} notesRoot ex.: <userData>/notes */
  constructor(notesRoot) {
    this.root = notesRoot;
  }

  internalFile(workspaceId, nodeId) {
    return join(this.root, workspaceId, `${nodeId}.md`);
  }

  /** Cria o arquivo interno de uma nota (workspaceId + nodeId). */
  create(workspaceId, nodeId, { title } = {}) {
    const file = this.internalFile(workspaceId, nodeId);
    mkdirSync(dirname(file), { recursive: true });
    if (!existsSync(file)) {
      writeFileSync(file, title ? `# ${title}\n\n` : "", "utf8");
    }
    return file;
  }

  read(file) {
    try {
      return existsSync(file) ? readFileSync(file, "utf8") : "";
    } catch {
      return "";
    }
  }

  write(file, content) {
    if (!file) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content ?? "", "utf8");
  }

  _slug(title, nodeId) {
    const base = String(title || "nota")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return base || nodeId || "nota";
  }

  /** Move nota interna → projeto (diretório do workspace), evitando sobrescrever. */
  moveToProject(workingDir, title, nodeId, content) {
    const dir = workingDir || process.cwd();
    mkdirSync(dir, { recursive: true });
    let target = join(dir, `${this._slug(title, nodeId)}.md`);
    let n = 2;
    while (existsSync(target)) {
      target = join(dir, `${this._slug(title, nodeId)}-${n}.md`);
      n++;
    }
    writeFileSync(target, content ?? "", "utf8");
    return target;
  }

  delete(file) {
    if (!file) return;
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {}
  }

  moveFile(from, to) {
    try {
      renameSync(from, to);
    } catch {
      // Fallback: copia simples
      const content = this.read(from);
      this.write(to, content);
      this.delete(from);
    }
  }
}
