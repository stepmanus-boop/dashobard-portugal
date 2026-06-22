# STEP Dashboard v37.80 — Alertas On Hold sempre visíveis

## Correção aplicada

Toda BSP sinalizada como **On Hold** passa a entrar imediatamente em **Prazos em alerta**, mesmo quando:

- o término planejado está a mais de 5 dias;
- não existe início de fabricação informado;
- não existe término planejado;
- existem datas ou percentuais antigos conflitantes no Tracking.

## Regra operacional

- Ao entrar em On Hold, a BSP sai temporariamente do setor operacional anterior (Solda, Calderaria, Qualidade, Pintura ou Logística).
- O alerta passa a aparecer apenas no filtro **On Hold**.
- Ao remover o On Hold no Smartsheet, a BSP deixa o filtro On Hold e volta automaticamente para o setor correspondente à etapa real.
- On Hold vencido é classificado como urgente; On Hold sem atraso permanece como médio.

## Após o deploy

1. Faça `Ctrl + F5`.
2. Clique uma vez em **Atualizar agora** para substituir o payload antigo no cache do Supabase.
3. Abra **Prazos em alerta** e confirme o filtro **On Hold**.

Não é necessário executar SQL.
