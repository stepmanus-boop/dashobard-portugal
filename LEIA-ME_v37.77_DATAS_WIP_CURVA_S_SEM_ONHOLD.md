# STEP Dashboard v37.77 — Datas WIP e indicadores sem ON HOLD

## Datas do painel do cliente

- **Início planejado:** `Acceptance Date - PO date to be updated*`
- **Término planejado:** `Contractual PO Date*`
- **Término replanejado:** `Deadline Date as Agreeded with Client*`

A leitura é feita na planilha **Work in Progress - STEP** e vinculada à BSP.

## Regra do término replanejado

- Se estiver vazio, igual ou anterior ao término planejado, fica oculto.
- Só aparece quando for posterior ao término planejado.
- Quando posterior, entra na Curva S como extensão de replanejamento e passa a ser a referência para o desvio de prazo.

## ON HOLD no painel do cliente

- BSPs sinalizadas como ON HOLD continuam disponíveis no detalhamento/listagem.
- Elas são excluídas da Curva S consolidada da carteira.
- Elas são excluídas da Curva S por unidade.
- Elas não entram nos KPIs, gauges, progresso por etapa, totais de peso/tags e indicadores consolidados da carteira/unidade.
- O painel informa quantas BSPs On Hold ficaram fora dos indicadores.

## Pós-deploy

Use **Atualizar agora** uma vez para o backend reler as três colunas do Work in Progress e substituir o payload antigo no cache.
