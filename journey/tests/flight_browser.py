"""One genuine Cathay lookup through the local fixed-source adapter."""
import json,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'test-results').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':1000});errors=[];responses=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 # These separate integrations are outside this check; don't claim their status.
 page.route('https://data.weather.gov.hk/**',lambda r:r.abort())
 page.route('https://rt.data.gov.hk/**',lambda r:r.abort())
 page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if '/api/journey-flight' in r.url else None)
 page.goto('http://127.0.0.1:5174/#live',wait_until='domcontentloaded')
 date=(datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date()+datetime.timedelta(days=1)).isoformat()
 page.get_by_label('Flight number',exact=True).fill('CX383')
 page.get_by_label('Departure date',exact=True).fill(date)
 page.get_by_role('button',name='Check flight',exact=True).click()
 expect(page.locator('.live-flight-result')).to_have_count(1,timeout=25000)
 expect(page.locator('.live-flight-result')).to_contain_text('CX383 · HKG → ZRH')
 expect(page.locator('.live-flight-evidence')).to_contain_text('HTTP 200')
 expect(page.locator('.live-flight-result')).to_contain_text('Estimated boarding')
 expect(page.locator('.live-flight-result')).to_contain_text('scheduled departure minus 40 min')
 page.locator('.detail-scroll').evaluate('(e)=>e.scrollTop=0') if page.locator('.detail-scroll').count() else None
 page.locator('.device').screenshot(path=str(ROOT/'test-results/live-flight-lookup.png'))
 assert len(responses)==1 and responses[0]['status']==200,responses
 assert not errors,errors
 report={'genuineLookup':True,'query':{'flight':'CX383','date':date},'responses':responses,'resultText':page.locator('.live-flight-result').inner_text(),'errors':errors}
 (ROOT/'test-results/live-flight-lookup.json').write_text(json.dumps(report,indent=2))
 print(json.dumps(report,indent=2));b.close()
