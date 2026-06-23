# PAINEL PORTUGAL v38.20 — Doc Control completo por BSP e anexos

## Correções
- A BSP `26-065` é normalizada para `SP-26-065` antes da consulta.
- A API também compara o trecho numérico da BSP, portanto `26-065`, `SP-26-065` e documentos como `SP-26-065-AA-0001` pertencem ao mesmo conjunto.
- Todas as linhas da BSP são localizadas mesmo quando o código aparece em outra coluna da planilha.

## Informações exibidas
- Tabela principal do Doc Control.
- Número real da linha no Smartsheet.
- Todos os campos preenchidos de cada linha em **Ver tudo**.
- Status e datas.
- Quantidade de anexos por linha.

## Anexos
- Imagens com miniatura.
- PDFs com abertura em nova guia.
- ZIP, Office e demais arquivos com link para abrir/baixar.
- Anexos de linha e anexos em discussões/comentários.

## Planilha
- Smartsheet: `5007230554296196`

## Funções novas/alteradas
- `netlify/functions/client-doc-control.js`
- `netlify/functions/client-doc-control-attachment.js`
- `site/js/app-02-client-portal.js`

## Publicação
Use **Clear cache and deploy site** no Netlify e depois pressione `Ctrl + F5`.
