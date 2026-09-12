const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/dfajardo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../apps/desktop/dist/audit-preview/browser');
const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  const p = path.resolve(root, '.'+new URL(req.url,'http://localhost').pathname);
  if (p!==root && !p.startsWith(root+path.sep)) { res.writeHead(403).end(); return; }
  const file = p===root ? path.join(root,'index.html') : p;
  fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
let auditBrowser;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = auditBrowser = await chromium.launch({headless:true, channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.stack || e.message));
  const origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin);
  await page.getByRole('heading',{name:'Actualizaciones',exact:true}).waitFor();
  await page.getByRole('button',{name:'Buscar actualizaciones',exact:true}).click();
  await page.getByRole('heading',{name:'Estás en la última versión',exact:true}).waitFor();
  await page.evaluate(()=>window.auditEvent('available',{version:'1.0.14'}));
  await page.evaluate(()=>window.auditEvent('downloading',{percent:64,transferred:67108864,total:104857600,bytesPerSecond:1048576}));
  await page.getByRole('heading',{name:'Descargando actualización',exact:true}).first().waitFor();
  await page.screenshot({path:path.join(__dirname,'updater-download-light.png'),fullPage:true});
  await page.getByRole('button',{name:'Seguir trabajando',exact:true}).click();
  await page.locator('app-update-notification').waitFor({state:'detached'});
  assert.equal(await page.getByRole('heading',{name:'Descargando actualización',exact:true}).count(),1);
  await page.evaluate(()=>window.auditEvent('ready',{version:'1.0.14'}));
  await page.getByRole('button',{name:'Reiniciar para aplicar',exact:true}).first().click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.evaluate(()=>window.auditRestartCount),0);
  await page.getByRole('dialog').getByRole('button',{name:'Más tarde',exact:true}).click();
  await page.locator('mat-dialog-container').waitFor({state:'detached'});
  await page.screenshot({path:path.join(__dirname,'updater-ready-light.png'),fullPage:true});
  await page.evaluate(()=>{document.documentElement.classList.add('dark','scheme-dark');document.documentElement.classList.remove('scheme-light');});
  await page.screenshot({path:path.join(__dirname,'updater-ready-dark.png'),fullPage:true});
  await page.getByRole('button',{name:'Reiniciar para aplicar',exact:true}).first().click();
  await page.screenshot({path:path.join(__dirname,'updater-restart-confirm.png'),fullPage:true});
  await page.getByRole('dialog').getByRole('button',{name:/Reiniciar para aplicar/}).click();
  await page.waitForFunction(()=>window.auditRestartCount===1);
  await page.evaluate(()=>window.auditEvent('error','synthetic technical error'));
  await page.getByRole('heading',{name:'Error al buscar actualizaciones',exact:true}).first().waitFor();
  assert.equal(await page.getByText('synthetic technical error',{exact:true}).count(),0);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(__dirname,'updater-error-mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  await page.goto(origin+'/?lang=en');
  await page.getByRole('heading',{name:'Updates',exact:true}).waitFor();
  await page.evaluate(()=>window.auditEvent('ready',{version:'1.0.14'}));
  await page.getByText('The new version is downloaded. Save your work before restarting.',{exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,'visual-results.json'),JSON.stringify({passed:true,errors,checks:['manual check','download progress','dismiss preserves state','ready notification','restart requires confirmation','cancel preserves ready','confirmed restart IPC stub','safe error message','light/dark','390px no horizontal overflow','English translations'],limitation:'Real Angular components with synthetic Electron bridge; no installer executed'},null,2));
  await browser.close(); server.close();
})().catch(async e=>{console.error(e);if(auditBrowser) await auditBrowser.close();server.close();process.exitCode=1;});






