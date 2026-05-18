PAINEL PORTUGAL v38.8 - BASE COMPLETA BRASIL v36.55

Esta versão foi montada usando a versão final do Brasil v36.55 como base completa e convertendo as fontes/ambiente para Portugal.

Inclui as correções completas aplicadas no Brasil:
- Portal do Cliente com opção/visão executiva da carteira;
- proteção contra painel do cliente vazio;
- carregamento de PO sem refresh automático;
- report dentro da visão executiva;
- botão Baixar Excel do Cronograma;
- Excel completo do cronograma/painel;
- Primary corrigido;
- painel individual em nova aba para tag/ISO/spool/estrutura;
- rolagem dos alertas;
- correções da Validação PCP/apontamentos;
- validação do Tracking em segundo plano e proteção contra timeout;
- cache/service worker atualizado.

Conversão para Portugal:
- projetos.js usa SMARTSHEET_SHEET_NAME_PT / SMARTSHEET_SHEET_ID_PT;
- Work in Progress usa SMARTSHEET_WIP_STEP_SHEET_NAME_PT / SMARTSHEET_WIP_STEP_SHEET_ID_PT;
- _smartsheetTracking.js valida apontamentos no Tracking PT;
- login/admin criam e autenticam usuários no ambiente PT;
- client_bsp_overrides usa região PT.
