# STEP Dashboard Portugal v38.12

Versão Portugal criada sobre a base funcional Brasil v37.83, mantendo os sites separados.

## Escopo fixo deste ZIP

- Site/região: `PT`
- Cache principal: `projects:PT:current`
- Cache Yinson: `yinson:under-dev:PT:current`
- Apontamentos PCP: somente `stage_updates.region = 'PT'`
- Edições do Painel do Cliente: somente `client_bsp_overrides.region = 'PT'`
- QR Codes: somente `iso_qr_codes.region = 'PT'`
- Usuários criados/editados neste site: `operation_region/site_key/portal_site = 'PT'`
- Idioma inicial: inglês, com seletor English / Português / Español

## Smartsheet

O código prioriza as variáveis Portugal já configuradas no projeto Netlify:

- `SMARTSHEET_SHEET_ID_PT` ou `SMARTSHEET_TRACKING_SHEET_ID_PT`
- `SMARTSHEET_SHEET_NAME_PT`
- `SMARTSHEET_WIP_STEP_SHEET_ID_PT`
- `SMARTSHEET_WIP_STEP_SHEET_NAME_PT`
- `SMARTSHEET_API_KEY_PT` ou `SMARTSHEET_TOKEN_PT`

As variáveis genéricas anteriores continuam aceitas como fallback, para não quebrar o site Portugal que já estava funcionando.

Yinson e Drawing Control não usam IDs brasileiros fixos. Quando existirem no ambiente Portugal, use:

- `SMARTSHEET_YINSON_UNDER_DEV_SHEET_ID_PT`
- `SMARTSHEET_DRAWING_CONTROL_SHEET_ID_PT`

As variáveis genéricas antigas desses módulos também continuam compatíveis.

## Publicação

1. Faça backup do deploy Portugal atual.
2. Publique este ZIP somente no site/repositório Portugal.
3. Mantenha as variáveis de ambiente existentes do Netlify Portugal.
4. Use **Clear cache and deploy site**.
5. Entre com um usuário Portugal e clique em **Update now / Atualizar agora**.
6. Confirme no Supabase que `projects:PT:current` passou de 0 para 1.

## Banco

O arquivo `SQL-INTEGRACAO-BRASIL-PORTUGAL-v38.12.sql` acompanha o ZIP para conferência. Ele só precisa ser executado caso o banco ainda não aceite:

- `projects:PT:current`
- `yinson:under-dev:PT:current`
- conflito único de `client_bsp_overrides` por `(region, project_row_id)`
- separação regional dos QR Codes

Pela consulta apresentada antes da geração deste ZIP, as colunas regionais já existem e os usuários PT já estão cadastrados.

## Melhorias herdadas da base Brasil v37.83

- finalização reconciliada com o Tracking;
- datas WIP e Curva S sem contabilizar On Hold;
- alertas setoriais corrigidos;
- alertas On Hold reconciliados e sempre visíveis;
- organização do Controle PCP pela coluna Etapa Atual;
- cache e atualização agendada;
- QR Codes automáticos por ISO;
- impressão Zebra em três posições fixas;
- melhorias recentes do Portal do Cliente, imagens, Yinson e traduções.

## Validações executadas

- sintaxe de todos os arquivos `.js` e `.mjs`;
- ausência de cache `projects:BR:current` no código ativo;
- ausência de região fixa BR nas gravações do site Portugal;
- ausência de IDs fixos das planilhas Brasil no código ativo;
- fallback operacional substituído pelo snapshot Portugal anterior;
- cache PWA e arquivos estáticos versionados como v38.12.
