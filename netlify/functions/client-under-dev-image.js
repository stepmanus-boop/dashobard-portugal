// Netlify function: proxy das imagens do Smartsheet para Projetos em Desenvolvimento – Yinson.
// Aceita attachment id direto OU rowId. Quando recebe rowId, localiza os anexos de imagem da linha
// e redireciona para a URL temporária do Smartsheet. O token nunca vai para o navegador.

const API_BASE = process.env.SMARTSHEET_API_BASE || 'https://api.smartsheet.com/2.0';
const REQUEST_TIMEOUT_MS = Number(process.env.SMARTSHEET_REQUEST_TIMEOUT_MS || process.env.SMARTSHEET_FETCH_TIMEOUT_MS || 20000);

function getToken() {
  return process.env.SMARTSHEET_API_KEY_PT
    || process.env.SMARTSHEET_TOKEN_PT
    || process.env.SMARTSHEET_ACCESS_TOKEN_PT
    || process.env.SMARTSHEET_API_TOKEN_PT
    || process.env.SMARTSHEET_BEARER_TOKEN_PT
    || process.env.SMARTSHEET_PAT_PT
    || process.env.SMARTSHEET_PERSONAL_ACCESS_TOKEN_PT
    || process.env.SMARTSHEET_API_KEY
    || process.env.SMARTSHEET_TOKEN
    || process.env.SMARTSHEET_ACCESS_TOKEN
    || process.env.SMARTSHEET_API_TOKEN
    || process.env.SMARTSHEET_BEARER_TOKEN
    || process.env.SMARTSHEET_PAT
    || process.env.SMARTSHEET_PERSONAL_ACCESS_TOKEN
    || '';
}

function unique(values) {
  return Array.from(new Set((values || []).flatMap((item) => String(item || '').split(',')).map((v) => v.trim()).filter(Boolean)));
}

function getCandidateSheetIds(event) {
  const qs = event.queryStringParameters || {};
  return unique([
    qs.sheetId,
    qs.sheetIds,
    process.env.SMARTSHEET_YINSON_UNDER_DEV_SHEET_ID,
    process.env.SMARTSHEET_UNDER_DEV_SHEET_ID,
    process.env.SMARTSHEET_CLIENT_UNDER_DEV_SHEET_ID,
    process.env.SMARTSHEET_YINSON_SHEET_ID,
    process.env.SMARTSHEET_SHEET_ID_YINSON,
    process.env.SMARTSHEET_SHEET_IDS_LIST,
    process.env.SMARTSHEET_SHEET_ID_PT,
    process.env.SMARTSHEET_TRACKING_SHEET_ID_PT,
    process.env.SMARTSHEET_SHEET_ID_PT,
    process.env.SMARTSHEET_TRACKING_SHEET_ID_PT,
    process.env.SMARTSHEET_SHEET_ID,
  ]);
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch (_) { payload = text; }
    if (!response.ok) {
      const error = new Error(`Smartsheet HTTP ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function isImageAttachment(att) {
  const mime = String(att?.mimeType || '').toLowerCase();
  const name = String(att?.name || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(name);
}

async function getAttachmentDetail(headers, attachmentId, sheetIds) {
  for (const sheetId of sheetIds) {
    try {
      const detail = await fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}/attachments/${encodeURIComponent(attachmentId)}`, { headers });
      if (detail?.url) return detail;
    } catch (_) {}
  }
  return fetchJson(`${API_BASE}/attachments/${encodeURIComponent(attachmentId)}`, { headers });
}

async function getRowImageAttachment(headers, rowId, sheetIds, imageIndex) {
  for (const sheetId of sheetIds) {
    try {
      const payload = await fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}/rows/${encodeURIComponent(rowId)}/attachments`, { headers });
      const images = (payload?.data || []).filter(isImageAttachment);
      if (images.length) {
        const safeIndex = Math.max(0, Math.min(Number(imageIndex || 0), images.length - 1));
        return { attachment: images[safeIndex], sheetId };
      }
    } catch (_) {}
  }
  return null;
}

exports.handler = async (event) => {
  const API_KEY = getToken();
  if (!API_KEY) {
    return { statusCode: 500, body: 'Smartsheet token not configured. Configure SMARTSHEET_API_KEY_PT, SMARTSHEET_TOKEN_PT, SMARTSHEET_API_KEY or SMARTSHEET_TOKEN in Netlify.' };
  }

  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const rowId = qs.rowId;
  if (!id && !rowId) {
    return { statusCode: 400, body: 'Missing attachment id or rowId' };
  }

  const headers = { Authorization: `Bearer ${API_KEY}` };
  const sheetIds = getCandidateSheetIds(event);

  try {
    let detail = null;
    if (id) {
      detail = await getAttachmentDetail(headers, id, sheetIds);
    } else if (rowId) {
      const rowImage = await getRowImageAttachment(headers, rowId, sheetIds, qs.imageIndex);
      if (!rowImage?.attachment?.id) {
        return { statusCode: 404, body: 'Nenhuma imagem encontrada para esta linha.' };
      }
      detail = await getAttachmentDetail(headers, rowImage.attachment.id, [rowImage.sheetId, ...sheetIds]);
    }

    if (detail?.url) {
      return {
        statusCode: 302,
        headers: {
          Location: detail.url,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: '',
      };
    }
    return { statusCode: 404, body: 'URL not found for attachment' };
  } catch (err) {
    return { statusCode: err.status || 500, body: err.message || 'Internal server error' };
  }
};
