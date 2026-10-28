"""Host-mode bridge and passenger flows. This does not compile or run WKWebView/iOS."""
import json, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT.parent/'ios/JourneyApp/Resources')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':393,'height':780})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.nativeMessages=[];window.webkit={messageHandlers:{journey:{postMessage:(v)=>window.nativeMessages.push(v)}}};')
 page.goto(f'http://127.0.0.1:{server.server_port}/journey.html?native=1')
 page.wait_for_function('typeof window.__journeyNativeReceive === "function"')
 expect(page.locator('.native-booking')).to_be_visible()
 page.get_by_role('button',name='Set up a demonstration trip').click()
 assert page.evaluate('window.nativeMessages.at(-1).type')=='controls'
 assert not page.locator('.iphone-notch').is_visible()
 assert not page.locator('.trigger-navigation').is_visible()
 def send(phase='pretravel',event='',clock='2026-10-27T14:10:00Z',booked=True):
  page.evaluate('(v)=>window.__journeyNativeReceive(v)',{'version':1,'journeyID':'native-test','booked':booked,'phase':phase,'event':event,'clock':clock,'revision':1})
 send();expect(page.locator('.native-booking')).to_have_count(0)
 send('airport',clock='2026-10-27T14:55:00Z')
 expect(page.locator('.next-action')).to_contain_text('Make the most')
 page.wait_for_timeout(450)
 page.locator('.pass-shortcut').click();expect(page.get_by_role('dialog').locator('.pass-fields')).to_contain_text('68')
 page.get_by_role('button',name='Close dialog').click();page.wait_for_timeout(240)
 send('airport','gate','2026-10-27T15:25:00Z')
 expect(page.locator('.sheet-situation')).to_contain_text('Gate 62')
 page.locator('.pass-shortcut').click();expect(page.get_by_role('dialog').locator('.pass-fields')).to_contain_text('62')
 send('airport','cancelled','2026-10-27T15:25:00Z')
 page.get_by_role('button',name='Find my recovery options').click()
 page.get_by_role('button',name='Understand my priorities on this iPhone').click()
 assert page.evaluate('window.nativeMessages.at(-1).type')=='recoveryRequest'
 page.evaluate('window.__journeyPriorityReceive("earliest")')
 expect(page.locator('input[value="earliest"]')).to_be_checked()
 send('boarding',clock='2026-10-27T15:45:00Z')
 expect(page.locator('.sheet-situation')).to_contain_text('boarding at Gate 68')
 send('inflight',clock='2026-10-27T16:25:00Z')
 expect(page.locator('.sheet-situation')).to_contain_text('Settle in')
 assert page.locator('.before-fly').count()==0
 assert page.locator('.demo-code').count()==0
 page.wait_for_timeout(500);page.screenshot(path=str(ROOT/'test-results/native-inflight.png'))
 send('arrived',clock='2026-10-28T05:30:00Z')
 expect(page.locator('.sheet-situation')).to_contain_text('arrived in Zurich')
 assert page.locator('.device').evaluate('(e)=>Math.abs(e.getBoundingClientRect().width-window.innerWidth)<1')
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 page.wait_for_timeout(500);page.screenshot(path=str(ROOT/'test-results/native-arrival.png'))
 assert not errors,errors
 (ROOT/'test-results/native-browser-results.json').write_text(json.dumps({'bundledHTMLServedLocally':True,'booking':True,'phaseAndEventBridge':True,'priorityConfirmationBridge':True,'fullWidthDeviceLayout':True,'boardingPassInvalidatedAfterDeparture':True,'errors':errors,'limitation':'Chromium host-mode test; native Xcode build and device execution not available here'},indent=2))
 b.close()
print('PASS: native host layout, booking, phases, event injection, pass state and preference bridge in Chromium')
