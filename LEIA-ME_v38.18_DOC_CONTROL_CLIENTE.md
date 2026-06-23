# PAINEL PORTUGAL v38.18 — Doc Control no painel do cliente

## O que foi incluído
- Novo botão **Doc control** dentro do popup da BSP no painel do cliente.
- Ao clicar, abre um **popup em modo somente leitura** com os documentos vinculados à BSP.
- Os dados são lidos da planilha Smartsheet **5007230554296196**.

## Como funciona
- Endpoint novo: `/api/client-doc-control`
- Filtro por BSP a partir do código da obra aberta no painel do cliente.
- Exibição em tabela com as colunas principais:
  - Primário
  - Client Doc Nº / PO Number
  - Book
  - CDR Code
  - Seq. Number
  - Current Rev.
  - STEP Doc. Number
  - Document Title
  - Status
  - Issued Date
  - Return Date

## Arquivos alterados
- `netlify/functions/client-doc-control.js`
- `site/js/app-02-client-portal.js`
- `site/index.html`
- `site/app.js`
- `site/sw.js`

## Publicação
Após publicar, use **Clear cache and deploy site** no Netlify.
Depois, faça `Ctrl + F5` no navegador.
