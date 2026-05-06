# Verificação visual: headers, Variáveis e persistência

Em 2026-05-06, o preview foi aberto nas rotas `/business-govbr` e `/personal-govbr` para conferir os ajustes solicitados.

Na Business dWallet, o header superior exibiu `Business dWallet GovBR` em uma única linha legível, com o selo `GOV.BR · CARTEIRA DIGITAL DE DADOS` acima e botões de navegação à direita. O texto não apareceu cortado no viewport desktop. A faixa principal informou que as respostas ficam preservadas ao alternar entre Home, PdW e BdW até a limpeza explícita. A antiga aba Credenciais foi exibida como `Variáveis`, e o botão de limpeza aparece como `Limpar variáveis de resposta do teste`.

Na Personal dWallet, o header superior exibiu `Personal dWallet GovBR` de forma legível, sem truncamento aparente. O hero principal quebrou a frase `Carteira cidadã para controlar, autorizar e monetizar dados.` em linhas completas dentro da área disponível, sem corte visual. A aba `Variáveis` também apareceu corretamente e o painel superior reforçou a persistência das respostas entre Home, PdW e BdW.

Após a primeira verificação visual, foi encontrada e corrigida uma microcópia remanescente que ainda dizia que retornos de API seriam salvos na aba `Credenciais`; o texto agora informa `Variáveis`. Também foi corrigida a orientação específica da criação de solicitação de dados para informar que o ID da BdW é salvo em `Variáveis`.

Validações técnicas subsequentes: `pnpm test` passou com 7 arquivos e 64 testes; `pnpm build` concluiu com sucesso. O aviso de chunk acima de 500 kB é apenas recomendação de otimização do Vite/Rollup e não bloqueia a entrega.
