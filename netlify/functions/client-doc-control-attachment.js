const { requireSession } = require('./_auth');

const API_BASE = process.env.SMARTSHEET_API_BASE || 'https://api.smartsheet.com/2.0';
const TOKEN = process.env.SMARTSHEET_API_KEY_PT
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
const DEFAULT_SHEET_ID = String(
  process.env.SMARTSHEET_DOC_CONTROL_SHEET_ID_PT
  || process.env.SMARTSHEET_DRAWING_DOC_CONTROL_SHEET_ID_PT
  || process.env.SMARTSHEET_DOC_CONTROL_SHEET_ID
  || process.env.SMARTSHEET_DRAWING_DOC_CONTROL_SHEET_ID
  || '5007230554296196'
).trim();
const FETCH_TIMEOUT_MS = Number(process.env.SMARTSHEET_FETCH_TIMEOUT_MS || 20000);

function plain(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: String(body || ''),
  };
}

async function fetchJson(url) {
  if (!TOKEN) throw new Error('Smartsheet token not configured in Netlify.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(4000, FETCH_TIMEOUT_MS));
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`Smartsheet ${response.status}: ${text || 'empty response'}`);
      error.status = response.status;
      throw error;
    }
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
}

async function getAttachmentDetail(attachmentId, sheetId) {
  let firstError = null;
  try {
    return await fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}/attachments/${encodeURIComponent(attachmentId)}`);
  } catch (error) {
    firstError = error;
  }
  try {
    return await fetchJson(`${API_BASE}/attachments/${encodeURIComponent(attachmentId)}`);
  } catch (error) {
    throw firstError || error;
  }
}

exports.handler = async (event) => {
  const auth = requireSession(event);
  if (!auth.ok) return auth.response;

  try {
    const query = event.queryStringParameters || {};
    const attachmentId = String(query.attachmentId || query.id || '').trim();
    const sheetId = String(query.sheetId || DEFAULT_SHEET_ID).trim();
    if (!/^\d+$/.test(attachmentId)) return plain(400, 'Invalid attachment ID.');
    if (!/^\d+$/.test(sheetId)) return plain(400, 'Invalid sheet ID.');

    const detail = await getAttachmentDetail(attachmentId, sheetId);
    const targetUrl = String(detail?.url || '').trim();
    if (!/^https?:\/\//i.test(targetUrl)) return plain(404, 'Attachment URL not available.');

    return {
      statusCode: 302,
      headers: {
        location: targetUrl,
        'cache-control': 'no-store',
      },
      body: '',
    };
  } catch (error) {
    return plain(500, error?.message || 'Failed to open attachment.');
  }
};
