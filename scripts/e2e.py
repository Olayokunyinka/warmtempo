from playwright.sync_api import sync_playwright
import json
res=[]
def ok(c,m): res.append(('PASS' if c else 'FAIL',m)); 
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1280,'height':900}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    reqs=[]; pg.on('request',lambda r: reqs.append(r.url))
    pg.goto('http://localhost:8787/'); pg.wait_for_timeout(800)
    ok(not any('googletagmanager' in u for u in reqs),'GA not loaded before consent')
    ok(pg.is_visible('#cb'),'consent banner visible')
    pg.click('[data-cb=yes]'); pg.wait_for_timeout(600)
    ok(any('googletagmanager.com/gtag/js?id=G-EW3BEJ1QB8' in u for u in reqs),'GA loads after Accept')
    ok(not pg.is_visible('#cb'),'banner hides')
    # conditional fields
    ok(not pg.is_visible('#f-platform'),'platform hidden initially')
    pg.select_option('#f-interest','Managed video production'); 
    ok(pg.is_visible('#f-platform') and pg.is_visible('#f-start'),'platform+starting shown for managed')
    pg.select_option('#f-interest','Learning YouTube automation')
    ok(not pg.is_visible('#f-platform') and not pg.is_visible('#f-start'),'hidden for learning')
    ok('learn' in pg.inner_text('#f-brief-l').lower(),'brief label changes')
    # validation
    pg.click('#f-submit'); ok(pg.is_visible('#f-email-err'),'email error shown')
    pg.fill('#f-email','bad'); pg.click('#f-submit'); ok('Check your email' in pg.inner_text('#f-email-err'),'malformed email error')
    # mocked success
    pg.route('**/api/register',lambda r: r.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True})))
    pg.fill('#f-email','ada@example.com'); pg.fill('#f-brief','hello'); pg.wait_for_timeout(100)
    pg.click('#f-submit'); pg.wait_for_selector('#f-status .ok',timeout=4000); ok(True,'success message shows')
    ok(pg.input_value('#f-email')=='','form resets after success')
    pg.unroute('**/api/register'); pg.route('**/api/register',lambda r: r.fulfill(status=429,content_type='application/json',body=json.dumps({'ok':False,'error':'Too many requests.'})))
    pg.fill('#f-email','ada@example.com'); pg.click('#f-submit'); pg.wait_for_selector('#f-status .bad'); ok('Too many' in pg.inner_text('#f-status'),'server error shown')
    # flow picker
    pg.click('.flow-b[data-i="3"]'); ok('Scenes and visuals' in pg.inner_text('#flow-t'),'flow picker updates')
    # hero sequence completes + returns idle
    pg.evaluate('window.scrollTo(0,0)'); pg.mouse.move(900,300); pg.wait_for_timeout(1800)
    ok('s-connect' in pg.get_attribute('#hero-stage','class') or 's-unfold' in pg.get_attribute('#hero-stage','class'),'hover starts hero sequence')
    pg.wait_for_timeout(7000); ok('s-idle' in pg.get_attribute('#hero-stage','class'),'hero returns to idle')
    ok(pg.locator('.a-sl').count()==8,'8 hero layers created')
    # tv layers lazy
    pg.evaluate("document.querySelector('#tv').scrollIntoView()"); pg.wait_for_timeout(800)
    ok(pg.locator('#tv-rot img[class^=tv-sl]').count()==14,'14 turntable layers created on scroll')
    pg.click('#tv-next'); pg.wait_for_timeout(500); ok('45' in (pg.evaluate("document.querySelector('#tv-rot').style.getPropertyValue('--ry')") or ''),'turntable turns')
    # mobile menu
    m=b.new_page(viewport={'width':390,'height':844}); m.goto('http://localhost:8787/'); m.wait_for_timeout(500)
    m.click('[data-cb=no]'); m.click('.menu-btn'); ok(m.is_visible('#primary-links'),'mobile menu opens'); 
    ow=m.evaluate('document.documentElement.scrollWidth'); ok(ow<=390,f'no horizontal overflow at 390 ({ow})')
    m2=b.new_page(viewport={'width':320,'height':700}); m2.goto('http://localhost:8787/'); m2.wait_for_timeout(500)
    ow=m2.evaluate('document.documentElement.scrollWidth'); ok(ow<=320,f'no horizontal overflow at 320 ({ow})')
    for path in ['/privacy','/terms','/contact','/thanks','/nope']:
        q=b.new_page(); r=q.goto('http://localhost:8787'+path); ok(r.status in (200,404),f'{path} loads ({r.status})'); q.close()
    ok(not errs,'no console errors: '+str(errs)); b.close()
for s,m in res: print(s,m)
