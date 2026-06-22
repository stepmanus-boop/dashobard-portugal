# STEP Dashboard v37.76 — Correção de finalização do Tracking

## Problema corrigido
Uma BSP/ISO podia estar marcada no Smartsheet com **Project Finished? = marcado**, **Project Finish Date preenchida** e progressos finais em 100%, mas continuar aparecendo no painel como 25% / Em progresso / Não finalizado.

## Causa localizada
A rotina de consolidação bloqueava a finalização definitiva quando encontrava algum percentual intermediário antigo ou ainda não reconciliado no cache. Além disso, ao finalizar a BSP, o backend atualizava o fluxo e o progresso geral, mas não corrigia os campos exibidos na tabela detalhada (`Final Inspection`, `Package and Delivered` e `Project Finished?`).

## Regra aplicada
- `Project Finished?` marcado é autoritativo.
- `Project Finish Date` preenchida é autoritativa.
- `% Overall Progress` ou `% Individual Progress` em 100% também finaliza a ISO/BSP.
- Percentuais intermediários antigos não podem manter uma BSP explicitamente finalizada como em progresso.
- Para itens finalizados, o payload entregue ao painel reconcilia:
  - `Final Inspection = 100%`
  - `Package and Delivered = 100%`
  - `Project Finished? = Sim`
  - `% Individual Progress = 100%`
  - `% Overall Progress = 100%`
  - status/etapa = `Finalizado`

## Após o deploy
1. Publicar o ZIP em produção.
2. Fazer `Ctrl + F5`.
3. Clicar uma vez em **Atualizar agora** para reconstruir o payload persistente do Supabase com os dados atuais do Smartsheet.
