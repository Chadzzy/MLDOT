"""Deterministic bridge/foreground lifecycle tests; responses here are fixtures."""
import json,threading,functools
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'deliverables')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://**/*',lambda r:r.abort())
 page.clock.install()
 page.add_init_script('''window.flightCalls=[];window.webkit={messageHandlers:{journey:{postMessage:body=>{
 if(body.type!=='flightLookup')return;
 window.flightCalls.push(body);const n=window.flightCalls.length;
 const result={requestID:body.requestID,httpStatus:200,receivedAt:new Date().toISOString(),payload:{lastUpdateGMT:new Date().toISOString().slice(0,19).replace('T',' '),errors:null,result:[{operatingFlight:{carrierCode:'CX',flightNumber:body.query.flightNumber},sectors:[{origin:'HKG',destination:'ZRH',departScheduled:'2026-10-29 00:45:00',arrivalScheduled:'2026-10-29 07:25:00',originScheduledOffset:'+0800',destinationScheduledOffset:'+0100',flightStatus:'ON_TIME',gateNumber:n===1?'64':'62'}]}]}};
 if(n===3)result.error='Test outage';
 setTimeout(()=>window.dispatchEvent(new CustomEvent('journey-flight-result',{detail:result})),20);
 }}}};''')
 page.goto(f'http://127.0.0.1:{server.server_port}/journey-walkthrough.html#home')
 page.evaluate("window.dispatchEvent(new Event('journey-open-live-flights'))")
 page.get_by_label('Departure date',exact=True).fill('2026-10-29')
 page.get_by_role('button',name='Check flight',exact=True).click()
 expect(page.locator('.live-flight-result')).to_contain_text('Gate 64')
 page.get_by_role('checkbox',name='Keep checking this flight',exact=False).check()
 page.get_by_role('button',name='Close dialog').click()
 page.clock.fast_forward(65000)
 page.locator('.trigger-navigation a[href="#live"]').click()
 expect(page.locator('.live-flight-result')).to_contain_text('Gate 62')
 assert page.evaluate('window.flightCalls.length')==2
 page.evaluate("window.dispatchEvent(new CustomEvent('journey-host-active',{detail:false}))")
 page.clock.fast_forward(180000)
 assert page.evaluate('window.flightCalls.length')==2
 page.evaluate("window.dispatchEvent(new CustomEvent('journey-host-active',{detail:true}))")
 expect(page.locator('.live-flight-lookup')).to_contain_text('Test outage')
 expect(page.locator('.live-flight-lookup')).to_contain_text('Previous result retained')
 expect(page.locator('.live-flight-result')).to_contain_text('Gate 62')
 page.get_by_role('checkbox',name='Keep checking this flight',exact=False).uncheck()
 page.clock.fast_forward(65000)
 assert page.evaluate('window.flightCalls.length')==3
 assert not errors,errors
 print('PASS: Fixed-source bridge, updates after panel close, foreground pause/resume, retained result after outage and stop control.')
 b.close()
server.shutdown()
