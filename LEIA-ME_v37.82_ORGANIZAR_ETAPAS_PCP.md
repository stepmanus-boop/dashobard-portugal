# STEP Dashboard v37.82 — Organizar Etapas no PCP

## Alteração

Foi incluído no painel principal um botão **Organizar etapas**, visível para usuários PCP e administradores.

Ao ativar:

- reorganiza somente as linhas da tabela pela coluna **Etapa Atual**;
- agrupa BSPs que estão na mesma etapa, como todos os itens **On Hold** juntos;
- respeita a ordem operacional das etapas;
- não altera busca, cliente, tipo, semana, status, cards, indicadores ou quantidade de projetos;
- dentro da mesma etapa, mantém desempate pelo término planejado.

Ao clicar novamente em **Etapas organizadas**, a tabela volta para a ordem padrão por término planejado.

Não requer SQL. Após o deploy, use Ctrl + F5 para carregar o Service Worker v37.82.
