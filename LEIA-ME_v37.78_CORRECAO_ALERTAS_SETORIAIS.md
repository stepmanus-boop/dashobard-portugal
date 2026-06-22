# v37.78 — Correção dos alertas setoriais

## Problema identificado
O total de alertas e os filtros de severidade fechavam, mas os filtros por setor não.
Alertas cujo setor amplo vinha como `Produção`, `Qualidade` ou `Suprimento` não eram
convertidos para os cinco grupos exibidos no modal. Por isso alguns alertas existiam em
`Tudo`, mas desapareciam de Solda, Calderaria e Qualidade.

## Correção
- A classificação usa primeiro a etapa/status real do projeto.
- Full Welding / Solda -> Solda.
- Pré-montagem, corte, separação, suprimento e demais fases iniciais -> Calderaria.
- TH, END/NDE, dimensional e inspeções -> Qualidade.
- Pintura/coating -> Pintura.
- Unitização, preparado/aguardando envio -> Logística.
- O frontend usa a mesma chave para contar e filtrar.
- Cache antigo com setores amplos também é normalizado.
- Se surgir uma etapa não reconhecida, aparece o filtro `Outros`, evitando diferença silenciosa.

## Resultado esperado para a tela apresentada
Os 21 alertas passam a ser distribuídos sem perda entre os filtros setoriais.
A soma dos setores sempre será igual ao número de `Todos os setores`.
