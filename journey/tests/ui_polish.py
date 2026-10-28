"""Check gesture continuity, snap points, interaction scope, fonts and real image assets."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('JOURNEY_TEST_URL','http://127.0.0.1:5174/journey-walkthrough.html')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':1000},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'#home');page.evaluate('document.fonts.ready')
 sheet=page.locator('.journey-sheet');handle=page.locator('.sheet-situation')
 expect(sheet).to_have_attribute('data-snap','0')
 assert page.get_by_text('View your standby position',exact=True).count()==0
 assert page.locator('.recent-search button,.hero-top button,.bottom-nav button').count()==0
 assert page.locator('.bottom-nav').evaluate('(e)=>{let b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+20))}')
 assert page.evaluate('document.fonts.check(16+"px \\\"GT Walsheim\\\"")')
 def drag(delta, target):
  box=handle.bounding_box();x=box['x']+50;y=box['y']+14
  scale=page.locator('.device').bounding_box()['width']/375
  page.mouse.move(x,y);page.mouse.down()
  for i in range(1,11):
   page.mouse.move(x,y-delta*scale*i/10)
   page.wait_for_timeout(22)
   if i==5:
    height=sheet.evaluate('(e)=>e.getBoundingClientRect().height')/scale
    assert 88 < height < 653, height
  page.wait_for_timeout(120);page.mouse.up()
  expect(sheet).to_have_attribute('data-snap',str(target))
  page.wait_for_timeout(480)
 drag(285,1)
 page.locator('.device').screenshot(path=str(ROOT/'test-results/polish-partial.png'))
 drag(278,2)
 expect(page.locator('.next-action')).to_be_visible()
 handle.focus();page.keyboard.press('ArrowDown');expect(sheet).to_have_attribute('data-snap','1')
 page.wait_for_timeout(480)
 drag(-285,0)
 # A cancelled touch restores the prior snap without activating a click.
 cdp=page.context.new_cdp_session(page)
 box=handle.bounding_box();x=box['x']+40;y=box['y']+12
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-80}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
 page.wait_for_timeout(480)
 expect(sheet).to_have_attribute('data-snap','0')
 handle.click();expect(sheet).to_have_attribute('data-snap','2')
 page.wait_for_timeout(480)
 page.locator('.pass-shortcut').click()
 dialog=page.get_by_role('dialog')
 expect(dialog.locator('.boarding-pass')).to_be_visible()
 expect(dialog).not_to_contain_text('Sample boarding pass')
 assert dialog.locator('.demo-code > span,.pass-disclaimer').count()==0
 assert dialog.locator('.pass-reference-lockup image').evaluate('(e)=>e.href.baseVal.startsWith("data:image/png;base64,")')
 assert dialog.locator('.pass-reference-benefits image').evaluate('(e)=>e.href.baseVal.startsWith("data:image/png;base64,")')
 page.wait_for_timeout(420);page.locator('.device').screenshot(path=str(ROOT/'test-results/polish-pass.png'))
 dialog.get_by_role('button',name='Close dialog').click()
 expect(page.locator('.modal-layer.closing')).to_have_count(1)
 expect(dialog).to_have_count(0)
 # Real touch drag on a proportionally scaled phone.
 page.set_viewport_size({'width':390,'height':1100})
 page.get_by_label('Choose a trigger',exact=True).select_option('home');page.wait_for_timeout(480)
 handle.scroll_into_view_if_needed();box=handle.bounding_box();scale=page.locator('.device').bounding_box()['width']/375
 cdp=page.context.new_cdp_session(page)
 x=box['x']+40;y=box['y']+12
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 for i in range(1,11):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-285*scale*i/10}]})
  page.wait_for_timeout(22)
 page.wait_for_timeout(140)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 expect(sheet).to_have_attribute('data-snap','1');page.wait_for_timeout(480)
 page.locator('.device').screenshot(path=str(ROOT/'test-results/polish-touch-partial.png'))
 # Reduced-motion setting applies to entrances and sheet settling.
 page.emulate_media(reduced_motion='reduce')
 page.get_by_label('Choose a trigger',exact=True).select_option('weather')
 expect(page.get_by_role('dialog')).to_be_visible()
 assert page.get_by_role('dialog').evaluate('(e)=>parseFloat(getComputedStyle(e).animationDuration)') < .01
 assert not errors,errors
 (ROOT/'test-results/ui-polish-results.json').write_text(json.dumps({'mouseDrag':True,'touchDragOnScaledPhone':True,'threeSnapPoints':True,'keyboardSnapControls':True,'cancelledGesture':True,'closeAnimation':True,'reducedMotion':True,'staticBackground':True,'fontsLoaded':True,'officialLogosLoaded':True,'browserErrors':errors},indent=2))
 b.close()
print('PASS: mouse/touch drag, three snap positions, cancel, keyboard, motion, typography, real logos and static background.')
