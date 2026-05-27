const { jsonResponse, requireSession } = require('./_auth');
const { buildPayload } = require('./projects');

/**
 * v11 performance: endpoint leve para aquecer/atualizar o cache operacional.
 * A tela pode chamar em background depois de abrir com cache rápido.
 * Não retorna a base completa, apenas metadados da sincronização.
 */
exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'Método não permitido.' });
  }

  const auth = requireSession(event);
  if (!auth.ok) return auth.response;

  try {
    const force = String(event.queryStringParameters?.force || '') === '1' || event.httpMethod === 'POST';
    const startedAt = Date.now();
    const payload = await buildPayload({ force, preferCache: false });
    return jsonResponse(200, {
      ok: true,
      synced: true,
      durationMs: Date.now() - startedAt,
      projectsCount: Array.isArray(payload.projects) ? payload.projects.length : 0,
      version: payload.meta?.version || null,
      lastSync: payload.meta?.lastSync || new Date().toISOString(),
    }, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || 'Falha ao sincronizar cache.' });
  }
};
