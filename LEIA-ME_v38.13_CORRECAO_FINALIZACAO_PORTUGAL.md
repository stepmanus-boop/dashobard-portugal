# STEP Dashboard Portugal v38.13

## Correção aplicada

A versão v38.12 herdou do painel Brasil v37.83 uma regra de finalização criada para o Tracking brasileiro. No Tracking Portugal, essa regra fazia uma BSP/ISO ser tratada como concluída quando existia `Project Finish Date` ou percentual geral em 100%, mesmo havendo etapas produtivas ou logísticas abaixo de 100%.

O efeito era:

- todos os projetos exibidos como `Completed`;
- `Current stage` exibida como `Sent`;
- `% Individual` e `% Overall` forçados para 100%;
- peso soldado igual ao peso planejado;
- cards de iniciados, não iniciados, produção, qualidade e pintura zerados.

## Regra restaurada para Portugal

Uma BSP/ISO só é finalizada quando a evidência de conclusão é coerente com as etapas carregadas. Se existir qualquer etapa produtiva/logística com progresso abaixo de 100%, o sistema preserva o andamento real e não força os indicadores para 100%.

Foram corrigidos três pontos em `netlify/functions/projects.js`:

1. finalização das ISOs/linhas filhas;
2. finalização da linha raiz da BSP;
3. consolidação final da BSP após o rollup das ISOs.

## Cache existente

O cache `projects:PT:current` gerado pela v38.12 contém os dados já forçados para 100%. Depois de publicar esta versão:

1. abra o painel Portugal;
2. faça login como administrador;
3. clique em **UPDATE NOW**;
4. aguarde a atualização terminar;
5. pressione `Ctrl + F5` uma vez.

O botão manual usa `force=1` e reconstrói o cache a partir do Smartsheet Portugal, mesmo que a versão da planilha não tenha mudado.

## Não alterado

- login Portugal;
- usuários `PT`;
- cache `projects:PT:current`;
- IDs e variáveis Smartsheet Portugal;
- Supabase/RLS;
- QR Codes e apontamentos PT;
- site Brasil.

## Validações

- sintaxe de todos os arquivos JavaScript;
- `npm run lint`;
- integridade do ZIP;
- confirmação de que a regra de Portugal voltou a bloquear conclusão quando existem etapas abertas.
