STEP Dashboard Portugal v38.7

Atualização aplicada com base nas correções finais do painel Brasil v36.44 a v36.55:

1. Alertas
- Corrigida rolagem interna dos modais de alertas para visualizar todas as notificações.

2. Portal do Cliente
- Impede abertura do painel vazio em guia anônima/sessão já autenticada.
- Evita usar snapshot/cache antigo como carregamento final quando a base de PO não está pronta.
- Faz revalidação silenciosa dos dados sem refresh automático da página.

3. Visão Executiva / Cronograma do Cliente
- Report do Cliente incorporado dentro da visão executiva principal da BSP.
- Botão renomeado para "Baixar Excel do Cronograma".
- Exportação do Excel do cronograma/painel com layout refinado e sem destaque amarelo.
- Ajuste visual da coluna Primary.
- Clique em Tag/ISO/Spool e em estrutura no detalhamento abre painel individual em nova aba.

4. Validação PCP dos apontamentos
- Corrigido carregamento para não depender da validação completa do Smartsheet na abertura.
- Validação do Tracking roda de forma mais segura, evitando timeout bruto de 30s.
- Melhor localização por BSP/Spool/ISO quando rowId antigo ou campo vazio.
- Corrigida referência interna spoolOwnText.

5. Cache / Service Worker
- Atualizado cache para step-gerencia-pwa-v38-7-portugal-atualizado-v36-55.

Arquivos principais validados com node --check:
- site/app.js
- site/sw.js
- netlify/functions/projects.js
- netlify/functions/client-data.js
- netlify/functions/stage-updates.js
- netlify/functions/_smartsheetTracking.js
