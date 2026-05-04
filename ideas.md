# Brainstorming de design — Personal dWallet e Business dWallet

<response>
<text>
<idea>
**Design Movement**: Design System Institucional Brasileiro com influência de Civic Tech funcionalista.

**Core Principles**: A interface deve priorizar clareza operacional, acessibilidade, confiança institucional e continuidade de jornada. Cada tela deve apresentar uma ação principal evidente, estados de progresso legíveis e linguagem direta, sempre evitando excesso de decoração que possa reduzir a percepção de serviço público confiável.

**Color Philosophy**: A base deve partir do azul institucional do gov.br, branco e cinzas neutros, com verde usado apenas para sucesso e amarelo apenas para atenção. A intenção emocional é transmitir segurança, rastreabilidade e familiaridade com serviços digitais federais.

**Layout Paradigm**: O layout deve seguir uma estrutura de serviço público orientada por tarefas, com cabeçalho gov.br, trilha lateral de progresso e área principal em cartões sequenciais. A Personal dWallet deve ter navegação mais guiada e linear; a Business dWallet deve usar painel operacional com contexto persistente da empresa.

**Signature Elements**: Barra superior inspirada no padrão gov.br; cartões de serviço com borda lateral azul; trilha de 17 passos com status visual; painéis de requisição e resposta da API com linguagem simplificada.

**Interaction Philosophy**: As interações devem se comportar como serviços governamentais: confirmar antes de ações relevantes, mostrar comprovantes, explicar erros em português claro e permitir copiar IDs/tokens de forma controlada.

**Animation**: Animações discretas de entrada vertical curta, transições de estado entre pendente, executando, sucesso e erro, e feedback visual de botões sem movimento excessivo. A animação deve reforçar entendimento do fluxo, não gerar espetáculo.

**Typography System**: Usar Rawline, quando disponível, ou fallback compatível com o Design System gov.br. Hierarquia com títulos fortes, subtítulos médios e corpo com excelente legibilidade. Evitar Inter como fonte principal.
</idea>
</text>
<probability>0.07</probability>
</response>

<response>
<text>
<idea>
**Design Movement**: Neo-Brutalismo Cívico Controlado.

**Core Principles**: A interface teria contornos marcados, blocos funcionais, contraste alto e linguagem visual quase documental. A jornada seria tratada como um processo auditável, com cada API em módulos rígidos e comprováveis.

**Color Philosophy**: Usaria branco, preto suave, azul governamental e amarelo de alerta em áreas pontuais. A emoção buscada seria objetividade e transparência processual, quase como um painel de fiscalização.

**Layout Paradigm**: Estrutura em colunas assimétricas, com uma coluna de instruções e outra de execução, separando explicitamente decisão humana de chamada técnica.

**Signature Elements**: Bordas grossas, etiquetas de status, números grandes para etapas e blocos de evidência quase cartoriais.

**Interaction Philosophy**: O usuário sempre veria causa, ação e consequência antes de executar uma API. O sistema enfatizaria rastreabilidade e controle.

**Animation**: Pouca animação, apenas alternância de estados e expansão de detalhes técnicos. Movimentos rápidos e retilíneos.

**Typography System**: Títulos em fonte condensada institucional e corpo em sans legível. Hierarquia fortemente numérica.
</idea>
</text>
<probability>0.05</probability>
</response>

<response>
<text>
<idea>
**Design Movement**: Material Público Minimalista com camada de dados.

**Core Principles**: Foco em simplicidade, painéis limpos, estados de API em tempo real e redução de fricção. A interface aproximaria experiência de aplicativo financeiro moderno com governança de serviço público.

**Color Philosophy**: Fundo claro levemente azulado, azul como elemento de navegação, verde para confirmação e vermelho para falhas. A intenção seria reduzir ansiedade na execução de APIs e tornar a jornada mais assistida.

**Layout Paradigm**: Layout em shell de aplicativo com barra lateral, painel central de ação e painel direito de detalhes da resposta, parecido com console assistido.

**Signature Elements**: Cards elevados, chips de status, medidores de progresso e blocos JSON formatados visualmente.

**Interaction Philosophy**: Toda execução teria feedback imediato, resumo humano e opção de ver detalhes técnicos.

**Animation**: Microinterações suaves, carregamento com skeletons e transições de painel.

**Typography System**: Fonte sans humanista para corpo e display técnico para códigos e IDs.
</idea>
</text>
<probability>0.08</probability>
</response>

## Abordagem escolhida

A abordagem escolhida é **Design System Institucional Brasileiro com influência de Civic Tech funcionalista**. Ela é a mais adequada porque o usuário solicitou aderência às diretrizes governamentais brasileiras de identidade visual, UX e UI, e porque a jornada de 17 passos precisa ser compreensível para execução operacional, auditoria de APIs e documentação de evidências. Todas as páginas e componentes deverão reforçar essa filosofia por meio de linguagem clara, estrutura sequencial, cabeçalho gov.br, cartões de serviço, estados de API bem explicados e uso disciplinado de cores institucionais.
