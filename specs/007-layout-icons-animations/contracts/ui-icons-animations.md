# Interface Contract: UI Iconography and Motion Engine

Este contrato especifica as interfaces públicas expostas pelo módulo de ícones (`public/js/icons.js`) e pelos helpers de animação e docking no canvas espacial.

---

## 1. Módulo `Icons` (`window.Icons`)

Módulo responsável pela renderização padronizada de ícones Lucide no formato SVG.

```javascript
window.Icons = {
  /**
   * Retorna uma string HTML contendo o elemento SVG do ícone solicitado.
   * @param {string} name - Nome semântico do ícone (ex: 'terminal', 'folder', 'close')
   * @param {Object} [opts] - Opções de estilização
   * @param {number} [opts.size=16] - Largura e altura em pixels
   * @param {number} [opts.strokeWidth=1.5] - Espessura do traço
   * @param {string} [opts.className=''] - Classes adicionais CSS
   * @param {string} [opts.color='currentColor'] - Cor do traço
   * @param {string} [opts.ariaLabel] - Descrição de acessibilidade
   * @returns {string} Elemento <svg> serializado
   */
  svg(name, opts = {}): string,

  /**
   * Cria e retorna diretamente um elemento DOM SVGElement configurado.
   */
  element(name, opts = {}): SVGElement,

  /**
   * Verifica se o ícone existe no catálogo registrado.
   */
  has(name): boolean,

  /**
   * Permite registrar ou sobrescrever ícones customizados.
   */
  register(name, definition): void,
};
```

---

## 2. Helper de Animações do Canvas (`app.motion`)

```javascript
window.app.motion = {
  /**
   * Executa transição suave de câmera/viewport até o alvo geométrico.
   * @param {Object} target - { tx, ty, zoom }
   * @param {number} [duration=300] - Duração em ms (0 se reducedMotion ativo)
   */
  animateCamera(target, duration): Promise<void>,

  /**
   * Anima o foco direto sobre um nó espacial selecionado.
   * @param {string} nodeId - ID do nó
   */
  focusNode(nodeId): void,

  /**
   * Eleva o nó ao centro da viewport ou o restaura ao canvas.
   * @param {string} nodeId - ID do nó
   */
  toggleElevateNode(nodeId): void,

  /**
   * Acopla o nó em dock lateral ou o desacopla.
   * @param {string} nodeId
   * @param {'none'|'left'|'right'} side
   */
  dockNode(nodeId, side): void,

  /**
   * Consulta se animações estão ativas ou suprimidas.
   */
  isReduced(): boolean,
};
```
