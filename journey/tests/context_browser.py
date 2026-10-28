"""Journey timing, native sheet geometry and warning monitoring lifecycle."""
import json,threading,functools
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'deliverables')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':393,'height':780})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.webkit={messageHandlers:{journey:{postMessage:()=>{}}}};')
 page.goto(f'http://127.0.0.1:{server.server_port}/journey-walkthrough.html?native=1')
 page.wait_for_function('typeof window.__journeyNativeReceive === "function"')
 def send(phase='airport',event='',clock='2026-10-27T14:55:00Z'):
  page.evaluate('(v)=>window.__journeyNativeReceive(v)',{'version':1,'journeyID':'context-test','booked':True,'phase':phase,'event':event,'clock':clock,'revision':1})
 def geometry():
  result=page.evaluate('''()=>{const s=document.querySelector('.journey-sheet').getBoundingClientRect(),n=document.querySelector('.bottom-nav').getBoundingClientRect(),d=document.querySelector('.device').getBoundingClientRect();return {gap:n.top-s.bottom,top:s.top-d.top,navVisible:document.querySelector('.bottom-nav').contains(document.elementFromPoint(n.x+n.width/2,n.y+15))}}''')
  assert abs(result['gap'])<1,result
  assert result['top']>=0,result
  assert result['navVisible'],result
 send();page.wait_for_timeout(550);geometry()
 expect(page.locator('.next-action')).to_contain_text('50 min until boarding')
 page.locator('.sheet-situation').focus();page.keyboard.press('Home');page.wait_for_timeout(500);geometry()
 page.screenshot(path=str(ROOT/'test-results/context-collapsed.png'))
 page.keyboard.press('ArrowUp');page.wait_for_timeout(500);geometry()
 page.screenshot(path=str(ROOT/'test-results/context-partial.png'))
 page.keyboard.press('End');page.wait_for_timeout(500);geometry()
 page.screenshot(path=str(ROOT/'test-results/context-full.png'))
 send(event='delay');page.wait_for_timeout(500);geometry()
 expect(page.locator('.timing-note').first).to_contain_text('Revised boarding time unconfirmed')
 page.locator('.readiness-card .module-row').click()
 expect(page.get_by_role('dialog')).to_contain_text('Waiting for weather conditions')
 expect(page.get_by_role('dialog')).not_to_contain_text('Our engineers')
 page.wait_for_timeout(450);page.screenshot(path=str(ROOT/'test-results/context-readiness.png'))
 page.get_by_role('button',name='Close dialog').click();page.wait_for_timeout(250)
 page.locator('.sheet-situation').focus();page.keyboard.press('Home');page.wait_for_timeout(500);geometry()
 page.screenshot(path=str(ROOT/'test-results/context-delay-collapsed.png'))
 for size in [{'width':375,'height':600},{'width':430,'height':850}]:
  page.set_viewport_size(size);page.wait_for_timeout(500);geometry()
  page.locator('.sheet-situation').focus();page.keyboard.press('End');page.wait_for_timeout(500);geometry()
 # Fresh browser context: deterministic public API fixtures prove scheduling, not real data.
 watch=b.new_page(viewport={'width':1280,'height':1000})
 calls=[]
 def response(route):
  calls.append(route.request.url)
  if len(calls)==3:route.abort();return
  route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{}')
 watch.route('https://data.weather.gov.hk/**',response)
 watch.clock.install()
 watch.goto(f'http://127.0.0.1:{server.server_port}/journey-walkthrough.html#weather')
 watch.get_by_role('button',name='Follow live HKO warnings').click()
 expect(watch.get_by_role('dialog').locator('.live-warning-watch')).to_contain_text('No active warnings')
 assert len(calls)==1
 watch.clock.fast_forward(60000)
 expect(watch.get_by_role('dialog').locator('.live-warning-watch')).to_contain_text('2 checks')
 watch.evaluate('window.dispatchEvent(new CustomEvent("journey-host-active",{detail:false}))')
 watch.clock.fast_forward(120000);assert len(calls)==2
 watch.evaluate('window.dispatchEvent(new CustomEvent("journey-host-active",{detail:true}))')
 expect(watch.get_by_role('dialog').locator('.live-warning-watch')).to_contain_text('unavailable or out of date')
 assert len(calls)==3
 watch.reload()
 expect(watch.get_by_role('dialog').locator('.live-warning-watch')).to_contain_text('No active warnings')
 assert len(calls)==4
 watch.get_by_role('button',name='Stop live warning checks').click()
 watch.clock.fast_forward(120000);assert len(calls)==4
 assert watch.evaluate('localStorage.getItem("journey-weather-monitoring")')=='false'
 assert not errors,errors
 (ROOT/'test-results/context-results.json').write_text(json.dumps({'nativeSheetMeetsNavAtEverySnap':True,'smallAndLargeScreens':True,'boardingAndUnknownDelay':True,'weatherReadiness':True,'warningPolling':True,'backgroundPauseAndResume':True,'failureNotAllClear':True,'optOutStopsChecks':True,'monitoringSurvivesReload':True,'errors':errors},indent=2))
 b.close()
server.shutdown()
print('PASS: sheet/nav geometry, timing, weather readiness and warning monitoring lifecycle')
