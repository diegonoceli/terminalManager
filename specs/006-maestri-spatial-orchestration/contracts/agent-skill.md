# Contract: Skill de Comunicação entre Agentes (CLI)

FR-034/FR-035/FR-036/FR-055. Quando dois terminais (agentes) são conectados, o Maestri expõe, no PATH das sessões desses agentes, o comando `maestri-agent` e instala a skill correspondente (instrução de uso no contexto do agente). Toda invocação é **execução direta** e fica **registrada** (FR-055) no `ConnectionData.log`.

## 1. Comandos

```
maestri-agent send   --to <terminalId|nodeId> [--text "<texto>"]
maestri-agent note   read <noteId> | write <noteId> --content "<markdown>" | list
maestri-agent portal navigate <portalId> <url> | reload <portalId> | back <portalId>
maestri-agent ping   --to <terminalId>
maestri-agent log    --since <iso>            # consulta do próprio histórico
```

## 2. Semântica

### send (agente → agente)
- Origem: terminal A (agente). Destino: terminal B conectado a A com `ConnectionKind="agent-agent"`.
- Ação: o texto é entregue como **entrada** no PTY do destino (como se o usuário digitasse) e fica visível na sessão de B.
- Restrição: só funciona se `A–B` conectados; caso contrário exit code `2` + mensagem `not_connected`.
- Saída padrão: `{"ok":true,"deliveredTo":"<terminalId>","at":"<iso>"}`.

### note (agente → nota)
- Requer conexão `agent-note` entre o terminal do agente e o nó de nota.
- `read`: retorna o conteúdo atual do `.md` (stdout).
- `write --content`: substitui/atualiza o `.md` e emite `note_updated` ao renderer (via main) — a nota conectada reflete a mudança.
- Restrição: exit `2` se não conectado; exit `3` se `noteId` não for nota.

### portal (agente → portal)
- Requer conexão `agent-portal` entre o terminal e um nó `web-portal`/`device-portal`.
- `navigate/reload/back`: acionam o `<webview>` do portal correspondente (main → renderer `portal_control`).
- Restrição: exit `2` se não conectado; exit `4` se alvo não for portal.

### ping / log
- `ping`: verifica se o par conectado está aceitando mensagens (exit 0) — usado na instalação da skill.
- `log`: consulta o histórico de ações registradas do par (rastreabilidade local).

## 3. Protocolo de execução

- `maestri-agent` é um script/bridge no main process (não um processo de rede): resolve via IPC para o `agent-comm` e devolve resultado no stdout do comando executado pelo agente.
- **Envio a um agente** ocorre escrevendo no PTY de destino (canal de entrada já existente em `terminal-manager.js`).
- **Registro**: cada invocação anexa `{ at, fromNodeId, toNodeId, verb, summary }` ao `log` da conexão e persiste no estado (visível no painel de inspeção — FR-037).

## 4. Instalação da skill

1. Ao conectar A–B (`agent-agent`): Maestri escreve na sessão de A e de B uma instrução curta declarando o comando disponível e exemplos (1–2 linhas), e garante `maestri-agent` no PATH da sessão (env da PTY).
2. No primeiro uso, executa `maestri-agent ping --to <par>`; se exit 0, marca a skill como instalada (`ConnectionData.skillInstalled=true`) — repetido a cada nova sessão/resume (FR-034: "instala quando conecta", FR-052: reaplica em resume).

## 5. Códigos de erro

| Código | Significado |
|--------|-------------|
| 0 | ok |
| 2 | nós não conectados / skill não instalada |
| 3 | alvo não é nota |
| 4 | alvo não é portal |
| 5 | argumento inválido |

## 6. Segurança

- Comando só opera **entre nós explicitamente conectados** pelo usuário.
- Ações são executadas sem confirmação (decisão Q4) mas **sempre registradas** e inspecionáveis; inputs de agentes têm a mesma confiança de digitação do usuário naquele terminal.
