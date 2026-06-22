/* STEP Dashboard Portugal v38.15-linhas-planas-pt - carregador de compatibilidade.
   O app principal foi dividido em chunks em site/js/ para reduzir bloqueio de carregamento e melhorar cache. */
(function(){
  if (window.__STEP_APP_CHUNKS_LOADED__) return;
  window.__STEP_APP_CHUNKS_LOADED__ = true;
  var chunks = [
    './js/app-01-core.js?v=38.15-portugal',
    './js/app-02-client-portal.js?v=38.15-portugal',
    './js/app-03-dashboard-render.js?v=38.15-portugal',
    './js/app-04-data-auth-admin.js?v=38.15-portugal',
    './js/app-05-stage-login-init.js?v=38.15-portugal'
  ];
  function loadNext(index){
    if (index >= chunks.length) return;
    var script = document.createElement('script');
    script.src = chunks[index];
    script.async = false;
    script.onload = function(){ loadNext(index + 1); };
    script.onerror = function(){
      console.error('[STEP] Falha ao carregar módulo:', chunks[index]);
      var body = document.getElementById('projects-body');
      if (body) body.innerHTML = '<tr><td colspan="18">Falha ao carregar módulos do painel. Atualize a página.</td></tr>';
    };
    document.head.appendChild(script);
  }
  loadNext(0);
})();
