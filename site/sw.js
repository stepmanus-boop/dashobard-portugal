const CACHE_NAME = 'step-dashboard-portugal-38.11-corrige-imagens-bsp';
// - v37.02: revisa performance, otimiza i18n dinâmico/Yinson e preserva apontamentos rápidos
// Versão v28: preserva cache local entre logouts e usa caminho rápido pós-login
// - Mantém assets do app shell versionados para liberar app.js corrigido imediatamente
// - API continua sem cache no Service Worker; dados operacionais usam cache local validado pelo app
// - Interceptação de /api restrita à própria origem para evitar efeitos colaterais
// - v36.45: evita liberar Portal do Cliente com fallback antigo sem PO
// - v36.46: adiciona coluna Report no cronograma do cliente e exportação Excel por BSP
// - v36.47: remove a coluna Report da lista e exibe o report dentro da visão executiva principal
// - v36.48: Excel passa a exportar o painel executivo completo e remove destaque amarelo do report
// - v36.51: corrige carregamento dos apontamentos PCP sem derrubar a tela quando Tracking/Smartsheet demora
// - v36.52: corrige localização de Tracking por BSP/spool mesmo quando rowId antigo ou campo de avanço está vazio
// - v36.54: separa carregamento da Validação PCP da consulta Smartsheet para evitar timeout de 30s
// - v36.59: remove fallback estático antigo e força nova chave de cache do painel
// - v36.59: alinha carregamento de projetos ao painel Portugal estável, usando Smartsheet PT
// - v36.69: adiciona permissão por usuário para visualizar Painel do Cliente
// - v36.71: adiciona botão discreto de atualização no Portal do Cliente e renova cache local
// - v36.72: editor do Painel do Cliente passa a ajustar Drawings e Procurement antes da fabricação
// - v36.74: painel individual da TAG/ISO busca Drawing Documentation Control sob demanda
// - v36.79: restaura app/projetos da v36.76 e mantém Drawing leve isolado
// - v36.80: acelera login do Portal do Cliente; POs atualizam em segundo plano sem travar a abertura
// - v36.83: restaura carregamento estável do Portal do Cliente e mantém favicon STEP
// - v36.84: Portal do Cliente carrega somente linhas do próprio cliente e PO leve
// - v36.85: login aparece imediatamente; painel fica oculto até autenticar
// - v36.86: aumenta contraste do aviso Em Tratativa no Painel do Cliente
// - v36.68: remove bordas brancas e força a logo do cliente a preencher completamente o card
// - v36.96: adiciona seletor de idioma PT/EN/ES e inclui i18n.js no cache do app
// - v36.97: logout limpava Cache Storage e Service Worker
// - v36.98: logout limpa sessão sem remover cache operacional/app shell, mantendo login rápido
// - v36.99: amplia a cobertura da tradução PT/EN/ES no Portal do Cliente e áreas dinâmicas
// - v37.00: destaca botão Yinson de Projetos em Desenvolvimento e ajusta colunas internas
const APP_SHELL = [
  "/",
  "/app.css",
  "/app.js",
  "/i18n.js",
  "/client-under-development.html",
  "/manifest.webmanifest",
  "/assets/favicon.ico",
  "/assets/favicon-32x32.png",
  "/assets/favicon-16x16.png",
  "/favicon.ico",
  "/assets/step-logo.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/apple-touch-icon.png",
];

const CORE_ASSETS = new Set([
  "/",
  "/index.html",
  "/app.css",
  "/app.js",
  "/i18n.js",
  "/client-under-development.html",
  "/manifest.webmanifest",
  "/assets/favicon.ico",
  "/assets/favicon-32x32.png",
  "/assets/favicon-16x16.png",
  "/favicon.ico",
  "/sw.js",
]);

function toUrl(input) {
  try {
    return new URL(input, self.location.origin);
  } catch {
    return null;
  }
}

function isCoreAsset(request) {
  const url = toUrl(request.url);
  if (!url || url.origin !== self.location.origin) return false;
  return CORE_ASSETS.has(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = toUrl(request.url);
  if (url && url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        new Response(JSON.stringify({ ok: false, offline: true, error: "No connection at the moment." }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  if (isCoreAsset(request)) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match("/"));
    })
  );
});


self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || 'Novo alerta';
  const options = {
    body: data.body || 'You received a new notification.',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'step-alert',
    data: { url: data.url || '/' },
    requireInteraction: true,
    renotify: true,
    vibrate: [220, 120, 220],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('focus' in client) {
        client.navigate(targetUrl).catch(() => {});
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  }));
});

// v38.10 Portugal: English is the default language and standalone client pages were translated.
