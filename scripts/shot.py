import sys
from playwright.sync_api import sync_playwright
url=sys.argv[1]; out=sys.argv[2]; w=int(sys.argv[3]); h=int(sys.argv[4]); full=sys.argv[5]=='full'
act=sys.argv[6] if len(sys.argv)>6 else ''
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':w,'height':h})
    errs=[]; pg.on('console',lambda m: errs.append(m.text) if m.type in('error','warning') else None); pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(1200)
    if act=='hover':
        pg.mouse.move(w*0.7,300); pg.wait_for_timeout(2300)
    if act=='consent': pg.click('[data-cb=no]'); pg.wait_for_timeout(200)
    pg.screenshot(path=out,full_page=full)
    print('errors:',errs); b.close()
