const { jsonResponse, requireSession } = require('./_auth');

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
const DOC_CONTROL_SHEET_ID = String(
  process.env.SMARTSHEET_DOC_CONTROL_SHEET_ID_PT
  || process.env.SMARTSHEET_DRAWING_DOC_CONTROL_SHEET_ID_PT
  || process.env.SMARTSHEET_DOC_CONTROL_SHEET_ID
  || process.env.SMARTSHEET_DRAWING_DOC_CONTROL_SHEET_ID
  || '5007230554296196'
).trim();
const FETCH_TIMEOUT_MS = Number(process.env.SMARTSHEET_FETCH_TIMEOUT_MS || 20000);
const CACHE_MS = Number(process.env.CLIENT_DOC_CONTROL_CACHE_MS || 5 * 60 * 1000);

const globalCache = global.__STEP_CLIENT_DOC_CONTROL_CACHE__ || { bySheet: {} };
global.__STEP_CLIENT_DOC_CONTROL_CACHE__ = globalCache;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function compact(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '');
}

function extractBspKey(value) {
  const original = String(value || '').trim();
  if (!original) return '';
  const withoutPo = original
    .replace(/\s*[-–—]\s*PO\b.*$/i, '')
    .replace(/\s+PO\s+[0-9].*$/i, '')
    .trim();
  const patterns = [
    /\b[A-Z]{1,10}-\d{2,4}-\d{2,8}\b/i,
    /\bBSP\s*[-/]?\s*\d{2,4}\s*[-/]\s*\d{2,8}\b/i,
  ];
  for (const pattern of patterns) {
    const match = withoutPo.match(pattern);
    if (match) return match[0].replace(/\s+/g, '').replace(/\//g, '-').toUpperCase();
  }
  return withoutPo.toUpperCase();
}

function bspKeysEqual(a, b) {
  const left = compact(extractBspKey(a));
  const right = compact(extractBspKey(b));
  return Boolean(left && right && left === right);
}

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value) !== '');
  if (!entries.length) return '';
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

async function apiFetch(path) {
  if (!TOKEN) throw new Error('Smartsheet token not configured in Netlify.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(4000, FETCH_TIMEOUT_MS));
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Smartsheet ${response.status}: ${text || 'empty response'}`);
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

function getCellValue(cell) {
  if (!cell) return '';
  const value = cell.displayValue != null ? cell.displayValue : (cell.value != null ? cell.value : '');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value || '');
    }
  }
  return String(value || '').trim();
}

function buildColumnIndexes(columns = []) {
  const byId = new Map();
  const byNormalized = new Map();
  const byCompact = new Map();
  columns.forEach((column, index) => {
    const title = String(column?.title || '').trim();
    if (!column?.id || !title) return;
    byId.set(String(column.id), { index, title, column });
    const normalized = normalizeText(title);
    const compacted = compact(title);
    if (normalized && !byNormalized.has(normalized)) byNormalized.set(normalized, { index, title, column });
    if (compacted && !byCompact.has(compacted)) byCompact.set(compacted, { index, title, column });
  });
  return { byId, byNormalized, byCompact };
}

function findColumn(indexes, candidates = [], fallbackRegex = null) {
  for (const name of candidates) {
    const normalized = normalizeText(name);
    const compacted = compact(name);
    if (normalized && indexes.byNormalized.has(normalized)) return indexes.byNormalized.get(normalized);
    if (compacted && indexes.byCompact.has(compacted)) return indexes.byCompact.get(compacted);
  }
  if (fallbackRegex) {
    for (const item of indexes.byId.values()) {
      if (fallbackRegex.test(normalizeText(item.title))) return item;
    }
  }
  return null;
}

function buildSheetMetadata(columns = []) {
  const indexes = buildColumnIndexes(columns);
  return {
    primary: findColumn(indexes, ['Primário', 'Primario', 'Primary', 'BSP', 'Project', 'Task Name (BSP, GASP, ICSP,SP)', 'Task Name']),
    clientDocNo: findColumn(indexes, ['Client Doc Nº / PO Number', 'Client Doc No / PO Number', 'Client Doc N° / PO Number', 'Client Doc / PO Number', 'PO Number']),
    book: findColumn(indexes, ['Book']),
    cdrCode: findColumn(indexes, ['CDR Code', 'Cdr Code']),
    seqNumber: findColumn(indexes, ['Seq. Number', 'Seq Number']),
    currentRev: findColumn(indexes, ['Current Rev.', 'Current Rev']),
    stepDocNumber: findColumn(indexes, ['STEP Doc. Number', 'STEP Doc Number', 'Document Number']),
    documentTitle: findColumn(indexes, ['Document Title', 'Doc. Ref.Client / Title', 'Title']),
    status: findColumn(indexes, ['Status']),
    issuedDate: findColumn(indexes, ['Sent to Client Date', 'Date sent to client', 'Issued Date', 'Submission Date', 'Sent Date', 'Date Sent']),
    returnDate: findColumn(indexes, ['Client Return Date', 'Return Date', 'Client comments date', 'Client Comments Date', 'Received Date', 'Approval Date']),
    byIndex: columns.map((column, index) => ({ index, title: String(column?.title || '').trim(), id: String(column?.id || '') })),
  };
}

function pickCellByMeta(cellsById, metaItem) {
  if (!metaItem || !metaItem.column?.id) return '';
  return getCellValue(cellsById.get(String(metaItem.column.id)));
}

function rowMatchesBsp(row, cellsById, meta, bspKey) {
  const primaryValue = pickCellByMeta(cellsById, meta.primary);
  if (bspKeysEqual(primaryValue, bspKey)) return true;

  const stepDocNumber = pickCellByMeta(cellsById, meta.stepDocNumber);
  const stepDocBsp = extractBspKey(stepDocNumber);
  if (bspKeysEqual(stepDocBsp, bspKey)) return true;

  for (const cell of row.cells || []) {
    const value = getCellValue(cell);
    if (!value) continue;
    const valueBsp = extractBspKey(value);
    if (bspKeysEqual(valueBsp, bspKey)) return true;
  }
  return false;
}

function formatRow(row, cellsById, meta) {
  const orderedValues = meta.byIndex.map((item) => ({
    key: item.title,
    value: getCellValue(cellsById.get(item.id)),
  }));
  return {
    rowId: row.id,
    primary: pickCellByMeta(cellsById, meta.primary),
    clientDocNo: pickCellByMeta(cellsById, meta.clientDocNo),
    book: pickCellByMeta(cellsById, meta.book),
    cdrCode: pickCellByMeta(cellsById, meta.cdrCode),
    seqNumber: pickCellByMeta(cellsById, meta.seqNumber),
    currentRev: pickCellByMeta(cellsById, meta.currentRev),
    stepDocNumber: pickCellByMeta(cellsById, meta.stepDocNumber),
    documentTitle: pickCellByMeta(cellsById, meta.documentTitle),
    status: pickCellByMeta(cellsById, meta.status),
    issuedDate: pickCellByMeta(cellsById, meta.issuedDate),
    returnDate: pickCellByMeta(cellsById, meta.returnDate),
    values: orderedValues,
  };
}

async function loadSheetRows(force = false) {
  const cacheEntry = globalCache.bySheet[DOC_CONTROL_SHEET_ID];
  if (!force && cacheEntry && (Date.now() - cacheEntry.loadedAt) < CACHE_MS) return cacheEntry;

  const firstPage = await apiFetch(`/sheets/${encodeURIComponent(DOC_CONTROL_SHEET_ID)}${buildQuery({ level: 2, page: 1, pageSize: 5000, include: 'objectValue' })}`);
  if (!firstPage || !Array.isArray(firstPage.columns) || !Array.isArray(firstPage.rows)) {
    throw new Error('Doc Control sheet returned no rows/columns.');
  }

  const rows = [...firstPage.rows];
  const totalPages = Math.max(1, Number(firstPage.totalPages || 1));
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await apiFetch(`/sheets/${encodeURIComponent(DOC_CONTROL_SHEET_ID)}${buildQuery({ level: 2, page, pageSize: 5000, include: 'objectValue' })}`);
    if (Array.isArray(response?.rows)) rows.push(...response.rows);
  }

  const meta = buildSheetMetadata(firstPage.columns);
  const payload = {
    loadedAt: Date.now(),
    sheetId: String(firstPage.id || DOC_CONTROL_SHEET_ID),
    sheetName: firstPage.name || 'Doc Control',
    meta,
    rows,
  };
  globalCache.bySheet[DOC_CONTROL_SHEET_ID] = payload;
  return payload;
}

exports.handler = async (event) => {
  const auth = requireSession(event);
  if (!auth.ok) return auth.response;

  try {
    const query = event.queryStringParameters || {};
    const requestedBsp = String(query.bsp || query.project || '').trim();
    const bsp = extractBspKey(requestedBsp);
    if (!bsp) return jsonResponse(400, { ok: false, error: 'BSP not informed.' });

    const cache = await loadSheetRows(String(query.force || '') === '1');
    const items = [];

    for (const row of cache.rows || []) {
      const cellsById = new Map();
      for (const cell of row.cells || []) {
        cellsById.set(String(cell.columnId), cell);
      }
      if (!rowMatchesBsp(row, cellsById, cache.meta, bsp)) continue;
      items.push(formatRow(row, cellsById, cache.meta));
    }

    items.sort((a, b) => {
      const cdr = String(a.cdrCode || '').localeCompare(String(b.cdrCode || ''), undefined, { numeric: true, sensitivity: 'base' });
      if (cdr) return cdr;
      const seq = String(a.seqNumber || '').localeCompare(String(b.seqNumber || ''), undefined, { numeric: true, sensitivity: 'base' });
      if (seq) return seq;
      return String(a.stepDocNumber || '').localeCompare(String(b.stepDocNumber || ''), undefined, { numeric: true, sensitivity: 'base' });
    });

    return jsonResponse(200, {
      ok: true,
      bsp,
      requestedBsp,
      total: items.length,
      sheetId: cache.sheetId,
      sheetName: cache.sheetName,
      rows: items,
      columns: {
        primary: cache.meta.primary?.title || 'Primário',
        clientDocNo: cache.meta.clientDocNo?.title || 'Client Doc Nº / PO Number',
        book: cache.meta.book?.title || 'Book',
        cdrCode: cache.meta.cdrCode?.title || 'CDR Code',
        seqNumber: cache.meta.seqNumber?.title || 'Seq. Number',
        currentRev: cache.meta.currentRev?.title || 'Current Rev.',
        stepDocNumber: cache.meta.stepDocNumber?.title || 'STEP Doc. Number',
        documentTitle: cache.meta.documentTitle?.title || 'Document Title',
        status: cache.meta.status?.title || 'Status',
        issuedDate: cache.meta.issuedDate?.title || 'Issued Date',
        returnDate: cache.meta.returnDate?.title || 'Return Date',
      },
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error?.message || 'Failed to load Doc Control.' });
  }
};
