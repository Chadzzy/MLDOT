"""Scenario website: navigation, iPhone geometry and traveller interactions."""
import json
import re
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('JOURNEY_TEST_URL', 'http://127.0.0.1:5174/').split('#')[0]
OUT = Path(__file__).resolve().parents[1] / 'test-results'
OUT.mkdir(exist_ok=True)
passed = []
def done(name):
    passed.append(name)
    print('PASS:', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 1000}, device_scale_factor=1)
    errors, external = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: external.append(r.url) if urlparse(r.url).scheme in ('http','https') and urlparse(r.url).hostname not in ('127.0.0.1','localhost') else None)
    assert page.goto(BASE).status == 200
    dialog = lambda: page.get_by_role('dialog')
    def trigger(id):
        if page.viewport_size['width'] <= 760:
            page.get_by_label('Choose a trigger', exact=True).select_option(id)
        else:
            page.locator(f'.trigger-navigation a[href="#{id}"]').click()
        expect(page.locator(f'.trigger-navigation a[href="#{id}"]')).to_have_attribute('aria-current','page')
    expect(page.get_by_role('heading', name='Upcoming journey', exact=True)).to_be_visible()
    expect(page.get_by_role('heading', name='Recent searches', exact=True)).to_be_visible()
    expect(dialog()).to_have_count(0)
    assert page.locator('.device').evaluate('(e)=>[e.clientWidth,e.clientHeight]') == [375,812]
    assert page.locator('.studio-sidebar,.companion-sidebar,.mobile-demo-button').count() == 0
    assert page.locator('.trigger-navigation a').count() == 20
    assert page.locator('img[src$="hong-kong.svg"],img[src$="lounge.svg"]').count() == 0
    page.screenshot(path=str(OUT/'reference-site.png'), full_page=True)
    page.locator('.device').screenshot(path=str(OUT/'reference-home.png'))
    done('Reference homepage hierarchy, fixed iPhone screen and external trigger navigation')

    trigger('journey')
    expect(page.locator('.journey-sheet')).to_have_attribute('data-snap','2')
    expect(page.locator('.next-action')).to_contain_text('Head to the airport')
    expect(page.locator('.boarding-pass')).to_be_visible()
    page.locator('.device').screenshot(path=str(OUT/'reference-journey.png'))
    trigger('weather')
    expect(dialog().locator('.weather-segment')).to_have_count(1)
    expect(dialog().locator('.weather-card')).to_have_count(2)
    assert dialog().locator('.detail-sheet').count() == 0
    page.locator('.device').screenshot(path=str(OUT/'reference-weather.png'))
    dialog().get_by_role('button', name='Open boarding pass', exact=True).click()
    expect(dialog().locator('.boarding-pass')).to_be_visible()
    dialog().get_by_role('button', name='Back', exact=True).click()
    expect(dialog().locator('.weather-segment')).to_have_count(1)
    for _ in range(12):
        page.keyboard.press('Tab')
        assert page.evaluate('Boolean(document.activeElement.closest("[role=dialog]"))')
    page.keyboard.press('Escape')
    expect(dialog()).to_have_count(0)
    done('Reference journey sheet and weather modal; nested boarding pass and keyboard focus')

    trigger('entertainment')
    dialog().get_by_role('button', name='Save Above the clouds', exact=True).click()
    dialog().get_by_role('button', name='Save City after dark', exact=True).click()
    dialog().get_by_role('tab', name='Watch', exact=True).click()
    dialog().get_by_role('button', name='Save Perfect Days', exact=True).click()
    dialog().get_by_role('tab', name='Saved (3)', exact=True).click()
    dialog().get_by_role('button', name='Move Perfect Days up', exact=True).click()
    expect(dialog().locator('.media-item h3')).to_have_text(['Above the clouds','Perfect Days','City after dark'])
    dialog().get_by_role('button', name='Open boarding pass', exact=True).click()
    dialog().get_by_role('button', name='Back', exact=True).click()
    expect(dialog().get_by_role('tab', name='Saved (3)', exact=True)).to_have_attribute('aria-selected','true')
    page.reload()
    expect(dialog()).to_be_visible()
    dialog().get_by_role('tab', name='Saved (3)', exact=True).click()
    expect(dialog().locator('.media-item h3')).to_have_text(['Above the clouds','Perfect Days','City after dark'])
    done('Entertainment saves, reorders, preserves nested state and survives a deep-link reload')

    trigger('gate')
    expect(dialog()).to_have_count(0)
    expect(page.locator('.sheet-situation')).to_contain_text('Gate 62')
    expect(page.locator('.gate-inline')).to_be_visible()
    page.locator('.pass-shortcut').click()
    expect(dialog().locator('.pass-fields')).to_contain_text('62')
    trigger('delay')
    expect(dialog()).to_have_count(0)
    expect(page.locator('.estimate-row')).to_contain_text('Updating')
    page.locator('.device').screenshot(path=str(OUT/'reference-delay.png'))
    trigger('readiness')
    expect(dialog().get_by_role('heading',name='Is my aircraft ready?')).to_be_visible()
    trigger('connection')
    expect(dialog()).to_contain_text('50 mins')
    done('Trigger changes replace open modals; gate, delay, readiness and connection screens work')

    trigger('cancelled')
    page.locator('.pass-shortcut').click()
    expect(dialog().get_by_text('This flight is cancelled', exact=True)).to_be_visible()
    expect(dialog().locator('.demo-code')).to_have_count(0)
    trigger('recovery')
    dialog().get_by_label('Earliest arrival', exact=False).check()
    dialog().get_by_role('button', name='Find my recovery options', exact=True).click()
    expect(dialog().locator('.recovery-option h3').first).to_have_text('Finnair')
    dialog().get_by_role('button', name='Choose this option', exact=True).first.click()
    dialog().get_by_role('button', name='Save this recovery option', exact=True).click()
    expect(dialog().get_by_role('heading', name='Your choice is saved.')).to_be_visible()
    dialog().get_by_role('button', name='Open boarding pass', exact=True).click()
    expect(dialog().get_by_text('Original pass superseded', exact=True)).to_be_visible()
    trigger('recovered')
    expect(dialog()).to_contain_text('Qatar Airways')
    page.get_by_role('button', name='Reset journey',exact=True).click()
    expect(dialog()).to_have_count(0)
    assert page.evaluate('JSON.parse(localStorage.getItem("cathay-journey-demo-v1")).saved') == ['clouds','perfect','city']
    done('Cancellation and recovery lifecycle; reset retains entertainment')

    trigger('lounge')
    expect(dialog().locator('.included-note')).to_contain_text('Diamond membership')
    expect(dialog().locator('.lounge-row')).to_have_count(5)
    expect(dialog().get_by_role('heading', name='The Pier, First')).to_be_visible()
    assert dialog().get_by_label('Explore an access scenario').count() == 0
    assert not dialog().get_by_role('button', name='Purchase', exact=False).count()
    assert not dialog().get_by_role('button', name='View eligibility', exact=False).count()
    dialog().get_by_role('button', name='Get Directions', exact=False).click()
    expect(dialog()).to_contain_text('Near Gate 63')
    done('Cathay lounge access is applied to the traveller; included experience and directions, no purchase or eligibility step')

    for id in ['pass','directions','places','rest','documents','share','activity']:
        trigger(id)
        expect(dialog()).to_be_visible()
    expect(dialog()).to_contain_text('Web preview')
    trigger('home')
    page.go_back()
    expect(dialog()).to_be_visible()
    page.go_forward()
    expect(dialog()).to_have_count(0)
    done('Original 19 scenario routes work, including browser back and forward; live route is checked separately')

    for width in [320,375,390,430,768,1280,1600]:
        page.set_viewport_size({'width':width,'height':1000})
        assert page.locator('.device').evaluate('(e)=>[e.clientWidth,e.clientHeight]') == [375,812], width
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), width
    page.set_viewport_size({'width':390,'height':1000})
    page.screenshot(path=str(OUT/'reference-mobile-site.png'),full_page=True)
    trigger('weather')
    expect(dialog().get_by_role('heading', name='Here’s the outlook for your upcoming flight to Zurich')).to_be_visible()
    done('375 × 812 layout is preserved at 320–1600 browser widths; phone scales proportionally')
    assert not errors, errors
    assert not external, external
    done('No uncaught browser errors or external asset requests')
    (OUT/'browser-results.json').write_text(json.dumps({'passed':len(passed),'checks':passed,'browserErrors':errors,'externalRequests':external},indent=2))
    browser.close()
print(f'Completed {len(passed)} browser checks.',flush=True)
