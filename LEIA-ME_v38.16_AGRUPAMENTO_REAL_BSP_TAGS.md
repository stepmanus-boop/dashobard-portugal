# PAINEL PORTUGAL v38.16 — agrupamento real das TAGs/ISOs

## Problema confirmado

O cache reconhecia as 60 linhas principais das BSPs, mas diversas linhas operacionais em andamento não estavam sendo vinculadas à BSP correta. Isso ocorria principalmente quando:

- a TAG/ISO repetia o código da BSP com um sufixo, como `ISO-001`;
- o campo `Project` da linha operacional estava vazio;
- a linha estava dentro de uma hierarquia intermediária do Smartsheet;
- a linha possuía 3%, 9%, 17%, 48%, 49%, 65%, 68%, 97% ou 99% e status `In Progress`;
- a linha principal da BSP estava marcada como concluída.

Como as linhas abertas eram ignoradas, o painel enxergava apenas as linhas principais concluídas e zerava todos os cards operacionais.

## Correção

A leitura Portugal foi reconstruída para associar as linhas por três critérios, nesta ordem:

1. hierarquia real `parentId` do Smartsheet;
2. chave-base normalizada da BSP, aceitando referências com sufixos de ISO/TAG;
3. ordem física do bloco na planilha, usando a última BSP aberta para linhas operacionais sem Project.

Regras de finalização:

- uma TAG/ISO com percentual inferior a 100% permanece aberta;
- uma TAG/ISO com status `In Progress`, `Ongoing` ou `Open` permanece aberta;
- o checkbox sozinho não conclui uma linha que ainda possui evidência explícita de andamento;
- a BSP só é concluída quando todas as TAGs/ISOs vinculadas estão concluídas;
- BSPs realmente finalizadas continuam finalizadas.

## Cache

A versão lógica foi alterada para:

`pt-38.16-robust-bsp-tag-grouping`

Isso força a reconstrução do cache `projects:PT:current` após o deploy.

## Validações executadas

Foram testados:

- raiz em 100% marcada + TAGs em 99%, 97%, 68%, 65%, 49%, 17%, 9% e 3%;
- TAG com código `SP-24-087-ISO-001`;
- TAG com Project vazio;
- TAG com hierarquia `parentId`;
- BSPs de códigos semelhantes, como `25-732` e `25-732-03`;
- BSP realmente concluída sem TAG aberta.

O resultado esperado foi confirmado: a BSP mista permanece iniciada, enquanto BSPs totalmente concluídas permanecem finalizadas.
