# PAINEL PORTUGAL v38.14 — Finalização estrita pelo checkbox

## Problema corrigido

O painel ainda classificava todos os projetos como concluídos porque alguns caminhos internos aceitavam como conclusão:

- `% Overall Progress` ou `% Individual Progress` em 100%;
- `Project Finish Date` preenchida;
- status textual `Complete`;
- estado calculado anteriormente como `completed`.

Na planilha Portugal existem linhas com 100% que continuam `In Progress` e com o checkbox desmarcado. Essas linhas não podem ser consideradas finalizadas.

## Regra aplicada

A fonte de verdade passa a ser a coluna checkbox **Project Finished?**:

- checkbox marcado: TAG/ISO concluída;
- checkbox desmarcado: TAG/ISO aberta, mesmo com 100% ou data preenchida;
- BSP com TAGs/ISOs: só é concluída quando todas as TAGs/ISOs estão marcadas;
- BSP sem filhos: utiliza o checkbox da própria linha raiz.

`Project Finish Date`, percentuais e textos de status continuam disponíveis para exibição, mas não finalizam o projeto.

## Após publicar

1. Publicar o ZIP no site/repositório Portugal.
2. Entrar como administrador.
3. Clicar em **UPDATE NOW** para reconstruir `projects:PT:current`.
4. Aguardar a atualização terminar.
5. Fazer `Ctrl + F5`.
6. Confirmar que linhas de 100% com checkbox desmarcado aparecem como abertas.

Não é necessário apagar tabelas ou executar SQL.
