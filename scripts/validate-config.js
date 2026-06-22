const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const smartsheetKeys = [
  'SMARTSHEET_API_KEY_PT',
  'SMARTSHEET_TOKEN_PT',
  'SMARTSHEET_ACCESS_TOKEN_PT',
  'SMARTSHEET_API_TOKEN_PT',
  'SMARTSHEET_BEARER_TOKEN_PT',
  'SMARTSHEET_PAT_PT',
  'SMARTSHEET_PERSONAL_ACCESS_TOKEN_PT',
  'SMARTSHEET_API_KEY',
  'SMARTSHEET_TOKEN',
  'SMARTSHEET_ACCESS_TOKEN',
  'SMARTSHEET_API_TOKEN',
  'SMARTSHEET_BEARER_TOKEN',
  'SMARTSHEET_PAT',
  'SMARTSHEET_PERSONAL_ACCESS_TOKEN',
];
const sheetKeys = ['SMARTSHEET_SHEET_ID_PT', 'SMARTSHEET_TRACKING_SHEET_ID_PT', 'SMARTSHEET_SHEET_ID'];
const missing = required.filter((name) => !process.env[name]);
const hasSmartsheetEnv = smartsheetKeys.some((name) => !!process.env[name]);
const hasTrackingSheet = sheetKeys.some((name) => !!process.env[name]);
if (!hasSmartsheetEnv) {
  console.warn('Aviso: configure SMARTSHEET_API_KEY_PT/SMARTSHEET_TOKEN_PT ou a variável genérica equivalente no Netlify Portugal.');
}
if (!hasTrackingSheet) {
  console.warn('Aviso: configure SMARTSHEET_SHEET_ID_PT ou SMARTSHEET_TRACKING_SHEET_ID_PT no Netlify Portugal.');
}
if (missing.length) {
  console.error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Configuração mínima do painel Portugal OK.');
