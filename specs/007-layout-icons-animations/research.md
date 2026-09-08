# Research: Layout, Iconografia e Animações do Maestri

Este documento consolida as decisões técnicas, padrões de engenharia e escolhas arquiteturais para a renovação visual, iconografia vetorial e animações espaciais do Maestri.

---

## 1. Biblioteca de Ícones Vetoriais

### Decisão
Adotar a iconografia **Lucide** (versão SVG vetorial otimizada e embutida localmente via helper reutilizável `Icons.get(name, { size, className })`).

### Rationale
- **Consistência Estética**: Traço consistente de 1.5px (arredondado com `stroke-linecap="round"` e `stroke-linejoin="round"`), exatamente igual ao design de referência do Maestri original.
- **Totalmente Offline**: Todos os SVGs dos ícones utilizados no aplicativo residem localmente em um módulo (`public/js/icons.js`), garantindo que nenhum CDN ou recurso externo seja necessário.
- **Controle Dinâmico de Cor via CSS**: SVGs configurados com `stroke="currentColor"` e `fill="none"`, respondendo instantaneamente a temas claro/escuro, estados de hover e classes de status.
- **Zero Overhead**: Nenhum framework externo ou fonte pesada de ícones (.woff/.ttf) é adicionado.

### Alternativas Consideradas
- **Emojis / Unicode**: Usados anteriormente como paliativo, geravam inconsistências visuais gritantes entre macOS, Linux e Windows, além de não responderem a `currentColor` ou temas.
- **FontAwesome**: Dependência pesada, variações de peso de traço, visual antigo e licença mista.
- **Feather Icons**: Base original do Lucide, mas projeto descontinuado sem os ícones específicos modernos (ex: `Terminal`, `Smartphone`, `Split`, `GitPullRequest`).

---

## 2. Arquitetura de Animações e Desempenho a 60 FPS

### Decisão
Combinar transições aceleradas por hardware via CSS (`transform`, `opacity`, `will-change`) com curvas cúbicas de desaceleração natural (`cubic-bezier(0.16, 1, 0.3, 1)` para entradas e `cubic-bezier(0.4, 0, 0.2, 1)` para transições de estado), utilizando `requestAnimationFrame` para transições de câmera/viewport no canvas.

### Rationale
- **Aceleração por GPU**: Animações baseadas estritamente em `transform` e `opacity` rodam diretamente no compositor do Chromium, sem disparar reflow (layout) ou repaints pesados de DOM.
- **Fly-To Suave**: O zoom e pan programáticos (como `Ctrl+\` e foco de nó) utilizam interpolação com easing elástico suave ao longo de 300ms.
- **Leveza**: Elimina bibliotecas volumosas como GSAP ou Framer Motion, mantendo a arquitetura nativa e ultra-rápida do projeto.

### Alternativas Consideradas
- **Bibliotecas de Animação Externas (GSAP / Anime.js)**: Aumentariam a complexidade e peso de carregamento do renderer sem necessidade real, já que CSS nativo + rAF atendem com excelência.

---

## 3. Física de Conexões: Cordas Elásticas, Circuitos Ortogonais e Pulsos

### Decisão
1. **Estilo Corda (Rope)**: Cálculo de curva cúbica Bezier com vetor de gravidade e arqueamento pendular proporcional à distância entre as portas.
2. **Estilo Circuito (Circuit)**: Roteamento ortogonal Manhattan com segmentos puramente horizontais/verticais e cantos arredondados (`r=8px`), garantindo limpeza máxima em layouts densos.
3. **Abraçadeiras (Bundles)**: Ponto de ancoragem comum calculado pela média ponderada das portas, com linhas convergindo suavemente.
4. **Pulso de Dados**: Gradiente linear ou animação de `stroke-dashoffset` / filtro de brilho SVG com duração de 2 segundos ao transmitir saídas de agentes.

### Rationale
Garante alta fidelidade visual com física palpável, sem sobrecarregar o loop de renderização (cálculos matemáticos puros com vetorização em `<path d="...">`).

---

## 4. Acessibilidade: Preferência de "Reduzir Movimento" (Reduced Motion)

### Decisão
Implementar detecção automática da preferência do sistema via `@media (prefers-reduced-motion: reduce)` combinada com um toggle explícito nas Configurações (`settings.reducedMotion`).

### Rationale
- Atende à diretriz WCAG 2.1 (Critério 2.3.3).
- Usuários com sensibilidade vestibular ou máquinas menos potentes podem desligar completamente interpolações móveis: as ações tornam-se instantâneas (`0ms`).
