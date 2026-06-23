# PAINEL PORTUGAL v38.17

## Correção aplicada

1. O site Portugal passa a ler obrigatoriamente o Tracking oficial **7664451754872708**.
   - Não usa mais `SMARTSHEET_SHEET_ID` genérico.
   - Não procura outra planilha por nome.
   - Leitura, escrita PCP e imagens usam o mesmo ID.

2. A conclusão da BSP agora é bloqueada pelas linhas-fonte reais do Smartsheet.
   - percentual individual ou geral abaixo de 100%;
   - status `In Progress`, `Ongoing` ou `Open`;
   - checkbox `Project Finished?` explicitamente desmarcado.

3. O cache antigo é rejeitado quando:
   - foi criado por outra sheet;
   - foi criado por uma versão lógica anterior.

4. Diagnóstico incluído no payload:
   - linhas abaixo de 100%;
   - linhas `In Progress`;
   - checkboxes desmarcados;
   - BSPs bloqueadas pelas linhas-fonte.

## Após o deploy

1. Entrar como administrador.
2. Clicar em **UPDATE NOW**.
3. Aguardar a sincronização completa.
4. Fazer `Ctrl + F5`.

O cache esperado é `projects:PT:current`, com `meta.sheetId = 7664451754872708` e `meta.logicVersion = pt-38.17-sheet-7664451754872708-source-row-guard`.
