(function () {
  'use strict';
  var d = document, w = window;
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  var root = $('#wt');
  var rm = false;
  try { rm = w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (rm) root.classList.add('rm');

  /* ---------- analytics: Google Analytics with Consent Mode (no cookies until Accept) ---------- */
  var GA = '__GA4__';
  var cb = $('#cb');
  function store(v) { try { if (v) localStorage.setItem('wt-consent', v); else return localStorage.getItem('wt-consent'); } catch (e) {} return null; }
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  var c = store();
  if (c === 'yes') w.gtag('consent', 'update', { analytics_storage: 'granted' });
  w.gtag('js', new Date()); w.gtag('config', GA);
  function setConsent(v) { w.gtag('consent', 'update', { analytics_storage: v === 'yes' ? 'granted' : 'denied' }); }
  function showCb() { if (cb) cb.hidden = false; }
  if (!c) showCb();
  if (cb) cb.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cb]'); if (!b) return;
    var v = b.getAttribute('data-cb'); store(v); cb.hidden = true; setConsent(v);
  });
  $$('[data-cookie-settings]').forEach(function (b) { b.addEventListener('click', showCb); });
  function track(name) { try { w.gtag('event', name); } catch (e) {} }

  /* ---------- mobile menu ---------- */
  var mb = $('.menu-btn'), nl = $('#primary-links');
  if (mb && nl) {
    mb.addEventListener('click', function () {
      var o = nl.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    nl.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nl.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- hero story animation ---------- */
  var stg = $('#hero-stage');
  if (stg) {
    var art = $('#hero-art'), tilt = $('#a-tilt'), front = $('.a-front', tilt);
    var rail = $$('#rail .rail-b'), capEl = $('#rail-cap'), portal = $('#portal'), top = $('#top');
    var S = { phase: 'idle', stage: -1, wink: false }, timers = [];
    var base = [
      ['Script', 'Start from an idea, a title or a script.'],
      ['Voiceover', 'Your script is turned into a voiceover.'],
      ['Scene visuals', 'Visuals are shaped around the story.'],
      ['Video assembly', 'Everything comes together as a finished video, ready to export.']
    ];
    var lastCap = '';
    function render() {
      stg.className = 'art-wrap stage s-' + S.phase + ' on-' + (S.stage >= 0 ? S.stage : 'n') + ((S.wink && !rm) ? ' wk-on' : '');
      rail.forEach(function (r, i) {
        var on = S.stage === i; r.classList.toggle('on', on); r.setAttribute('aria-current', on ? 'step' : 'false');
      });
      var t, x, p = S.phase;
      if (p === 'idle') { t = 'Meet Tempo.'; x = 'Move your mouse over him to see how a story moves from idea to finished video. On a touch screen, tap the portal.'; }
      else if (p === 'attentive') { t = 'Tempo has noticed you.'; x = 'Move onto the artwork to start, or select the portal.'; }
      else if (p === 'unfold') { t = 'Unfolding…'; x = 'The story portal opens into four connected stages.'; }
      else if (p === 'connect') { var b = base[Math.max(0, S.stage)]; t = 'Stage ' + (Math.max(0, S.stage) + 1) + ' of 4: ' + b[0] + '.'; x = b[1]; }
      else { t = 'Complete.'; x = 'The story becomes a finished video. (Illustration only.)'; }
      var key = t + x;
      if (key !== lastCap) { lastCap = key; capEl.innerHTML = ''; var s = d.createElement('strong'); s.textContent = t; capEl.appendChild(s); capEl.appendChild(d.createTextNode(' ' + x)); }
      portal.setAttribute('aria-label', (p === 'idle' || p === 'attentive') ? 'Play the story animation' : 'Story animation playing');
    }
    function set(o) { for (var k in o) S[k] = o[k]; render(); }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function step(i, ms) {
      later(function () {
        if (i < 3) { set({ stage: i + 1 }); step(i + 1, 780); }
        else { set({ phase: 'complete' }); later(function () { set({ phase: 'idle', stage: -1, wink: false }); }, 4200); }
      }, ms);
    }
    function activate() {
      clear();
      if (rm) { set({ phase: 'complete', stage: 3 }); return; }
      set({ phase: 'unfold', stage: -1, wink: true });
      later(function () { set({ wink: false }); }, 1100);
      later(function () { set({ phase: 'connect', stage: 0 }); }, 620);
      step(0, 1400);
    }
    function idleish() { return S.phase === 'idle' || S.phase === 'attentive'; }
    function hoverIn() { if (idleish()) activate(); }
    function hoverOut() { if (S.phase === 'attentive') set({ phase: 'idle' }); }
    top.addEventListener('mouseenter', hoverIn);
    top.addEventListener('mouseleave', hoverOut);
    portal.addEventListener('click', hoverIn);
    portal.addEventListener('focus', function () { if (S.phase === 'idle') set({ phase: 'attentive' }); });
    portal.addEventListener('blur', hoverOut);
    art.addEventListener('mousemove', function (e) {
      if (rm) return;
      if (S.phase === 'idle') hoverIn();
      var r = art.getBoundingClientRect();
      art.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 34).toFixed(2));
      art.style.setProperty('--rx', ((-((e.clientY - r.top) / r.height - 0.5)) * 10).toFixed(2));
    });
    art.addEventListener('mouseleave', function () { art.style.setProperty('--ry', '0'); art.style.setProperty('--rx', '0'); hoverOut(); });
    // decorative thickness layers, added after load so they never compete with the hero image
    function layers() {
      for (var i = 0; i < 8; i++) {
        var im = new Image(300, 555); im.className = 'a-sl a-sl' + i; im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.decoding = 'async'; im.src = '/img/tempo-layer.webp';
        tilt.insertBefore(im, front);
      }
    }
    if (!rm) { if (w.requestIdleCallback) w.requestIdleCallback(layers, { timeout: 2500 }); else setTimeout(layers, 1200); }
    render();
  }

  /* ---------- how-it-works step picker ---------- */
  var flow = $('#flow');
  if (flow) {
    var fb = $$('.flow-b', flow), fk = $('#flow-k'), ft = $('#flow-t'), fx = $('#flow-x');
    var fd = [
      ['Idea or script', 'Start where you are: an idea, a working title or a finished script.'],
      ['Script development', 'An idea or a title is shaped into a script.'],
      ['Narration', 'Your script is turned into a voiceover.'],
      ['Scenes and visuals', 'Visuals are shaped around the story.'],
      ['Video assembly and export', 'Everything is assembled into a finished video, ready to export.']
    ];
    flow.addEventListener('click', function (e) {
      var b = e.target.closest('.flow-b'); if (!b) return;
      var i = +b.getAttribute('data-i');
      fb.forEach(function (x, k) { x.classList.toggle('on', k === i); x.setAttribute('aria-current', k === i ? 'step' : 'false'); });
      fk.textContent = 'Step ' + (i + 1) + ' of 5'; ft.textContent = fd[i][0]; fx.textContent = fd[i][1];
    });
  }

  /* ---------- Tempo turntable ---------- */
  var tv = $('#tv');
  if (tv) {
    var rot = $('#tv-rot'), tfront = $('.tv-front', rot);
    var A = { ry: 0, rx: 0 }, drag = null, dragged = false, spinT = null;
    var spinBtn = $('#tv-spin');
    var apply = function (smooth) {
      rot.style.transition = smooth ? 'transform 420ms cubic-bezier(.22,.8,.3,1)' : '';
      rot.style.setProperty('--ry', A.ry.toFixed(2)); rot.style.setProperty('--rx', A.rx.toFixed(2));
    };
    var stopSpin = function () {
      if (spinT) { clearInterval(spinT); spinT = null; }
      spinBtn.textContent = 'Spin'; spinBtn.setAttribute('aria-pressed', 'false');
    };
    var tvLayers = function () {
      for (var i = 0; i < 14; i++) {
        var im = new Image(300, 555); im.className = 'tv-sl' + i; im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.decoding = 'async'; im.loading = 'lazy'; im.src = '/img/tempo-layer.webp';
        rot.insertBefore(im, tfront);
      }
    };
    if ('IntersectionObserver' in w) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); tvLayers(); } }, { rootMargin: '400px' });
      io.observe(tv);
    } else tvLayers();
    tv.addEventListener('pointerdown', function (e) {
      stopSpin(); drag = { x: e.clientX, y: e.clientY, ry: A.ry, rx: A.rx }; dragged = true;
      try { tv.setPointerCapture(e.pointerId); } catch (x) {}
    });
    tv.addEventListener('pointermove', function (e) {
      if (drag) {
        A.ry = drag.ry + (e.clientX - drag.x) * 0.7;
        A.rx = Math.max(-70, Math.min(70, drag.rx - (e.clientY - drag.y) * 0.45)); apply(false);
      } else if (!dragged && !spinT && !rm) {
        var r = tv.getBoundingClientRect();
        A.ry = ((e.clientX - r.left) / r.width - 0.5) * 80; A.rx = -((e.clientY - r.top) / r.height - 0.5) * 50; apply(false);
      }
    });
    var up = function () { drag = null; };
    tv.addEventListener('pointerup', up); tv.addEventListener('pointercancel', up);
    tv.addEventListener('pointerleave', function () { drag = null; if (!dragged && !spinT) { A.ry = 0; A.rx = 0; apply(true); } });
    var turn = function (n) { stopSpin(); dragged = true; A.ry += n; apply(true); };
    $('#tv-prev').addEventListener('click', function () { turn(-45); });
    $('#tv-next').addEventListener('click', function () { turn(45); });
    spinBtn.addEventListener('click', function () {
      if (spinT) { stopSpin(); return; }
      if (rm) return;
      dragged = true; spinBtn.textContent = 'Stop'; spinBtn.setAttribute('aria-pressed', 'true');
      spinT = setInterval(function () { A.ry += 1.6; apply(false); }, 24);
    });
    $('#tv-reset').addEventListener('click', function () { stopSpin(); dragged = false; A = { ry: 0, rx: 0 }; apply(true); });
  }

  /* ---------- registration form ---------- */
  var form = $('#reg-form');
  if (form) {
    var ts = $('#f-ts'); if (ts) ts.value = String(Date.now());
    var si = $('#f-interest'), note = $('#f-interest-note'), bl = $('#f-brief-l');
    var when = $$('[data-when]', form);
    var notes = {
      'Managed faceless channel': 'Just a few quick questions about where your videos will live.',
      'Managed video production': 'Tell us where the videos are going and what you’re starting with.',
      'Using the platform myself': 'Self-service isn’t open yet. Tell us what you’d want to make.',
      'One-on-one consultation': 'Nothing else to pick. Just tell us what you’d like to talk about.',
      'Learning YouTube automation': 'No project details needed. Just tell us what you want to learn.',
      'Not sure yet': 'That’s fine. Share whatever is on your mind.'
    };
    var P = ['Managed faceless channel', 'Managed video production', 'Using the platform myself'], T = ['Managed faceless channel', 'Managed video production'];
    var sync = function () {
      var v = si.value;
      when.forEach(function (f) {
        var k = f.getAttribute('data-when'), show = (k === 'platform' ? P : T).indexOf(v) >= 0;
        f.hidden = !show; $$('select', f).forEach(function (s) { s.disabled = !show; });
      });
      $$('.f-grid', form).forEach(function (g) { var kids = $$('[data-when]', g); if (kids.length) g.hidden = kids.every(function (k) { return k.hidden; }); });
      note.textContent = notes[v] || 'Pick one and we’ll only ask what’s relevant.';
      bl.textContent = v === 'One-on-one consultation' ? 'What would you like to talk about?' : (v === 'Learning YouTube automation' ? 'What would you like to learn?' : 'Tell us briefly about your project');
    };
    si.addEventListener('change', sync); sync();
    var br = $('#f-brief'), bn = $('#f-brief-n');
    br.addEventListener('input', function () { bn.textContent = br.value.length + ' / 1000'; });
    var em = $('#f-email'), ee = $('#f-email-err'), be = $('#f-brief-err'), st = $('#f-status'), sb = $('#f-submit');
    var tsLoaded = false;
    form.addEventListener('focusin', function () {
      if (tsLoaded || !$('.cf-turnstile', form)) return; tsLoaded = true;
      var s = d.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true; d.head.appendChild(s);
    });
    function err(el, input, msg) { el.textContent = msg || ''; el.hidden = !msg; if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = em.value.trim(), bad = false;
      if (!v) { err(ee, em, 'Enter your email address so the team knows where to reach you.'); bad = true; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { err(ee, em, 'Check your email address. It should look like name@example.com.'); bad = true; }
      else err(ee, em, '');
      if (br.value.length > 1000) { err(be, br, 'Please keep your brief to 1000 characters or fewer.'); bad = true; } else err(be, br, '');
      st.innerHTML = '';
      if (bad) { (ee.hidden ? br : em).focus(); return; }
      sb.disabled = true; sb.textContent = 'Sending…';
      var msg = function (cls, t) { var p = d.createElement('div'); p.className = cls; p.textContent = t; st.appendChild(p); };
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
        .then(function (r) {
          if (r.ok) {
            form.reset(); sync(); bn.textContent = '0 / 1000'; ts.value = String(Date.now());
            msg('ok', 'Thank you. Your interest is registered. We’ll send an acknowledgement to the email address you gave, and we’ll contact you if your project fits the next phase.');
            track('generate_lead');
          } else msg('bad', (r.j && r.j.error) || 'Something went wrong and your request was not sent. Please try again, or email hello@warmtempo.com.');
        })
        .catch(function () { msg('bad', 'We couldn’t reach the server. Please try again, or email hello@warmtempo.com.'); })
        .then(function () { sb.disabled = false; sb.textContent = 'Register my interest'; st.scrollIntoView({ block: 'nearest' }); if (w.turnstile) try { w.turnstile.reset(); } catch (x) {} });
    });
  }
})();
