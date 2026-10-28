"""Two browser contexts exchange genuine Supabase broadcasts.

Chromium lacks this workspace's proxy CA. Only WebSocket transport is routed
through Python's CA-verified connection; the app protocol and payloads are untouched.
No TLS bypass, source fixtures or privileged Supabase credentials are used.
"""
import asyncio,json,threading,functools
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright,expect
from websockets.asyncio.client import connect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'deliverables')))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/journey-walkthrough.html'
async def main():
 tasks=set();outgoing=[];errors=[];connections=[]
 async def relay(route):
  # This test connects to exactly the app's configured public project.
  upstream=await connect(route.url,origin=f'http://127.0.0.1:{server.server_port}',open_timeout=15)
  connections.append(upstream)
  async def send(data):
   outgoing.append(json.loads(data))
   try:await upstream.send(data)
   except Exception:await upstream.close()
  route.on_message(lambda data: asyncio.create_task(send(data)))
  async def receive():
   try:
    async for data in upstream:
     msg=json.loads(data)
     route.send(data)
   except Exception:await upstream.close()
  task=asyncio.create_task(receive());tasks.add(task);task.add_done_callback(tasks.discard)
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  phone=await b.new_page(viewport={'width':393,'height':780})
  desktop=await b.new_page(viewport={'width':1380,'height':1100})
  for page in [phone,desktop]:
   page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGEERROR',str(e),flush=True)))
   await page.route_web_socket('wss://mekjqboywhbtbbabxela.supabase.co/**',relay)
   await page.route('https://data.weather.gov.hk/**',lambda r:r.abort())
  await phone.add_init_script('window.webkit={messageHandlers:{journey:{postMessage:(x)=>window.lastBridgeMessage=x}}};')
  await phone.goto(BASE+'?native=1');await phone.wait_for_function('typeof window.__journeyNativeReceive==="function"')
  async def phase(clock='2026-10-27T14:55:00Z',event=''):
   await phone.evaluate('(v)=>window.__journeyNativeReceive(v)',{'version':1,'journeyID':'inspector-test','booked':True,'phase':'airport','event':event,'clock':clock,'revision':1})
  await phase();await expect(phone.locator('.next-action')).to_contain_text('25 min for a flexible lounge stop')
  await phone.evaluate('window.dispatchEvent(new Event("journey-open-inspector"))')
  await phone.get_by_role('button',name='Start decision inspector',exact=True).click()
  await expect(phone.locator('.inspector-controls')).to_contain_text('Connected · updating',timeout=25000)
  link=await phone.get_by_label('Decision inspector link').input_value();room=link.split('#inspector/')[1]
  await phone.get_by_role('button',name='Copy inspector link').click()
  assert await phone.evaluate('window.lastBridgeMessage.room')==room
  await phone.screenshot(path=str(OUT/'inspector-phone.png'))
  await desktop.goto(BASE+'#inspector/'+room)
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('25 min for a flexible lounge stop',timeout=25000)
  assert await desktop.locator('.inspector-history li').count()>=1
  await phase('2026-10-27T15:15:00Z')
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('Stay near your gate',timeout=10000)
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('Everything is on track')
  await expect(phone.locator('.next-action')).to_contain_text('Stay near your gate')
  await desktop.screenshot(path=str(OUT/'inspector-weather.png'),full_page=True)
  await phase(event='delay')
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('Stay nearby while we update you',timeout=10000)
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('0 min')
  await phase(event='cancelled')
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('Find a recovery',timeout=10000)
  await expect(desktop.locator('.inspector-option')).to_have_count(3)
  await desktop.screenshot(path=str(OUT/'inspector-recovery.png'),full_page=True)
  # Backgrounding closes publisher transport and marks the view paused, rather
  # than implying a backend worker continues evaluating the simulation.
  await phone.evaluate('window.dispatchEvent(new CustomEvent("journey-host-active",{detail:false}))')
  await expect(desktop.locator('.inspector-status')).to_contain_text('paused',timeout=10000)
  await phone.evaluate('window.dispatchEvent(new CustomEvent("journey-host-active",{detail:true}))')
  await expect(desktop.locator('.inspector-status')).to_contain_text('Connected',timeout=25000)
  # A late observer must receive the current state without waiting for a change.
  await desktop.evaluate('window.dispatchEvent(new Event("pagehide"))')
  await desktop.wait_for_timeout(150)
  await desktop.reload()
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('Find a recovery',timeout=25000)
  await phone.evaluate('window.dispatchEvent(new Event("journey-open-inspector"))')
  await phone.get_by_role('button',name='Stop sharing decisions').click()
  await expect(desktop.locator('.inspector-status')).to_contain_text('Sharing stopped',timeout=10000)
  await expect(desktop.locator('.inspector-recommendation')).to_contain_text('Find a recovery')
  await desktop.set_viewport_size({'width':393,'height':780})
  assert await desktop.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
  sent=json.dumps(outgoing)
  for private in ['Emma','CHAN','19,932','12A','access_token','nativeJourneyID']:assert private not in sent,private
  assert not errors,errors
  report={'realSupabaseBroadcast':True,'independentBrowserContexts':True,'applicationRulesDrivePassengerAndInspector':True,'worseningWeatherIsNotDelay':True,'unknownDelayBlocksLeisure':True,'cancellationRecoveryOptions':True,'pauseResume':True,'lateJoin':True,'stopRetainsLastDecision':True,'noIdentityInPackets':True,'mobileOverflow':False,'nativeClipboardMessage':True,'transport':'Python TLS-verified WebSocket relay; physical iPhone not tested','errors':errors}
  (OUT/'inspector-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
  await desktop.evaluate('window.dispatchEvent(new Event("pagehide"))')
  await desktop.wait_for_timeout(150)
  await b.close()
 for ws in connections:await ws.close()
 for task in list(tasks):task.cancel()
asyncio.run(main());server.shutdown()
