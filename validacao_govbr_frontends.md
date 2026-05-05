# Validação visual dos novos front-ends GovBR

Data local da validação: 2026-05-04.

## Rotas verificadas

| Rota | Resultado visual | Evidência |
|---|---|---|
| `/personal-govbr` | Renderizou sem tela de erro. Cabeçalho gov.br, hero azul institucional, navegação lateral, tela ativa de entrada Personal, campo de e-mail pré-preenchido pela sandbox e painel de evidência sanitizada visíveis. | `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-30-37_2816.webp` |
| `/business-govbr` | Renderizou sem tela de erro. Cabeçalho gov.br, hero azul/verde institucional, navegação lateral empresarial, tela ativa de entrada Business, campo de e-mail corporativo pré-preenchido pela sandbox e painel de evidência sanitizada visíveis. | `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-30-46_5449.webp` |

## Observações

As duas rotas exibem a base sandbox `https://api.sandbox.drumwave.com.br` e indicam que credenciais permanecem somente no servidor. A navegação lateral separa acesso, onboarding, carteira de dados, mercado/planos, financeiro e configurações, cobrindo telas públicas, telas bloqueadas por KYC e telas internas inferidas por bundles e pela jornada de 17 passos. O estado inicial informa zero chamadas OK porque nenhuma ação de API foi disparada durante a validação visual passiva.

## Validação complementar de responsividade e acessibilidade

| Verificação | Rotas | Resultado |
|---|---|---|
| Capturas responsivas | `/personal-govbr` e `/business-govbr` | Geradas capturas em 390×900, 768×1024 e 1366×900 para as duas rotas, sem falha de renderização do Chromium headless. Arquivos salvos em `/home/ubuntu/screenshots/govbr-responsive/`. |
| Elementos focáveis com nome acessível | `/business-govbr` | 17 elementos focáveis visíveis; 0 sem nome acessível; 0 inputs sem label associado. |
| Elementos focáveis com nome acessível | `/personal-govbr` | 17 elementos focáveis visíveis; 0 sem nome acessível; 0 inputs sem label associado. |

A validação foi básica e local. Ela confirma renderização em três larguras, presença de labels em inputs e nomes acessíveis nos elementos focáveis visíveis. Testes automatizados avançados de WCAG, leitores de tela e navegação completa por teclado em todos os estados dinâmicos ainda podem ser executados em uma etapa de QA dedicada, se necessário.

## Limitação registrada sobre áreas pós-KYC

As áreas internas autenticadas pós-KYC foram reproduzidas no novo front-end GovBR por inferência controlada: análise das telas públicas, textos/labels e bundles disponíveis, além do roteiro de 17 passos e dos procedimentos de API já implementados localmente. Não houve navegação autenticada real além do bloqueio de verificação Persona/KYC no ambiente externo, porque isso dependeria de validação biométrica/documental em homologação.

## Validação específica de teclado, foco e contraste

| Verificação | Personal GovBR | Business GovBR |
|---|---:|---:|
| Elementos focáveis visíveis avaliados | 17 | 17 |
| Elementos focáveis sem nome acessível | 0 | 0 |
| Inputs visíveis sem `label[for]` associado | 0 | 0 |
| Primeiros 10 controles com foco programático aplicado | OK | OK |
| Controles avaliados com semântica nativa de teclado (`a`, `button`, `input`) | OK | OK |
| Foco visível em links principais | `3px solid rgb(255, 205, 7)` | `3px solid rgb(255, 205, 7)` |
| Contraste texto branco sobre azul escuro `#071D41` | 16.32:1, passa AA | 16.32:1, passa AA |
| Contraste selo amarelo `#FFCD07` com texto azul escuro `#071D41` | 11.91:1, passa AA | 11.91:1, passa AA |
| Contraste botão azul Personal `#1351B4` com texto branco | 7.14:1, passa AA | Não aplicável |
| Contraste botão verde Business `#168821` com texto branco | Não aplicável | 4.62:1, passa AA |

A checagem de teclado confirmou que os controles visíveis são nativamente acionáveis por teclado por estarem implementados como `a`, `button` ou `input`, com labels textuais. Os resultados completos das execuções foram salvos em `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-33-46_897.txt` e `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-34-05_837.txt`.

## Evidência de teste real por teclado

| Rota | Sequência | Evidência observada |
|---|---|---|
| `/business-govbr` | `Tab` seguido de `Enter` | O foco real entrou em botão lateral “Produtos de dados”; `Enter` ativou a tela correspondente e a rota espelhada mudou para `/products`. Registro de eventos salvo em `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-35-19_859.txt`. |
| `/personal-govbr` | `Tab` seguido de `Enter` | O foco real entrou no link superior “Jornada integrada”; `Enter` ativou o link e navegou para a página inicial `/`, confirmando ativação real por teclado em controle de navegação. Captura gerada em `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-36-19_8074.webp`. |

| `/personal-govbr` | foco programático em botão real seguido de `Espaço` | O botão lateral “Solicitações de dados” recebeu foco; a tecla Espaço disparou `keydown` e `click` nativo, trocando a tela para “Solicitações de dados” e rota espelhada `/requests`. Registro salvo em `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-37-03_281.txt`; captura salva em `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-36-56_2963.webp`. |

Com esses testes adicionais, há evidência de uso real de `Tab`, `Enter` e `Espaço` em controles principais das rotas GovBR. A ativação por teclado foi observada tanto em navegação por link quanto em botões de alternância de tela, mantendo foco visível e sem perda de contexto aparente.

| `/personal-govbr` | foco em “Solicitações de dados” seguido de `Shift+Tab` | O foco reverso real saiu de “Solicitações de dados” para “Painel da carteira”, comprovando ordem reversa coerente no agrupamento lateral. Registro salvo em `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-38-06_214.txt`; captura salva em `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-37-59_8917.webp`. |

| `/business-govbr` | foco em “Produtos de dados” seguido de `Shift+Tab` e `Espaço` | O foco reverso real saiu de “Produtos de dados” para “Schemas, datasets e databases”; em seguida, Espaço disparou `keydown` e `click` nativos no botão focado, alterando a tela para “Schemas, datasets e databases” e rota espelhada `/schemas-datasets`. Registro salvo em `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-38-55_147.txt`; captura salva em `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-38-49_4037.webp`. |

A bateria final cobre `Tab`, `Shift+Tab`, `Enter` e `Espaço` em rotas Personal e Business. A cobertura de `Enter` foi registrada em navegação/controle da Business e da Personal; a cobertura de `Espaço` foi registrada em botões laterais funcionais de ambas as rotas; e a cobertura de `Shift+Tab` confirmou ordem reversa coerente nos grupos laterais das duas experiências.

| `/business-govbr` | foco em “Produtos de dados” seguido de `Enter` | O evento real de teclado registrou `keydown` de Enter e `click` nativo no botão “Produtos de dados”, com mudança verificável da rota espelhada de `/SCHEMAS-DATASETS` para `/PRODUCTS`. Registro salvo em `/home/ubuntu/console_outputs/exec_result_2026-05-04_20-40-02_965.txt`; captura salva em `/home/ubuntu/screenshots/3000-i9jv60e6uzvu23j_2026-05-04_20-39-57_5161.webp`. |
