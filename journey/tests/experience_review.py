"""Whole walkthrough review: every trigger, scroll state, contextual transitions and data consistency."""
import base64,json,gzip,urllib.request,urllib.error,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/experience-review';OUT.mkdir(exist_ok=True)
BASE=os.environ.get('JOURNEY_TEST_URL','http://127.0.0.1:5174/journey-walkthrough.html')
requests=[]
def verified_transport(route):
 req=route.request
 if not req.url.startswith('https://'):route.continue_();return
 headers={k:v for k,v in req.headers.items() if k.lower() in ['accept','origin','referer','user-agent']};headers['Accept-Encoding']='identity'
 try:r=urllib.request.urlopen(urllib.request.Request(req.url,headers=headers),timeout=25)
 except urllib.error.HTTPError as e:r=e
 with r:
  body=r.read()
  if r.headers.get('Content-Encoding')=='gzip':body=gzip.decompress(body)
  requests.append({'url':req.url,'status':r.status})
  route.fulfill(status=r.status,headers={k:v for k,v in r.headers.items() if k.lower() not in ['content-length','transfer-encoding','content-encoding','connection']},body=body)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':1000});page.route('**/*',verified_transport)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.evaluate('document.fonts.ready')
 routes=page.locator('.trigger-navigation a').evaluate_all('(els)=>els.map(e=>({id:e.hash.slice(1),label:e.textContent.trim()}))');reviews=[]
 def trigger(id):
  page.locator(f'.trigger-navigation a[href="#{id}"]').click();page.wait_for_timeout(460)
 def capture(name):page.locator('.device').screenshot(path=str(OUT/(name+'.png')))
 for route in routes:
  id=route['id'];trigger(id)
  if id=='live':expect(page.locator('.live-source-card .live-result')).to_have_count(3);page.wait_for_function('![...document.querySelectorAll(".live-result")].some(e=>e.textContent==="Loading")',timeout=30000)
  capture(id+'-top')
  scroller=page.get_by_role('dialog').locator('.detail-scroll') if page.get_by_role('dialog').count() else page.locator('.sheet-scroll') if page.locator('.journey-sheet').get_attribute('data-snap')!='0' else page.locator('.home-scroll')
  dimensions=scroller.evaluate('(e)=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight})')
  assert dimensions['scrollWidth']<=dimensions['clientWidth']+1,(id,dimensions)
  reviews.append({**route,'dimensions':dimensions,'text':scroller.inner_text(),'controls':scroller.locator('button,input,select,summary').count()})
  scroller.evaluate('(e)=>e.scrollTop=e.scrollHeight');page.wait_for_timeout(100);capture(id+'-bottom')
 # Guided home-to-boarding sequence must carry the changed gate through to the pass and a reload.
 page.get_by_role('button',name='1. From home to boarding',exact=True).click()
 for _ in range(6):page.get_by_role('button',name='Next moment →',exact=True).click();page.wait_for_timeout(30)
 expect(page.get_by_role('dialog').locator('.pass-fields')).to_contain_text('62')
 assert page.url.endswith('#pass?scenario=gate'),page.url
 page.reload();expect(page.get_by_role('dialog').locator('.pass-fields')).to_contain_text('62')
 # Connection, nested pass and weather have one coherent itinerary.
 trigger('connection');d=page.get_by_role('dialog');expect(d).to_contain_text('50 mins');expect(d).to_contain_text('Gate 68');expect(d).to_contain_text('00:05')
 d.get_by_role('button',name='Open boarding pass',exact=True).click();expect(page.get_by_role('dialog').locator('.pass-fields')).to_contain_text('68')
 page.get_by_role('dialog').get_by_role('button',name='Back',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('50 mins')
 # Gate message fits above the scroll surface; the map responds to the selected origin.
 trigger('gate');assert page.locator('.situation-full').evaluate('(e)=>e.getBoundingClientRect().bottom <= document.querySelector(".sheet-scroll").getBoundingClientRect().top')
 trigger('directions');d=page.get_by_role('dialog');before=d.locator('.airport-map path').get_attribute('d');d.get_by_label('Starting from').select_option('Lounge entrance');assert d.locator('.airport-map path').get_attribute('d')!=before
 # Airport departure next action must lead to ground transport, not a lounge directory.
 trigger('journey');page.locator('.next-action').click();expect(page.get_by_role('dialog')).to_contain_text('45 minutes');capture('transport-top')
 # Cancellation removes original pre-flight entitlements; recovery preserves context in weather and sharing.
 trigger('cancelled');expect(page.locator('.before-fly')).to_have_count(0)
 page.locator('.sheet-more').get_by_role('button',name='Share your journey',exact=False).click();expect(page.get_by_role('dialog')).to_contain_text('Original scheduled arrival')
 trigger('recovery');d=page.get_by_role('dialog');d.get_by_label('Earliest arrival',exact=False).check();d.get_by_role('button',name='Find my recovery options').click()
 expect(d.get_by_role('button',name='Comparing your options…')).to_be_disabled();expect(d.locator('.recovery-option h3').first).to_have_text('Finnair');assert d.locator('.detail-scroll').evaluate('(e)=>e.scrollTop')==0;capture('recovery-options')
 d.get_by_role('button',name='Choose this option').first.click();capture('recovery-confirm')
 d.get_by_role('button',name='Save this recovery option').click();expect(d).to_contain_text('Your choice is saved.');capture('recovery-complete')
 d.get_by_role('button',name='Open boarding pass',exact=True).click();expect(page.get_by_role('dialog')).to_contain_text('Original pass superseded');expect(page.get_by_role('dialog').locator('.demo-code')).to_have_count(0)
 page.get_by_role('dialog').get_by_role('button',name='Close dialog').click();expect(page.get_by_role('dialog')).to_contain_text('Your choice is saved.')
 page.get_by_role('dialog').get_by_role('button',name='Close dialog').click();expect(page.get_by_role('dialog')).to_have_count(0)
 page.locator('.sheet-more').get_by_role('button',name='Weather along the way').click();expect(page.get_by_role('dialog')).to_contain_text('Finnair');expect(page.get_by_role('dialog')).to_contain_text('via HEL')
 page.get_by_role('dialog').get_by_role('button',name='Close dialog').click();expect(page.get_by_role('dialog')).to_have_count(0)
 page.locator('.sheet-more').get_by_role('button',name='Share your journey').click();expect(page.get_by_role('dialog')).to_contain_text('New arrival')
 # Checklist and sharing switches preserve state under nested boarding pass navigation.
 trigger('documents');d=page.get_by_role('dialog');d.get_by_label('Passport details',exact=False).check();d.get_by_role('button',name='Open boarding pass',exact=True).click();page.get_by_role('dialog').get_by_role('button',name='Back',exact=True).click();expect(page.get_by_role('dialog').get_by_label('Passport details',exact=False)).to_be_checked()
 trigger('share');d=page.get_by_role('dialog');d.get_by_label('Flight times and route').uncheck();d.get_by_label('Delays and changes').uncheck();expect(d).to_contain_text('No journey details selected.')
 # Top and bottom captures for the nested lounge route.
 trigger('lounge');page.get_by_role('dialog').get_by_role('button',name='Get Directions',exact=False).click();expect(page.get_by_role('dialog')).to_contain_text('Near Gate 63');capture('lounge-directions')
 assert not errors,errors
 (OUT/'results.json').write_text(json.dumps({'routes':reviews,'browserErrors':errors,'verifiedRequests':requests,'guidedGatePersists':True,'connectionMatchesPass':True,'groundTransportNextAction':True,'cancelledEntitlementsHidden':True,'recoveryContextRetained':True,'nestedChecklistPreserved':True,'sharingPrivacySwitches':True},indent=2))
 # Contact sheets are rendered browser pages for visual inspection of all screenshots.
 thumbs=b.new_page(viewport={'width':840,'height':1240})
 for group in range(0,len(routes),6):
  cards=''
  for route in routes[group:group+6]:
   data=base64.b64encode((OUT/(route['id']+'-top.png')).read_bytes()).decode();cards+=f'<div><h3>{route["id"]}</h3><img src="data:image/png;base64,{data}"></div>'
  thumbs.set_content('<style>body{margin:15px;background:#eee;font:14px Arial}main{display:grid;grid-template-columns:repeat(3,260px);gap:10px}h3{margin:5px 0}img{width:260px}</style><main>'+cards+'</main>');thumbs.screenshot(path=str(OUT/f'contact-{group//6}.png'),full_page=True)
 b.close()
print('PASS: 20 trigger screens and scroll states; guided gate, connection/pass, ground transport, cancellation/recovery, checklist and sharing transitions.')
