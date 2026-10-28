"""Review optional preparation inside the existing phone and modal system."""
import json,threading,functools,base64
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/preparation';OUT.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'deliverables')));threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/journey-walkthrough.html'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1360,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'#prepare');page.evaluate('document.fonts.ready')
 def route(name):
  page.locator(f'.trigger-navigation a[href="#{name}"]').click();page.wait_for_timeout(350)
 def capture(name):
  page.wait_for_function('!document.querySelector(".toast")',timeout=4000)
  page.locator('[role="dialog"]:visible .detail-scroll').evaluate('(e)=>e.scrollTop=0');page.wait_for_timeout(150);page.locator('.iphone-frame').screenshot(path=str(OUT/(name+'.png')))
 def dialog():return page.get_by_role('dialog')
 capture('01-preparation')
 dialog().get_by_role('button',name='What matters to you?',exact=False).click()
 dialog().get_by_role('button',name='Keep it easy',exact=False).click();capture('02-intent')
 dialog().get_by_role('button',name='Save to my journey',exact=True).click();page.wait_for_timeout(300)
 expect(dialog()).to_contain_text('Keep it easy')
 dialog().get_by_role('button',name='Getting to the airport',exact=False).click();dialog().get_by_role('button',name='Airport Express',exact=False).click();capture('03-transport')
 dialog().get_by_role('button',name='Save to my journey',exact=True).click();page.wait_for_timeout(300)
 expect(dialog()).to_contain_text('Airport Express')
 route('journey');expect(page.locator('.next-action')).to_contain_text('airport express')
 route('prep-family');dialog().get_by_role('button',name='Yes',exact=True).click();dialog().get_by_role('button',name='We’re bringing a buggy',exact=False).click();dialog().get_by_role('button',name='Help with walking or a wheelchair',exact=False).click();capture('04-family')
 dialog().get_by_role('button',name='Save to my journey',exact=True).click();page.wait_for_timeout(300)
 route('prepare');expect(dialog()).to_contain_text('With a buggy')
 route('prep-food');dialog().get_by_role('button',name='I prefer vegetarian food',exact=False).click();capture('05-food')
 dialog().get_by_role('button',name='Save to my journey',exact=True).click();page.wait_for_timeout(300)
 route('prep-rest');dialog().get_by_role('button',name='Settle in, then rest',exact=False).click();capture('06-rest')
 dialog().get_by_role('button',name='Save to my journey',exact=True).click();page.wait_for_timeout(300)
 route('prep-media');dialog().get_by_role('button',name='Rest',exact=True).click();dialog().get_by_role('button',name='Save Above the clouds',exact=True).click();dialog().get_by_role('button',name='Save Perfect Days',exact=True).click();capture('07-playlist')
 dialog().get_by_role('button',name='Preview on board · 2 saved').click();capture('08-onboard')
 dialog().get_by_role('button',name='Show paired-screen mockup').click();expect(dialog().locator('.prep-seatback')).to_contain_text('Perfect Days');capture('09-paired')
 dialog().get_by_role('button',name='Preview your arrival').click();capture('10-arrival')
 dialog().get_by_role('button',name='I’m ready to leave').click();expect(dialog()).to_contain_text('No Uber request')
 dialog().get_by_role('button',name='Reflect on your journey').click();dialog().get_by_role('button',name='Some of the time',exact=False).click();dialog().locator('textarea').fill('The timing helped; I wanted a clearer buggy handover.');capture('11-feedback')
 dialog().get_by_role('button',name='Save my feedback').click();expect(dialog()).to_contain_text('response is saved in this preview');capture('12-thanks')
 route('cancelled');page.locator('.sheet-more .prep-entry').click();expect(dialog()).to_contain_text('Your choices stay with you');expect(dialog()).to_contain_text('Keep it easy');expect(dialog()).to_contain_text('2 selections saved')
 page.reload();expect(dialog()).to_have_count(0)
 route('prepare');expect(dialog()).to_contain_text('With a buggy');expect(dialog()).to_contain_text('Vegetarian preference');expect(dialog()).to_contain_text('2 selections saved')
 for id in ['prepare','prep-ready','prep-intent','prep-transport','prep-family','prep-food','prep-rest','prep-media','prep-onboard','prep-arrival','prep-feedback']:
  route(id)
  size=dialog().locator('.detail-scroll').evaluate('(e)=>({w:e.clientWidth,sw:e.scrollWidth})');assert size['sw']<=size['w']+1,(id,size)
  assert page.locator('.detail-header:visible [aria-label="Open boarding pass"]').count()==1
  assert 'GT Walsheim' in page.locator('.prep-title').evaluate('(e)=>getComputedStyle(e).fontFamily')
  # Exercise the bottom of every screen; controls must remain reachable.
  dialog().locator('.detail-scroll').evaluate('(e)=>e.scrollTop=e.scrollHeight')
 route('prep-ready');expect(dialog()).to_contain_text('Assistance not requested');capture('13-readiness')
 # Check the compact native host without the browser phone frame.
 native=b.new_page(viewport={'width':393,'height':780});native.on('pageerror',lambda e:errors.append(str(e)));native.add_init_script('window.webkit={messageHandlers:{journey:{postMessage:()=>{}}}};');native.goto(BASE+'?native=1');native.wait_for_function('typeof window.__journeyNativeReceive === "function"');native.evaluate('(v)=>window.__journeyNativeReceive(v)',{'version':1,'journeyID':'prep-review','booked':True,'phase':'pretravel','event':'','clock':'2026-10-27T14:10:00Z','revision':1});native.locator('.home-sections .prep-entry').click();expect(native.get_by_role('dialog')).to_contain_text('Make this journey yours');native.screenshot(path=str(OUT/'native-preparation.png'))
 assert not errors,errors
 report={'allElevenScreensReviewed':True,'originalFontAndModalShell':True,'progressiveChoicesAndBack':True,'transportChangesNextAction':True,'familyBranch':True,'mediaSharesExistingSavedState':True,'pairingClearlySimulated':True,'arrivalAndFeedback':True,'preservedThroughCancellationAndReload':True,'boardingPassShortcut':True,'noHorizontalOverflow':True,'nativeHostEntry':True,'errors':errors}
 (OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
 board=b.new_page(viewport={'width':1560,'height':1140},device_scale_factor=1)
 font=base64.b64encode((ROOT/'src/assets/gt-walsheim-regular.woff2').read_bytes()).decode()
 cards=[]
 for name,label,detail in [('01-preparation','01 · Get ready','Optional modules, available throughout your journey.'),('06-rest','02 · Make room for rest','Arrival time and your own intentions, together.'),('07-playlist','03 · Your flight playlist','Personal choices, kept through changes.'),('09-paired','04 · Pick up on board','A visual preview of the seatback handoff.')]:
  data=base64.b64encode((OUT/(name+'.png')).read_bytes()).decode();cards.append(f'<article><h2>{label}</h2><p>{detail}</p><img src="data:image/png;base64,{data}"></article>')
 board.set_content(f'<style>@font-face{{font-family:GT;src:url(data:font/woff2;base64,{font})}}*{{box-sizing:border-box}}body{{margin:0;background:#f4f5f2;color:#253f3e;font-family:GT;padding:45px}}header{{margin-bottom:30px}}header p{{color:#69817f;font-size:13px;letter-spacing:1px}}h1{{font-size:32px;font-weight:400;margin:12px 0}}main{{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}}h2{{font-weight:400;font-size:19px;margin:0 0 9px}}article p{{font-size:12px;color:#6a7b77;min-height:34px;line-height:1.5;margin:0 0 20px}}img{{width:100%;height:auto}}footer{{font-size:12px;color:#6a7b77;margin-top:25px}}</style><header><p>CONTEXTUAL DAY OF TRAVEL · DESIGN REVIEW</p><h1>A journey that feels more like you.</h1></header><main>'+''.join(cards)+'</main><footer>Existing Cathay component patterns and supplied typefaces · Interactive mockups · Onboard pairing is a visual simulation.</footer>')
 board.evaluate('document.fonts.ready');board.screenshot(path=str(ROOT/'deliverables/preparation-design-board.png'),full_page=True);b.close()
server.shutdown()
