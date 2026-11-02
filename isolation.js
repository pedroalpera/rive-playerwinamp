/* Register the local isolation service worker for static hosts such as GitHub
 * Pages. The worker is scoped to this app folder and does not cache files.
 * Servers that already supply COOP/COEP need no worker or reload.
 */
'use strict';
(() => {
 const workerURL = new URL('./coi-serviceworker.js', document.currentScript.src);
 const reloadKey = 'rive-winamp-isolation-reload:' + workerURL.pathname;
 const status = text => { const el=document.getElementById('notice'); if(el)el.textContent=text; };
 window.riveIsolationReady = (async () => {
  if(!window.isSecureContext)throw new Error('Open the player over HTTPS. Audio threads require a secure connection.');
  if(window.crossOriginIsolated){
   try{sessionStorage.removeItem(reloadKey);}catch{}
   return;
  }
  if(!('serviceWorker' in navigator))throw new Error('This browser cannot enable audio threads here. Try a browser with service workers enabled.');
  status('Preparing audio support… The page will refresh once.');
  await navigator.serviceWorker.register(workerURL.href,{updateViaCache:'none'});
  await new Promise((resolve,reject) => {
   const controlled = () => navigator.serviceWorker.controller?.scriptURL === workerURL.href;
   let timer;
   const finish = () => {
    if(!controlled())return;
    clearTimeout(timer);
    navigator.serviceWorker.removeEventListener('controllerchange',finish);
    resolve();
   };
   navigator.serviceWorker.addEventListener('controllerchange',finish);
   timer=setTimeout(() => {
    navigator.serviceWorker.removeEventListener('controllerchange',finish);
    reject(new Error('Audio setup timed out. Check that coi-serviceworker.js is uploaded beside index.html, then refresh.'));
   },20000);
   finish();
  });
  // A controlled navigation is required for the new response headers to apply.
  // Remember our reload to avoid loops on browsers that cannot isolate this page.
  if(sessionStorage.getItem(reloadKey))throw new Error('This browser could not enable audio isolation. Try a current browser with service workers enabled.');
  sessionStorage.setItem(reloadKey,'1');
  location.reload();
  await new Promise(() => {}); // Do not start Rive on the outgoing document.
 })();
 // bridge.js handles the error after the Rive runtime finishes loading.
 window.riveIsolationReady.catch(() => {});
})();
