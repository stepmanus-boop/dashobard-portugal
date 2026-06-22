# PAINEL PORTUGAL v38.15 — correção definitiva de finalização em massa

## Causa localizada

A planilha Portugal possui blocos em que a linha-mãe contém o Project/BSP, mas algumas linhas operacionais abaixo ficam sem `Project` e sem `parentId` na resposta da API do Smartsheet.

Essas linhas tinham percentuais como 9%, 17%, 48%, 65%, 97% e 99%, porém eram ignoradas pelo agrupamento. Com isso, o painel enxergava apenas a linha-mãe marcada e concluía toda a BSP.

## Correções

- Linhas planas com progresso, status, checkbox ou etapas agora entram na BSP anterior.
- Linhas com `Project` vazio deixam de ser descartadas quando possuem evidência operacional.
- Uma TAG em 9%, 48%, 65%, 97% ou 99% bloqueia a conclusão da BSP.
- Status `In Progress`, `Ongoing`, `Open` ou equivalentes bloqueia conclusão.
- Em duplicidades/revisões da mesma TAG, o registro aberto prevalece sobre um registro histórico concluído.
- Textos `Complete`/`Finished` não são mais aceitos como valor de checkbox.
- O cache recebeu uma revisão lógica (`pt-38.15-flat-operational-rows`), forçando reconstrução após o deploy mesmo que a versão da planilha não tenha mudado.

## Depois do deploy

1. Aguarde o deploy finalizar.
2. Entre como administrador.
3. Clique em **UPDATE NOW** uma vez.
4. Aguarde o horário do cache mudar.
5. Pressione `Ctrl + F5`.

Não é necessário executar SQL.
