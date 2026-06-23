# PAINEL PORTUGAL v38.19 — Correção da busca do Doc Control por BSP

## Causa identificada
O popup enviava para a API o texto completo exibido no painel, por exemplo:

`SP-26-065 - PO 060.67073.000026`

A planilha Doc Control armazena a chave da obra na coluna **Primário** apenas como:

`SP-26-065`

Por isso, a comparação não encontrava nenhuma linha.

## Correções
- O frontend agora envia somente o código da BSP.
- A API também normaliza e extrai a BSP, mesmo que receba o texto com PO.
- A busca compara o código com a coluna Primário e com o prefixo do STEP Doc. Number.
- A leitura percorre todas as páginas da planilha `5007230554296196`.
- A tabela continua somente para visualização.

## Teste reproduzido
Consulta recebida:

`SP-26-065 - PO 060.67073.000026`

BSP normalizada:

`SP-26-065`

Resultado: documentos da BSP encontrados corretamente.

## Publicação
Use **Clear cache and deploy site** no Netlify e depois `Ctrl + F5`.
