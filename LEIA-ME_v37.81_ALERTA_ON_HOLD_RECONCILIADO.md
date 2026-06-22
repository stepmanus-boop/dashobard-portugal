# STEP Dashboard v37.81 — Alerta On Hold reconciliado

## Erro corrigido
A BSP podia aparecer com **Etapa Atual = On Hold** no detalhamento, mas continuar no alerta antigo de Engenharia/Solda/Pintura porque a lista de alertas vinha de um payload de cache anterior.

## Nova regra
- O backend recalcula os alertas toda vez que serve o cache em memória, persistente ou fallback.
- O frontend confere os alertas contra a lista atual de projetos.
- Se a BSP estiver On Hold, o alerta é convertido imediatamente para **On Hold**.
- Se não houver alerta para a BSP On Hold, ele é criado no navegador para não depender de nova gravação do cache.
- Ao retirar o On Hold, o alerta volta para a etapa operacional real se ainda estiver dentro da regra de prazo; caso contrário, sai dos alertas.

## Publicação
Não precisa executar SQL. Publique o ZIP e faça `Ctrl + F5`.
