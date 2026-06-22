# STEP Dashboard v37.79 — Alertas On Hold

## Regra aplicada

- BSP em **On Hold** continua visível em **Prazos em alerta**.
- Enquanto estiver sinalizada como On Hold, ela sai do filtro da etapa operacional anterior e entra somente no filtro **On Hold**.
- Exemplo: BSP em Solda que entra em On Hold sai de **Solda** e passa para **On Hold**.
- Quando o On Hold for removido no Smartsheet e o cache for atualizado, o alerta volta automaticamente ao setor da etapa real (Solda, Calderaria, Qualidade, Pintura ou Logística).
- A assinatura dos alertas agora considera setor/etapa, garantindo que a mudança entre demanda e On Hold seja reconhecida.

## Após publicar

Faça `Ctrl + F5` e clique uma vez em **Atualizar agora** para substituir o payload antigo no cache. Não exige SQL.
