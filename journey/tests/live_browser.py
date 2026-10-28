"""Genuine public API requests with TLS-verified transport; local and hosted preview support."""
import gzip,json,os,urllib.request,urllib.error
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None
base=os.environ.get('JOURNEY_LIVE_TEST_URL')
if not base:
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'deliverables')))
 Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}/journey-walkthrough.html'
requests=[];errors=[]
def verified_transport(route):
 request=route.request
 if not request.url.startswith('https://'):route.continue_();return
 headers={k:v for k,v in request.headers.items() if k.lower() in ['accept','origin','referer','user-agent']};headers['Accept-Encoding']='identity'
 try:response=urllib.request.urlopen(urllib.request.Request(request.url,headers=headers,method=request.method),timeout=20)
 except urllib.error.HTTPError as e:response=e
 with response:
  body=response.read()
  if response.headers.get('Content-Encoding')=='gzip':body=gzip.decompress(body)
  h={k:v for k,v in response.headers.items() if k.lower() not in ['content-length','content-encoding','transfer-encoding','connection']}
  requests.append({'url':request.url,'status':response.status,'cors':response.headers.get('Access-Control-Allow-Origin')})
  route.fulfill(status=response.status,headers=h,body=body)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1280,'height':1000})
  # Chromium lacks the managed proxy CA in its local trust store. urllib uses the
  # configured platform CA and proxy; TLS checks stay enabled for every request.
  context.route('**/*',verified_transport)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'#live',wait_until='networkidle',timeout=60000)
  dialog=page.get_by_role('dialog')
  expect(dialog.locator('.live-source-card')).to_have_count(3)
  expect(dialog.locator('.live-result.current')).to_have_count(3,timeout=20000)
  expect(dialog.locator('.live-request-count')).to_contain_text('3 outbound requests')
  expect(dialog.locator('.live-source-card').first).to_contain_text('Chek Lap Kok')
  expect(dialog.locator('.live-source-card').nth(2)).to_contain_text('Hong Kong station')
  api=[r for r in requests if 'weatherAPI/' in r['url'] or 'getSchedule.php' in r['url']]
  assert len(api)==3 and all(r['status']==200 and r['cors']=='*' for r in api),api
  print('PASS: Three real API calls return browser-usable current data, with source evidence.',flush=True)
  page.locator('.device').screenshot(path=str(ROOT/'test-results/live-sources.png'))
  page.locator('.trigger-navigation a[href="#weather"]').click()
  expect(page.get_by_role('dialog').locator('.live-weather-card')).to_contain_text('Chek Lap Kok')
  expect(page.get_by_role('dialog').locator('.weather-segment')).to_have_count(1)
  page.get_by_role('button',name='Follow live HKO warnings').click()
  expect(page.get_by_role('dialog').locator('.live-warning-watch')).to_contain_text('1 check',timeout=20000)
  expect(page.get_by_role('dialog').locator('.live-warning-watch')).not_to_contain_text('unavailable or out of date')
  assert len([r for r in requests if 'dataType=warnsum' in r['url']])==2
  print('PASS: Opt-in monitoring makes an additional real HKO warning call.',flush=True)
  page.locator('.device').screenshot(path=str(ROOT/'test-results/live-weather.png'))
  page.get_by_role('button',name='Stop live warning checks').click()
  page.locator('.trigger-navigation a[href="#lounge"]').click()
  expect(page.get_by_role('dialog').locator('.included-note')).to_contain_text('Diamond membership')
  page.get_by_text('Your other Cathay lounges',exact=True).click()
  expect(page.get_by_role('button',name='The Wing, Business',exact=False)).to_have_count(0)
  page.get_by_role('button',name='The Pier, Business',exact=False).click()
  expect(page.get_by_role('dialog').locator('.venue-details')).to_contain_text('Teahouse')
  expect(page.get_by_role('dialog')).to_contain_text('Gate 65')
  print('PASS: Live airport observation and eligible Cathay lounges render; closed lounge excluded and current notices retained.',flush=True)
  page.locator('.device').screenshot(path=str(ROOT/'test-results/verified-lounges.png'))
  assert not errors,errors
  # Separate deterministic failure check: these are deliberately simulated outages.
  failed=browser.new_context(viewport={'width':1280,'height':1000})
  failed.route('**/*',verified_transport)
  failed.route('https://data.weather.gov.hk/**',lambda r:r.abort('failed'))
  failed.route('https://rt.data.gov.hk/**',lambda r:r.abort('failed'))
  f=failed.new_page();f.goto(base+'#live',wait_until='networkidle',timeout=60000)
  expect(f.locator('.live-error')).to_have_count(3,timeout=15000)
  expect(f.locator('.live-source-card .live-temperature')).to_have_count(0)
  assert f.locator('.live-result.current').count()==0
  print('PASS: Deliberately failed live requests show unavailable, without sample replacement.',flush=True)
  (ROOT/'test-results/live-browser-results.json').write_text(json.dumps({'url':base,'transport':'Actual HTTPS responses fetched with platform proxy/CA validation and rendered in Chromium; no TLS checks disabled','requests':requests,'errors':errors,'simulated_outage_test':True},indent=2))
  browser.close()
finally:
 if server:server.shutdown()
