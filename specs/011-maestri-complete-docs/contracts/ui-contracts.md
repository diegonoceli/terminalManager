# Interface & IPC Contracts: Plataforma Maestri

**Feature**: `011-maestri-complete-docs`
**Date**: 2026-09-08
**Status**: Completed

Este documento estabelece todos os contratos IPC (Electron Main ⇄ Renderer), interfaces de CLI e eventos de UI para a plataforma Maestri.

---

## 1. Contratos IPC (Electron Main ⇄ Renderer)

### 1.1 Workspaces & Configurações
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `workspace_create` | Renderer → Main | `{ name: string, workingDir: string, icon: string }` | Cria novo workspace |
| `workspace_switch` | Renderer → Main | `{ workspaceId: string }` | Alterna o workspace ativo |
| `workspace_sync_docs` | Renderer → Main | `{ workspaceId: string, enabled: boolean }` | Ativa sync `CLAUDE.md` ↔ `AGENTS.md` |
| `open_in_editor` | Renderer → Main | `{ path: string }` | Abre o diretório no editor de código padrão |
| `spotlight_index` | Renderer → Main | `{ workspaceId: string, nodes: object[] }` | Atualiza indexação no macOS Spotlight |

### 1.2 Canvas, Elevação e Grupos
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `node_elevate_toggle` | Renderer → Renderer | `{ nodeId: string, elevated: boolean }` | Alterna estado elevado ao centro |
| `node_dock_toggle` | Renderer → Renderer | `{ nodeId: string, dockSide: 'left' \| 'right' \| null }` | Acopla nó em coluna lateral fixa |
| `group_create` | Renderer → Main | `{ floorId: string, title?: string, memberNodeIds: string[] }` | Cria frame de grupo (`Ctrl+G`) |
| `group_dissolve` | Renderer → Main | `{ groupId: string }` | Remove frame e libera membros (`Ctrl+Shift+G`) |
| `nodes_arrange_grid` | Renderer → Renderer | `{ nodeIds: string[] }` | Reorganiza nós em grade uniforme (`Ctrl+Shift+T`) |

### 1.3 Terminais, Roles e Temas
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `role_save` | Renderer → Main | `{ role: Role, targetDir?: string }` | Salva role na biblioteca e gera sidecar `role.json` |
| `role_discover` | Renderer → Main | `{ workingDir: string }` | Varre pastas em busca de arquivos `role.json` |
| `roles_discovered` | Main → Renderer | `{ roles: Role[] }` | Retorna roles descobertas no projeto |
| `theme_list_custom` | Renderer → Main | `{}` | Varre `~/.maestri/terminal/themes/` (Ghostty) |
| `terminal_attention_event`| Main → Renderer | `{ terminalId: string, attention: boolean, reason: string }` | Dispara ponto de atenção e notificação |

### 1.4 Notas, Assets e Encadeamento
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `note_save_image` | Renderer → Main | `{ nodeId: string, base64: string, extension: string }` | Grava imagem colada na pasta de assets |
| `note_move_path` | Renderer → Main | `{ nodeId: string, targetPath: string }` | Move o arquivo markdown para local do projeto |
| `note_chain_get` | Renderer → Main | `{ rootNoteId: string }` | Retorna árvore de conteúdo de notas encadeadas |

### 1.5 Conexões Físicas e Comunicação Inter-Agentes
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `connection_set_style`| Renderer → Main | `{ connectionId: string, style: 'rope' \| 'circuit' }` | Altera estilo visual do cabo |
| `cable_tie_create` | Renderer → Main | `{ floorId: string, connectionIds: string[], positionRatio: number }` | Cria abraçadeira agrupando cabos |
| `agent_msg_send` | Main (CLI) → Main | `{ fromTerminalId: string, toTerminalId: string, prompt: string }` | Inicia despacho de prompt inter-agentes |
| `agent_msg_reply` | Main → Main (CLI) | `{ toTerminalId: string, response: string }` | Devolve a resposta gerada ao terminal remetente |

### 1.6 Árvore de Arquivos e Editor Embutido
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `file_tree_git_graph` | Renderer → Main | `{ rootPath: string }` | Executa `git log --graph` e retorna nós e lanes |
| `file_tree_git_op` | Renderer → Main | `{ op: 'commit' \| 'pull' \| 'push' \| 'checkout' \| 'stash', args: object }` | Executa operação git no repositório |
| `file_content_search` | Renderer → Main | `{ rootPath: string, query: string }` | Busca de conteúdo (iniciada com `>`) com linhas |
| `editor_quote_to_terminal` | Renderer → Renderer | `{ terminalId: string, codeSnippet: string, filePath: string }` | Envia citação de código para o agente |

### 1.7 Portais Web e Dispositivos Móveis
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `portal_device_list` | Renderer → Main | `{}` | Lista Simuladores iOS, Emuladores Android e USBs |
| `portal_device_boot` | Renderer → Main | `{ deviceId: string, deviceType: string }` | Inicializa o dispositivo se não estiver em execução |
| `portal_device_action` | Renderer → Main | `{ deviceId: string, action: 'tap' \| 'type' \| 'key' \| 'rotate', params: object }` | Transmite entrada tátil ou botão de hardware |
| `portal_agent_automation` | Main (CLI) → Main | `{ portalId: string, command: string, args: object }` | Executa comando de automação de IA (DOM / Acessibilidade) |

### 1.8 Andares (Floors)
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `floor_create_apfs` | Renderer → Main | `{ workspaceId: string, name: string, branch: string, cloneGroundLayout: boolean }` | Cria andar com clone APFS instantâneo |
| `floor_hook_execute` | Renderer → Main | `{ floorId: string, hookType: 'setup' \| 'run' \| 'teardown' }` | Dispara comandos de hook com variáveis de ambiente |
| `floor_land_preview` | Renderer → Main | `{ floorId: string, targetBranch: string }` | Retorna diff e análise de conflitos antes do merge |
| `floor_land_merge` | Renderer → Main | `{ floorId: string, targetBranch: string }` | Efetua o merge controlado no repositório base |

### 1.9 Batuta Search e Compositor de Prompts
| Canal / Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `search_query_all` | Renderer → Renderer | `{ query: string, activeWorkspaceId: string }` | Executa busca fuzzy unificada em todos os nós |
| `prompt_draft_save` | Renderer → Main | `{ terminalId: string, text: string, pills: object[] }` | Salva rascunho persistente do compositor |
| `prompt_draft_load` | Renderer → Main | `{ terminalId: string }` | Restaura rascunho persistente do terminal |
| `batuta_pedir_send` | Renderer → Main | `{ targetTerminalId: string, multilinePrompt: string }` | Dispara prompt do fluxo "Pedir..." com preview |

---

## 2. Contratos de Linha de Comando (Maestri CLI Skill)

Os agentes em execução nos terminais possuem acesso aos comandos utilitários do Maestri no `PATH`:

```bash
# Comunicação Inter-Agentes
maestri send <terminal_name_or_id> "<mensagem>"
maestri broadcast "<mensagem_para_todos_conectados>"

# Leitura e Manipulação de Notas Conectadas
maestri note read <note_name_or_id> [--chain]
maestri note append <note_name_or_id> "<conteúdo>"

# Automação de Portais Web
maestri portal <portal_id> navigate <url>
maestri portal <portal_id> click <selector>
maestri portal <portal_id> type <selector> "<texto>"
maestri portal <portal_id> screenshot [--out <path>]
maestri portal <portal_id> eval "<code>"

# Automação de Portais de Dispositivos Móveis
maestri device <device_id> tree                 # Imprime árvore de acessibilidade nativa
maestri device <device_id> tap <element_id>
maestri device <device_id> type "<texto>"
maestri device <device_id> key <home|lock|back|recents>
maestri device <device_id> launch <bundle_or_package_id>
maestri device <device_id> screenshot
```

