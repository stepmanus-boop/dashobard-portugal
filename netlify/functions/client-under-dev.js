// Netlify function: Yinson - Projetos em Desenvolvimento
// Busca a sheet correta pelo Smartsheet, identifica colunas de forma flexível
// e retorna a tabela: VESSEL + WORK ORDER + ID REPAIR + TAG NUMBER + SOB + DESCRIPTION + STATUS + IMAGEM.

const API_BASE = process.env.SMARTSHEET_API_BASE || 'https://api.smartsheet.com/2.0';
const REQUEST_TIMEOUT_MS = Number(process.env.SMARTSHEET_REQUEST_TIMEOUT_MS || process.env.SMARTSHEET_FETCH_TIMEOUT_MS || 20000);
const UNDER_DEV_CACHE_TTL_MS = Number(process.env.YINSON_UNDER_DEV_CACHE_TTL_MS || 60000);
const ROW_ATTACHMENT_FALLBACK_LIMIT = Number(process.env.YINSON_UNDER_DEV_ROW_ATTACHMENT_FALLBACK_LIMIT || 300);
let cachedPayload = null;
let cachedPayloadAt = 0;
let cachedPayloadKey = '';

const TOKEN = process.env.SMARTSHEET_API_KEY
  || process.env.SMARTSHEET_TOKEN
  || process.env.SMARTSHEET_ACCESS_TOKEN
  || process.env.SMARTSHEET_API_TOKEN
  || process.env.SMARTSHEET_BEARER_TOKEN
  || process.env.SMARTSHEET_PAT
  || process.env.SMARTSHEET_PERSONAL_ACCESS_TOKEN
  || '';

const DEFAULT_CANDIDATE_SHEET_IDS = [];
// Painel Portugal: não usar IDs hardcoded do Brasil como fallback.
// Configure SMARTSHEET_YINSON_UNDER_DEV_SHEET_ID / SMARTSHEET_UNDER_DEV_SHEET_ID
// ou deixe a função localizar a sheet por nome via lista de sheets acessíveis.

const FIELD_DEFINITIONS = {
  vessel: {
    label: 'VESSEL',
    aliases: ['vessel', 'vessels', 'platform', 'plataforma', 'unit', 'unidade', 'embarcacao', 'embarcação', 'navio'],
  },
  workOrder: {
    label: 'WORK ORDER',
    aliases: ['work order', 'workorder', 'wo', 'w o', 'work order number', 'work order no', 'work order n', 'ordem de trabalho', 'ordem trabalho'],
  },
  idRepair: {
    label: 'ID REPAIR',
    aliases: ['id repair', 'idrepair', 'repair id', 'repairid', 'id reparo', 'id do reparo', 'reparo id', 'id da reparacao', 'id da reparação'],
  },
  tagNumber: {
    label: 'TAG NUMBER',
    aliases: ['tag number', 'tagnumber', 'tag no', 'tag n', 'tag numero', 'tag número', 'numero tag', 'n tag', 'tag'],
  },
  sob: {
    label: 'SOB',
    aliases: ['sob', 's o b', 's.o.b', 's o b ', 'sob number', 'sob no'],
  },
  description: {
    label: 'DESCRIPTION',
    aliases: ['description', 'descricao', 'descrição', 'desc', 'descritivo', 'scope', 'escopo'],
  },
  status: {
    label: 'STATUS',
    aliases: ['status', 'situacao', 'situação', 'estado', 'stage', 'fase'],
  },
  image: {
    label: 'IMAGEM',
    aliases: ['imagem', 'image', 'images', 'foto', 'fotos', 'photo', 'picture', 'anexo', 'attachment', 'attachments'],
  },
};

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[º°ª]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value) {
  return normalizeTitle(value).replace(/\s+/g, '');
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function buildCacheKey(event) {
  const qs = event.queryStringParameters || {};
  return [
    qs.sheetId || '',
    qs.sheetIds || '',
    process.env.SMARTSHEET_YINSON_UNDER_DEV_SHEET_ID || '',
    process.env.SMARTSHEET_UNDER_DEV_SHEET_ID || '',
    process.env.SMARTSHEET_CLIENT_UNDER_DEV_SHEET_ID || '',
    process.env.SMARTSHEET_YINSON_SHEET_ID || '',
    process.env.SMARTSHEET_SHEET_ID_YINSON || '',
    process.env.SMARTSHEET_SHEET_IDS_LIST || '',
    process.env.SMARTSHEET_SHEET_ID || '',
    qs.rowAttachmentFallback || '',
  ].join('|');
}

function getCachedPayload(event, debug) {
  if (debug || !cachedPayload || !UNDER_DEV_CACHE_TTL_MS) return null;
  const key = buildCacheKey(event);
  const age = Date.now() - cachedPayloadAt;
  if (cachedPayloadKey === key && age >= 0 && age < UNDER_DEV_CACHE_TTL_MS) {
    return {
      ...cachedPayload,
      meta: {
        ...(cachedPayload.meta || {}),
        servedFromFunctionCache: true,
        functionCacheAgeMs: age,
      },
    };
  }
  return null;
}

function setCachedPayload(event, payload, debug) {
  if (debug || !payload?.ok || !UNDER_DEV_CACHE_TTL_MS) return;
  cachedPayloadKey = buildCacheKey(event);
  cachedPayloadAt = Date.now();
  cachedPayload = payload;
}

function getCandidateSheetIds(event) {
  const qs = event.queryStringParameters || {};
  const rawValues = [
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
    ...DEFAULT_CANDIDATE_SHEET_IDS,
  ];

  return unique(rawValues.flatMap((item) => String(item || '').split(',')));
}

function getCandidateSheetNames() {
  return unique([
    process.env.SMARTSHEET_YINSON_UNDER_DEV_SHEET_NAME,
    process.env.SMARTSHEET_UNDER_DEV_SHEET_NAME,
    process.env.SMARTSHEET_CLIENT_UNDER_DEV_SHEET_NAME,
    'Projetos em Desenvolvimento',
    'Projects under development',
    'Yinson',
  ]).map(normalizeTitle);
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

function scoreColumnForField(columnTitle, fieldKey) {
  const title = normalizeTitle(columnTitle);
  const compactTitle = compact(columnTitle);
  const definition = FIELD_DEFINITIONS[fieldKey];
  if (!title || !definition) return 0;

  let best = 0;
  for (const alias of definition.aliases) {
    const normalizedAlias = normalizeTitle(alias);
    const compactAlias = compact(alias);
    if (!normalizedAlias) continue;

    if (title === normalizedAlias) best = Math.max(best, 100);
    if (compactTitle === compactAlias) best = Math.max(best, 98);
    if (title.startsWith(`${normalizedAlias} `)) best = Math.max(best, 88);
    if (title.endsWith(` ${normalizedAlias}`)) best = Math.max(best, 82);
    if (title.includes(` ${normalizedAlias} `)) best = Math.max(best, 78);
    if (compactAlias.length >= 4 && compactTitle.includes(compactAlias)) best = Math.max(best, 72);
  }

  // Tratamentos específicos para evitar falso positivo e capturar variações comuns.
  if (fieldKey === 'sob' && compactTitle === 'sob') best = Math.max(best, 105);
  if (fieldKey === 'workOrder' && /(^|\s)wo($|\s|\d)/.test(title)) best = Math.max(best, 92);
  if (fieldKey === 'tagNumber' && title === 'tag') best = Math.max(best, 92);
  if (fieldKey === 'idRepair' && title === 'id') best = Math.max(best, 55);

  return best;
}

function mapColumns(columns = []) {
  const usedColumnIds = new Set();
  const mapped = {};
  const diagnostics = [];

  for (const fieldKey of Object.keys(FIELD_DEFINITIONS)) {
    const candidates = columns
      .map((column) => ({ column, score: scoreColumnForField(column.title, fieldKey) }))
      .filter((item) => item.score > 0 && !usedColumnIds.has(item.column.id))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    if (best) {
      mapped[fieldKey] = {
        id: best.column.id,
        title: best.column.title,
        score: best.score,
      };
      usedColumnIds.add(best.column.id);
      diagnostics.push({ field: fieldKey, label: FIELD_DEFINITIONS[fieldKey].label, matched: best.column.title, score: best.score });
    } else {
      diagnostics.push({ field: fieldKey, label: FIELD_DEFINITIONS[fieldKey].label, matched: null, score: 0 });
    }
  }

  const missing = Object.keys(FIELD_DEFINITIONS).filter((fieldKey) => !mapped[fieldKey]);
  return { mapped, missing, diagnostics };
}

function scoreSheet(sheet, mapping) {
  const matchedCount = Object.keys(mapping.mapped || {}).length;
  const title = normalizeTitle(sheet?.name || sheet?.title || '');
  let score = matchedCount * 100;
  if (title.includes('yinson')) score += 90;
  if (title.includes('desenvolvimento') || title.includes('development')) score += 80;
  if (title.includes('repair') || title.includes('reparo')) score += 30;
  return score;
}

async function fetchSheet(sheetId, headers) {
  // include=objectValue ajuda quando a sheet tem campos especiais, sem expor token no navegador.
  return fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}?include=objectValue,attachments`, { headers });
}

async function listSheets(headers) {
  const payload = await fetchJson(`${API_BASE}/sheets?pageSize=100`, { headers });
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function resolveBestSheet(event, headers) {
  const debug = event.queryStringParameters?.debug === '1' || event.queryStringParameters?.debug === 'true';
  const tried = [];
  const candidates = [];
  const candidateIds = getCandidateSheetIds(event);

  for (const sheetId of candidateIds) {
    try {
      const sheet = await fetchSheet(sheetId, headers);
      const mapping = mapColumns(sheet.columns || []);
      const score = scoreSheet(sheet, mapping);
      const item = { sheet, mapping, score, source: 'candidate-id' };
      candidates.push(item);
      tried.push({ sheetId, name: sheet.name, score, mapped: Object.keys(mapping.mapped).length, missing: mapping.missing });
    } catch (err) {
      tried.push({ sheetId, error: err.message, status: err.status || null });
    }
  }

  // Se os IDs configurados não encontrarem uma sheet boa, varre a lista de sheets acessíveis
  // e prioriza nomes relacionados a Yinson/desenvolvimento/reparo.
  const bestCandidate = candidates.sort((a, b) => b.score - a.score)[0];
  if (!bestCandidate || Object.keys(bestCandidate.mapping.mapped).length < 4) {
    try {
      const sheetNames = getCandidateSheetNames();
      const listed = await listSheets(headers);
      const rankedList = listed
        .map((sheetInfo) => {
          const normalizedName = normalizeTitle(sheetInfo.name);
          let nameScore = 0;
          for (const name of sheetNames) {
            if (name && normalizedName.includes(name)) nameScore += 100;
          }
          if (normalizedName.includes('yinson')) nameScore += 100;
          if (normalizedName.includes('desenvolvimento') || normalizedName.includes('development')) nameScore += 80;
          if (normalizedName.includes('repair') || normalizedName.includes('reparo')) nameScore += 40;
          return { sheetInfo, nameScore };
        })
        .filter((item) => item.nameScore > 0)
        .sort((a, b) => b.nameScore - a.nameScore)
        .slice(0, 12);

      for (const { sheetInfo, nameScore } of rankedList) {
        if (candidateIds.includes(String(sheetInfo.id))) continue;
        try {
          const sheet = await fetchSheet(sheetInfo.id, headers);
          const mapping = mapColumns(sheet.columns || []);
          const score = scoreSheet(sheet, mapping) + nameScore;
          const item = { sheet, mapping, score, source: 'sheet-list' };
          candidates.push(item);
          tried.push({ sheetId: String(sheetInfo.id), name: sheet.name, score, mapped: Object.keys(mapping.mapped).length, missing: mapping.missing, source: 'sheet-list' });
        } catch (err) {
          tried.push({ sheetId: String(sheetInfo.id), name: sheetInfo.name, error: err.message, status: err.status || null, source: 'sheet-list' });
        }
      }
    } catch (err) {
      tried.push({ source: 'sheet-list', error: err.message, status: err.status || null });
    }
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || Object.keys(best.mapping.mapped).length < 2) {
    const error = new Error('Não foi possível localizar uma sheet com as colunas de Projetos em Desenvolvimento.');
    error.statusCode = 422;
    error.debug = { tried };
    throw error;
  }

  if (debug) best.debugTried = tried;
  return best;
}

function buildCellMap(row) {
  const map = new Map();
  (row.cells || []).forEach((cell) => map.set(cell.columnId, cell));
  return map;
}

function cellValue(cell) {
  if (!cell) return '';
  const value = cell.displayValue ?? cell.value ?? cell.objectValue ?? '';
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '').trim();
}

function extractUrlsFromValue(value, output = []) {
  if (value == null) return output;
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    matches.forEach((url) => output.push({ url, name: 'Imagem' }));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractUrlsFromValue(item, output));
    return output;
  }
  if (typeof value === 'object') {
    const directUrl = value.url || value.href || value.link || value.downloadUrl || value.imageUrl;
    if (typeof directUrl === 'string' && /^https?:\/\//i.test(directUrl)) {
      output.push({ url: directUrl, name: value.name || value.title || value.fileName || 'Imagem' });
    }
    Object.values(value).forEach((item) => extractUrlsFromValue(item, output));
  }
  return output;
}

function imageRecordsFromCell(cell) {
  if (!cell) return [];
  const records = [];
  if (cell.hyperlink?.url) records.push({ url: cell.hyperlink.url, name: cell.displayValue || 'Imagem' });
  extractUrlsFromValue(cell.displayValue, records);
  extractUrlsFromValue(cell.value, records);
  extractUrlsFromValue(cell.objectValue, records);
  const seen = new Set();
  return records
    .filter((item) => item?.url && !seen.has(item.url) && seen.add(item.url))
    .map((item, index) => ({
      id: `cell-${index}`,
      name: item.name || 'Imagem',
      url: item.url,
      source: 'image-column',
    }));
}

function isImageAttachment(att) {
  const mime = String(att?.mimeType || '').toLowerCase();
  const name = String(att?.name || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(name);
}

async function fetchSheetAttachments(sheetId, headers) {
  try {
    const payload = await fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}/attachments`, { headers });
    const byRow = {};
    for (const att of (payload?.data || [])) {
      if (!att.rowId) continue;
      if (!byRow[att.rowId]) byRow[att.rowId] = [];
      byRow[att.rowId].push(att);
    }
    return byRow;
  } catch (_) {
    return {};
  }
}

async function fetchRowAttachments(sheetId, rowId, headers) {
  try {
    const payload = await fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}/rows/${encodeURIComponent(rowId)}/attachments`, { headers });
    return Array.isArray(payload?.data) ? payload.data : [];
  } catch (_) {
    return [];
  }
}

async function fetchAttachmentDetail(sheetId, att, headers) {
  try {
    // Endpoint por sheet/attachment costuma ser mais confiável para anexos de linha.
    const payload = await fetchJson(`${API_BASE}/sheets/${encodeURIComponent(sheetId)}/attachments/${encodeURIComponent(att.id)}`, { headers });
    return { ...att, url: payload.url, urlExpiresAt: payload.urlExpiresAt };
  } catch (_) {
    try {
      const payload = await fetchJson(`${API_BASE}/attachments/${encodeURIComponent(att.id)}`, { headers });
      return { ...att, url: payload.url, urlExpiresAt: payload.urlExpiresAt };
    } catch (__) {
      return att;
    }
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

exports.handler = async (event) => {
  if (!TOKEN) {
    return json(500, {
      ok: false,
      error: 'Token Smartsheet não configurado. Configure SMARTSHEET_API_KEY ou SMARTSHEET_TOKEN no Netlify.',
    });
  }

  const headers = { Authorization: `Bearer ${TOKEN}` };
  const debug = event.queryStringParameters?.debug === '1' || event.queryStringParameters?.debug === 'true';
  const cached = getCachedPayload(event, debug);
  if (cached) return json(200, cached);

  try {
    const { sheet, mapping, score, source, debugTried } = await resolveBestSheet(event, headers);
    const mapped = mapping.mapped;
    const sheetId = String(sheet.id);
    const attachmentsByRow = await fetchSheetAttachments(sheetId, headers);

    const rowsWithData = (sheet.rows || []).filter((row) => {
      const cellMap = buildCellMap(row);
      return Object.values(mapped).some((field) => cellValue(cellMap.get(field.id)));
    });

    const hasSheetAttachmentIndex = Object.keys(attachmentsByRow || {}).length > 0;
    const qs = event.queryStringParameters || {};
    const rowFallbackDisabled = qs.rowAttachmentFallback === '0' || qs.rowAttachmentFallback === 'false';
    const useRowAttachmentFallback = !rowFallbackDisabled && rowsWithData.length <= ROW_ATTACHMENT_FALLBACK_LIMIT;

    const projects = await mapWithConcurrency(rowsWithData, useRowAttachmentFallback ? 6 : 1, async (row) => {
      const cellMap = buildCellMap(row);
      const getVal = (fieldKey) => cellValue(cellMap.get(mapped[fieldKey]?.id));

      // Prioridade para os anexos já vindos no próprio GET /sheet?include=attachments.
      // Se a API não trouxer anexos embutidos, usa o índice geral da sheet.
      // Se ainda assim não vier, busca apenas a lista de anexos da linha, sem baixar a URL.
      let rowAttachments = Array.isArray(row.attachments) ? row.attachments : [];
      if (!rowAttachments.length) rowAttachments = attachmentsByRow[row.id] || [];
      if (!rowAttachments.length && useRowAttachmentFallback) {
        rowAttachments = await fetchRowAttachments(sheetId, row.id, headers);
      }

      const imageAttachments = rowAttachments.filter(isImageAttachment);
      const imageCellRecords = imageRecordsFromCell(cellMap.get(mapped.image?.id));

      return {
        rowId: row.id,
        vessel: getVal('vessel'),
        workOrder: getVal('workOrder'),
        idRepair: getVal('idRepair'),
        tagNumber: getVal('tagNumber'),
        sob: getVal('sob'),
        description: getVal('description'),
        status: getVal('status'),
        images: [
          ...imageAttachments.map((att) => ({
            id: att.id,
            name: att.name,
            mimeType: att.mimeType,
            rowId: row.id,
            sheetId,
            source: 'row-attachment',
          })),
          ...imageCellRecords,
        ],
      };
    });

    const meta = {
      sheetId,
      sheetName: sheet.name,
      source,
      score,
      totalRows: Array.isArray(sheet.rows) ? sheet.rows.length : 0,
      returnedRows: projects.length,
      mappedColumns: Object.fromEntries(Object.entries(mapped).map(([fieldKey, info]) => [fieldKey, { id: info.id, title: info.title, score: info.score }])),
      missingColumns: mapping.missing,
      availableColumns: (sheet.columns || []).map((col) => col.title),
      imageMode: 'metadata-on-click-row-fallback',
      usedSheetAttachmentIndex: hasSheetAttachmentIndex,
      usedRowAttachmentFallback: useRowAttachmentFallback,
      rowAttachmentFallbackLimit: ROW_ATTACHMENT_FALLBACK_LIMIT,
      cacheTtlMs: UNDER_DEV_CACHE_TTL_MS,
    };
    if (debug) meta.tried = debugTried || [];

    const payload = { ok: true, data: projects, meta };
    setCachedPayload(event, payload, debug);
    return json(200, payload);
  } catch (err) {
    return json(err.statusCode || err.status || 500, {
      ok: false,
      error: err.message || 'Erro ao buscar dados da Smartsheet',
      details: err.payload || null,
      debug: err.debug || null,
    });
  }
};
