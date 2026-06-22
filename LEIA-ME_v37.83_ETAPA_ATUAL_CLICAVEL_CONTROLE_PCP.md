# STEP Dashboard v37.83 — Etapa Atual clicável no Controle PCP

## Alteração

No modal **Controle PCP / BSPs por prazo**, o cabeçalho **Etapa Atual** passou a ser clicável.

- Primeiro clique: organiza somente as linhas daquela tabela/cliente pela etapa atual.
- Projetos **On Hold** ficam agrupados no início.
- As demais etapas seguem a sequência operacional já usada pelo painel.
- Segundo clique: retorna à ordem original por término planejado/prazo.
- O agrupamento por cliente, filtros, cards, indicadores e dados não são alterados.
- O botão separado **Organizar etapas** da tela principal foi removido, pois o controle agora fica no local correto.

## Publicação

Não há alteração de banco de dados e não é necessário executar SQL. Após o deploy, use `Ctrl + F5` uma vez.
