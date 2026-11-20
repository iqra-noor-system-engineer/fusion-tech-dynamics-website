(function(){
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.add('no-gsap');

  /* ---------- form delivery (FormSubmit) ----------
     Both forms post here. The first submission sends an "Activate Form" email to
     FORM_EMAIL; nothing is delivered until that link is clicked. */
  var FORM_EMAIL = 'contact@fusiontechdynamics.com';
  function sendForm(form, subject){
    var data = new FormData(form);
    data.append('_subject', subject);
    data.append('_template', 'table');
    return fetch('https://formsubmit.co/ajax/' + FORM_EMAIL, { method: 'POST', headers: { 'Accept': 'application/json' }, body: data })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){
        if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || ('HTTP ' + r.status));
        return j;
      }); });
  }
  var SEND_FAIL = 'Sorry, your message could not be sent. Please try again, or email us at ' + FORM_EMAIL + '.';

  /* ---------- loader + smooth scroll ---------- */
  var loader = document.getElementById('loader');
  if (loader && root.classList.contains('seen')) { loader.remove(); loader = null; }
  try { sessionStorage.setItem('ftdSeen', '1'); } catch (e) {}
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({duration:1.15, easing:function(t){ return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel:true});
    if (window.gsap && window.ScrollTrigger) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function(t){ lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(performance.now()); }
    document.querySelectorAll('a[href^="#"]').forEach(function(a){ a.addEventListener('click', function(e){ var id = a.getAttribute('href'); var t = id.length > 1 && document.querySelector(id); if (!t) return; e.preventDefault(); lenis.scrollTo(t, {offset: id === '#top' ? 0 : -76, duration:1.4}); }); });
  }
  function finishLoader(){
    if (!loader || loader.dataset.done) return; loader.dataset.done = '1';
    var go = function(){ loader.remove(); if (lenis) lenis.start(); if (window.__heroTl) window.__heroTl.play(); };
    if (window.gsap && !reduce) gsap.to(loader, {yPercent:-100, duration:.9, ease:'expo.inOut', onComplete:go}); else go();
  }
  if (loader) {
    if (reduce || !window.gsap) { loader.remove(); }
    else {
      if (lenis) lenis.stop();
      var lp = {v:0};
      gsap.to(lp, {v:100, duration:.85, ease:'power2.inOut', onUpdate:function(){ document.getElementById('ldNum').textContent = Math.round(lp.v) + '%'; document.getElementById('ldBar').style.transform = 'scaleX(' + lp.v / 100 + ')'; }, onComplete:function(){ setTimeout(finishLoader, 150); }});
      setTimeout(finishLoader, 2500);
    }
  }

  /* header, progress, current section */
  var hdr = document.getElementById('hdr'), bar = document.getElementById('progress');
  function onScroll(){
    var y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle('solid', y > 40);
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    if (window.__toTop) window.__toTop(y, h);
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  var links = document.querySelectorAll('.nav a[href^="#"]:not(.nav-cta)');
  if ('IntersectionObserver' in window){
    var nio = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) links.forEach(function(l){ l.getAttribute('href') === '#' + e.target.id ? l.setAttribute('aria-current','true') : l.removeAttribute('aria-current'); }); }); }, {rootMargin:'-45% 0px -50% 0px'});
    ['services','lab','projects','products','team','contact'].forEach(function(id){ var s=document.getElementById(id); s && nio.observe(s); });
  }

  /* mobile menu */
  var mb = hdr.querySelector('.menu-btn');
  function setMenu(o){ hdr.classList.toggle('open', o); mb.setAttribute('aria-expanded', String(o)); mb.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); document.body.style.overflow = o ? 'hidden' : ''; }
  mb.addEventListener('click', function(){ setMenu(!hdr.classList.contains('open')); });
  document.querySelectorAll('.nav a').forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });
  addEventListener('keydown', function(e){ if (e.key === 'Escape' && hdr.classList.contains('open')) { setMenu(false); mb.focus(); } });

  /* video: pause when reduced motion */
  var vid = document.getElementById('heroVideo');
  // hero loop plays faster than it was rendered: ~6 s per scene instead of 10
  var HERO_RATE = window.HERO_RATE = 1.7;
  if (vid && !reduce) {
    var setRate = function(){ try { vid.defaultPlaybackRate = HERO_RATE; vid.playbackRate = HERO_RATE; } catch (e) {} };
    setRate(); vid.addEventListener('loadedmetadata', setRate); vid.addEventListener('play', setRate);
  }
  if (reduce && vid) { vid.removeAttribute('autoplay'); vid.pause(); }
  else if (vid && 'IntersectionObserver' in window) new IntersectionObserver(function(es){ if (es[0].isIntersecting) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function(){}); } else vid.pause(); }).observe(vid);

  /* hero video scenes: switcher, finger swipe, and an event the headline listens to */
  (function(){
    var v = document.getElementById('heroVideo'), box = document.querySelector('.hero .scenes'); if (!v || !box) return;
    var hero = box.closest('.hero'), btns = box.querySelectorAll('.scn'), bars = box.querySelectorAll('.scn-bar b'), cur = -1;
    var stats = hero.querySelectorAll('.stat'), STAT_FOR = [2, 3, 1]; // rate table -> 3-axis, Orvex -> own products, PCB -> 8-layer
    // scene boundaries sit mid-swipe in the 30 s loop
    var B1 = 10, B2 = 20, B3 = 29.3, LOOP = 30, SEEK = [28.8, 9.5, 19.5];
    function sceneAt(t){ return t < B1 ? 0 : t < B2 ? 1 : t < B3 ? 2 : 0; }
    function progress(t, s){ return s === 1 ? (t - B1) / (B2 - B1) : s === 2 ? (t - B2) / (B3 - B2) : ((t >= B3 ? t - B3 : t + (LOOP - B3)) / (B1 + LOOP - B3)); }
    function sync(){
      var t = v.currentTime || 0, s = sceneAt(t);
      if (s !== cur) {
        cur = s;
        for (var i = 0; i < btns.length; i++) { btns[i].classList.toggle('is-on', i === s); btns[i].setAttribute('aria-pressed', i === s ? 'true' : 'false'); }
        for (var q = 0; q < stats.length; q++) stats[q].classList.toggle('is-live', q === STAT_FOR[s]);
        try { window.dispatchEvent(new CustomEvent('heroscene', {detail:s})); } catch (e) {}
      }
      for (var j = 0; j < bars.length; j++) bars[j].style.transform = 'scaleX(' + (j === s ? Math.max(0, Math.min(1, progress(t, s))).toFixed(3) : 0) + ')';
    }
    v.addEventListener('timeupdate', sync); v.addEventListener('seeked', sync); sync();
    // jump to the start of the swipe baked into the video, so a switch is the same swipe
    function go(s){
      if (s === cur) return;
      try { v.currentTime = SEEK[s]; } catch (e) {}
      var pr = v.play && v.play(); if (pr && pr.catch) pr.catch(function(){});
    }
    for (var i = 0; i < btns.length; i++) (function(b){ b.addEventListener('click', function(){ go(+b.dataset.scene); }); })(btns[i]);
    var sx = 0, sy = 0, st = 0;
    hero.addEventListener('touchstart', function(e){ var t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, {passive:true});
    hero.addEventListener('touchend', function(e){
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st < 700 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && !e.target.closest('a, button')) go((cur + (dx < 0 ? 1 : 2)) % 3);
    }, {passive:true});
  })();

  /* magnetic buttons */
  if (matchMedia('(hover:hover)').matches && !reduce) {
    document.querySelectorAll('.magnetic').forEach(function(b){
      b.addEventListener('mousemove', function(e){ var r=b.getBoundingClientRect(); var x=(e.clientX-r.left-r.width/2)*.18, y=(e.clientY-r.top-r.height/2)*.28; b.style.transform='translate('+x+'px,'+y+'px)'; });
      b.addEventListener('mouseleave', function(){ b.style.transform=''; });
    });
  }

  /* orvex: before/after toggle, band tracking line */
  (function(){
    var ba = document.getElementById('oxBA');
    if (ba) {
      var tabs = ba.querySelectorAll('.ba-tabs button'), k = 0, user = false;
      var set = function(n){ k = n; ba.classList.toggle('after', n === 1); tabs.forEach(function(t, j){ t.setAttribute('aria-selected', String(j === n)); }); };
      tabs.forEach(function(t, j){ t.addEventListener('click', function(){ user = true; set(j); }); });
      if (!reduce) setInterval(function(){ if (!user && !document.hidden) set(1 - k); }, 4200);
    }
    var ov = document.querySelector('.bd-ov');
    if (ov) { if (!('IntersectionObserver' in window) || reduce) ov.classList.add('in'); else { var io = new IntersectionObserver(function(es){ if (es[0].isIntersecting) { ov.classList.add('in'); io.disconnect(); } }, {threshold:.4}); io.observe(ov); } }
  })();

  /* orvex hero: REC timestamp ticks */
  (function(){ var t = document.getElementById('ohTime'); if (!t) return; var s0 = Date.now(); setInterval(function(){ var d = Math.floor((Date.now() - s0) / 1000) + 3723, p = function(n){ return (n < 10 ? '0' : '') + n; }; t.textContent = p(Math.floor(d / 3600) % 24) + ':' + p(Math.floor(d / 60) % 60) + ':' + p(d % 60); }, 1000); })();

  /* orvex: See → Connect → Respond pipeline, in sync with the three cards */
  (function(){
    var pp = document.getElementById('orvexPipe'); if (!pp) return;
    var cams = pp.querySelectorAll('.pp-cam'), links = pp.querySelectorAll('.pp-link:not(.out)'), pks = pp.querySelectorAll('.pp-pk:not(.out)'), out = pp.querySelector('.pp-pk.out');
    var grid = pp.nextElementSibling && pp.nextElementSibling.classList.contains('how-grid') ? pp.nextElementSibling : null, cards = grid ? grid.querySelectorAll('.how') : [];
    if (grid) grid.classList.add('live');
    var timers = [], vis = false, running = false;
    function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
    function shoot(el){ el.classList.remove('go'); void el.getBoundingClientRect(); el.classList.add('go'); }
    function phase(k){ pp.setAttribute('data-phase', k); for (var j = 0; j < cards.length; j++) cards[j].classList.toggle('on', j === k); }
    function cycle(){
      timers.forEach(clearTimeout); timers = []; if (!vis) { running = false; return; } running = true;
      phase(0); cams.forEach(function(c){ c.classList.remove('on'); }); links.forEach(function(l){ l.classList.remove('on'); });
      [0, 1, 2, 3].forEach(function(i){ later(function(){ cams[i].classList.add('on'); links[i].classList.add('on'); shoot(pks[i]); }, 300 + i * 650); });
      later(function(){ phase(1); }, 3200);
      later(function(){ phase(2); shoot(out); }, 6200);
      later(cycle, 9600);
    }
    if (reduce) { phase(2); cams.forEach(function(c){ c.classList.add('on'); }); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; if (vis && !running) cycle(); }, {threshold:.25}).observe(pp);
    else { vis = true; cycle(); }
  })();

  /* services hero: the orbit lights one discipline at a time */
  (function(){
    var orb = document.querySelector('.sv-orbit'); if (!orb) return;
    var nodes = [].slice.call(orb.querySelectorAll('.orb-node')), sps = [].slice.call(orb.querySelectorAll('.orb-sp')), i = 0, hov = false;
    function on(k){ nodes.forEach(function(n, j){ n.classList.toggle('on', j === k); }); sps.forEach(function(l, j){ l.classList.toggle('on', j === k); }); }
    on(0);
    nodes.forEach(function(n, k){ n.addEventListener('mouseenter', function(){ hov = true; i = k; on(k); }); n.addEventListener('mouseleave', function(){ hov = false; }); });
    if (!reduce) setInterval(function(){ if (!hov && !document.hidden) { i = (i + 1) % nodes.length; on(i); } }, 1700);
    var svg = orb.querySelector('.orb-svg'), ang = 0, lastT = 0, vis = true;
    function place(){ var R = orb.offsetWidth * .38; nodes.forEach(function(n, k){ var a = (k * 45 + ang) * Math.PI / 180; n.style.transform = 'translate(' + (Math.sin(a) * R).toFixed(1) + 'px,' + (-Math.cos(a) * R).toFixed(1) + 'px)'; }); svg.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)'; }
    function frame(t){ var dt = lastT ? Math.min(.1, (t - lastT) / 1000) : 0; lastT = t; if (!hov) ang = (ang + dt * 5) % 360; place(); if (vis) requestAnimationFrame(frame); else lastT = 0; }
    place();
    if (!reduce) { if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !vis) { vis = true; requestAnimationFrame(frame); } vis = v; }).observe(orb); requestAnimationFrame(frame); }
    addEventListener('resize', place);
  })();

  /* services page: colour per discipline, index progress, wave that follows the discipline in view */
  (function(){
    var idx = document.querySelector('.sd-index'); if (!idx) return;
    var C = {mechanical:['#f59e0b','#fb7185'], pcb:['#22c55e','#14b8a6'], embedded:['#06b6d4','#3b82f6'], ai:['#8b5cf6','#ec4899'], software:['#3b82f6','#22d3ee'], aerospace:['#6366f1','#0ea5e9'], automation:['#f97316','#14b8a6'], rf:['#ec4899','#8b5cf6']};
    var cards = [].slice.call(document.querySelectorAll('.sd')), links = [].slice.call(idx.querySelectorAll('a'));
    cards.forEach(function(c){ var k = C[c.id]; if (k) { c.style.setProperty('--sc', k[0]); c.style.setProperty('--sc2', k[1]); } });
    links.forEach(function(a){ var k = C[a.getAttribute('href').slice(1)]; if (k) a.style.setProperty('--sc', k[0]); });
    var sec = idx.closest('section'); if (sec && typeof svcWave === 'function') svcWave(sec, {alpha:.75, hole:[.2,.45,.18], pal:[C.mechanical]});
    var cur = '';
    if ('MutationObserver' in window) links.forEach(function(a){ new MutationObserver(function(){ if (a.classList.contains('on')) { var id = a.getAttribute('href').slice(1); if (id !== cur && C[id]) { cur = id; try { document.dispatchEvent(new CustomEvent('svccolor', {detail:C[id]})); } catch (e) {} } } }).observe(a, {attributes:true, attributeFilter:['class']}); });
    if (window.gsap && window.ScrollTrigger && !reduce) {
      gsap.registerPlugin(ScrollTrigger);
      var list = document.querySelector('.sd-list');
      if (list) gsap.fromTo(idx, {'--ip':0}, {'--ip':1, ease:'none', scrollTrigger:{trigger:list, start:'top 60%', end:'bottom 60%', scrub:true}});
      cards.forEach(function(c){
        var tl = gsap.timeline({scrollTrigger:{trigger:c, start:'top 80%'}});
        tl.fromTo(c.querySelector('.sd-img'), {clipPath:'inset(0% 100% 0% 0%)'}, {clipPath:'inset(0% 0% 0% 0%)', duration:1.2, ease:'expo.inOut'})
          .from(c.querySelectorAll('.sd-body li'), {y:16, opacity:0, duration:.7, ease:'expo.out', stagger:.05}, .5)
          .from(c.querySelectorAll('.sd-body .chips span'), {scale:.6, opacity:0, duration:.6, ease:'back.out(2)', stagger:.05}, .9);
      });
    }
  })();

  /* values: each row draws its icon as it comes into view */
  (function(){
    var rows = document.querySelectorAll('.val-row'); if (!rows.length) return;
    if (!('IntersectionObserver' in window) || reduce) { rows.forEach(function(r){ r.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, {rootMargin:'0px 0px -20% 0px'});
    rows.forEach(function(r){ io.observe(r); });
  })();

  /* products: the demo / photo side of each card opens that product's page */
  (function(){
    var PAGE = ['orvex.html', 'recura.html', 'cubbo.html'];
    document.querySelectorAll('#stack .prod').forEach(function(card, i){
      var media = card.querySelector('.prod-media'); if (!media || !PAGE[i]) return;
      media.classList.add('is-link'); media.setAttribute('role', 'link'); media.tabIndex = 0;
      media.setAttribute('aria-label', 'Open the ' + PAGE[i].replace('.html', '') + ' page');
      var go = function(e){ if (e.target.closest('a, button')) return; location.href = PAGE[i]; };
      media.addEventListener('click', go);
      media.addEventListener('keydown', function(e){ if (e.key === 'Enter') go(e); });
    });
  })();

  /* projects: "View" opens a detail panel */
  (function(){
    var cards = document.querySelectorAll('.proj'); if (!cards.length) return;
    var m = document.createElement('div'); m.className = 'pm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'pmTitle'); m.hidden = true;
    m.innerHTML = '<div class="pm-back" data-close></div><div class="pm-box"><button class="pm-x" type="button" aria-label="Close" data-close>&times;</button><div class="pm-img"><img alt=""></div><div class="pm-body"><span class="tag"></span><h3 id="pmTitle"></h3><p></p><div class="pm-acts"><a class="btn btn-primary" href="#contact" data-close>Discuss a similar system <span class="arr" aria-hidden="true">→</span></a><span class="pm-nav"><button type="button" class="pm-prev" aria-label="Previous system">←</button><button type="button" class="pm-next" aria-label="Next system">→</button></span></div></div></div>';
    document.body.appendChild(m);
    var img = m.querySelector('.pm-img img'), tag = m.querySelector('.pm-body .tag'), h = m.querySelector('#pmTitle'), para = m.querySelector('.pm-body p'), cur = 0, last = null;
    function fill(i){ cur = (i + cards.length) % cards.length; var c = cards[cur], ci = c.querySelector('img');
      img.src = ci.currentSrc || ci.src; img.alt = ci.alt; tag.className = c.querySelector('.tag').className; tag.textContent = c.querySelector('.tag').textContent;
      h.textContent = c.querySelector('h3').textContent; para.textContent = c.querySelector('p').textContent; m.querySelector('.pm-box').classList.remove('swap'); void m.offsetWidth; m.querySelector('.pm-box').classList.add('swap'); }
    function open(i){ last = document.activeElement; fill(i); m.hidden = false; requestAnimationFrame(function(){ m.classList.add('on'); }); document.documentElement.classList.add('pm-lock'); if (lenis) lenis.stop(); m.querySelector('.pm-x').focus(); }
    function close(){ m.classList.remove('on'); document.documentElement.classList.remove('pm-lock'); if (lenis) lenis.start(); setTimeout(function(){ m.hidden = true; }, 350); if (last && last.focus) last.focus(); }
    cards.forEach(function(c, i){ c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'View ' + c.querySelector('h3').textContent);
      c.addEventListener('click', function(){ open(i); });
      c.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } }); });
    m.addEventListener('click', function(e){ if (e.target.closest('[data-close]')) close(); });
    m.querySelector('.pm-prev').addEventListener('click', function(){ fill(cur - 1); });
    m.querySelector('.pm-next').addEventListener('click', function(){ fill(cur + 1); });
    addEventListener('keydown', function(e){ if (m.hidden) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') fill(cur + 1); else if (e.key === 'ArrowLeft') fill(cur - 1); });
  })();

  /* footer: wordmark spotlight */
  (function(){
    var fw = document.querySelector('.foot-word');
    if (fw && matchMedia('(hover:hover)').matches) {
      fw.addEventListener('pointermove', function(e){ var r = fw.getBoundingClientRect(); fw.style.setProperty('--wx', (e.clientX - r.left) + 'px'); fw.style.setProperty('--wy', (e.clientY - r.top) + 'px'); });
      fw.addEventListener('pointerleave', function(){ fw.style.setProperty('--wx', '-300px'); });
    }
  })();

  /* navbar: Company dropdown (click / tap / keyboard; hover handled in CSS) */
  document.querySelectorAll('.nav-dd').forEach(function(dd){
    var btn = dd.querySelector('.nav-dd-btn');
    btn.addEventListener('click', function(e){ e.stopPropagation(); var o = !dd.classList.contains('open'); dd.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', function(e){ if (!dd.contains(e.target)) { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    dd.addEventListener('keydown', function(e){ if (e.key === 'Escape') { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  });

  /* careers: "Apply for this role" fills the form; simple validation and a thank-you state */
  (function(){
    var f = document.getElementById('careersForm'); if (!f) return;
    var sel = f.querySelector('#c-role'), status = f.querySelector('.cr-status');
    document.querySelectorAll('[data-role]').forEach(function(b){ b.addEventListener('click', function(){
      sel.value = b.getAttribute('data-role');
      var y = f.getBoundingClientRect().top + scrollY - 110;
      if (lenis) lenis.scrollTo(y, {duration:1.1}); else scrollTo({top:y, behavior:'smooth'});
      f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash');
    }); });
    f.addEventListener('submit', function(e){
      e.preventDefault(); var bad = [];
      [['#c-name', function(v){ return v.trim().length > 1; }], ['#c-email', function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }], ['#c-role', function(v){ return !!v; }]].forEach(function(r){
        var el = f.querySelector(r[0]), ok = r[1](el.value); el.closest('.field').classList.toggle('bad', !ok); if (!ok) bad.push(el);
      });
      if (bad.length) { status.textContent = 'Please add your name, a valid email and the role you are applying for.'; bad[0].focus(); return; }
      var btn = f.querySelector('button[type="submit"]'); if (btn.disabled) return;
      btn.disabled = true; status.textContent = 'Sending…';
      sendForm(f, 'Careers application: ' + sel.value).then(function(){
        status.textContent = ''; f.classList.add('is-done'); var d = f.querySelector('.cr-done'); d.hidden = false; d.querySelector('h3').focus();
      }).catch(function(err){
        console.warn('Careers form not sent:', err); status.textContent = SEND_FAIL;
      }).then(function(){ btn.disabled = false; });
    });
  })();

  /* contact form: keep the hidden "disciplines" field in sync with the picked chips */
  (function(){
    var hid = document.getElementById('f-disciplines'); if (!hid) return;
    var sync = function(){ hid.value = [].map.call(document.querySelectorAll('.pick[aria-pressed="true"]'), function(b){ return b.textContent.trim(); }).join(', '); };
    document.querySelectorAll('.pick').forEach(function(b){ b.addEventListener('click', function(){ setTimeout(sync, 0); }); });
    sync();
  })();

  /* contact: copy email, chips pop, readout lines flash on change */
  (function(){
    document.querySelectorAll('.ct-copy').forEach(function(b){
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); var t = b.getAttribute('data-copy');
        var ok = function(){ b.textContent = 'Copied ✓'; b.classList.add('done'); setTimeout(function(){ b.textContent = 'Copy'; b.classList.remove('done'); }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, ok); else ok(); });
    });
    document.querySelectorAll('.pick').forEach(function(p){ p.addEventListener('click', function(){ p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }); });
    var dds = document.querySelectorAll('.readout dd');
    if ('MutationObserver' in window) dds.forEach(function(d){ new MutationObserver(function(){ d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); }).observe(d, {childList:true, characterData:true, subtree:true}); });
  })();

  /* how we work: expanding photo panels; hover, click or auto-play opens one */
  (function(){
    var box = document.getElementById('steps'); if (!box) return;
    var steps = [].slice.call(box.querySelectorAll('.step')); if (!steps.length) return;
    box.classList.add('panels');
    steps.forEach(function(el){
      var sm = el.querySelector('small'), h = el.querySelector('h3');
      var tab = document.createElement('span'); tab.className = 'step-tab'; tab.setAttribute('aria-hidden', 'true');
      tab.innerHTML = '<small>' + (sm ? sm.textContent : '') + '</small><b>' + (h ? h.textContent : '') + '</b>';
      el.appendChild(tab); el.tabIndex = 0; el.setAttribute('role', 'button');
    });
    var cur = -1, hover = false, vis = false, timer = null;
    function open(i){
      if (i === cur) return; cur = i;
      steps.forEach(function(el, k){ var on = k === i; el.classList.toggle('is-open', on); el.classList.toggle('is-on', on); el.setAttribute('aria-expanded', String(on)); });
    }
    function tick(){ if (vis && !hover && !document.hidden && !reduce) open((cur + 1) % steps.length); }
    open(0);
    steps.forEach(function(el, k){
      el.addEventListener('mouseenter', function(){ hover = true; open(k); });
      el.addEventListener('click', function(){ open(k); });
      el.addEventListener('focus', function(){ open(k); });
      el.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); } });
    });
    box.addEventListener('mouseleave', function(){ hover = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; }, {threshold:.35}).observe(box);
    timer = setInterval(tick, 5200);
  })();

  /* how we work: without scroll motion, show every step finished */

  /* fallback reveals without GSAP */
  if (!hasGsap) {
    var els = document.querySelectorAll('[data-r]');
    if (!('IntersectionObserver' in window) || reduce) els.forEach(function(e){ e.classList.add('in'); });
    else { var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target);} }); }, {rootMargin:'0px 0px -8% 0px'}); els.forEach(function(e){ io.observe(e); }); }
    root.classList.add('static');
  }

  /* GSAP motion */
  if (hasGsap && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    // hero entrance
    var tl = gsap.timeline({paused:true, defaults:{ease:'expo.out'}}); window.__heroTl = tl;
    if (!document.getElementById('loader')) setTimeout(function(){ tl.play(); }, root.classList.contains('pt-cover') ? 280 : 60);
    var hv = document.querySelector('.hero:not(.page-hero) #heroVideo');
    if (hv) {
      tl.fromTo(hv, {clipPath:'inset(49.6% 0% 49.6% 0%)', scale:1.14}, {clipPath:'inset(0% 0% 0% 0%)', scale:1, duration:1.7, ease:'expo.inOut'}, 0)
        .fromTo('.hero-slit', {scaleX:0, opacity:1}, {scaleX:1, duration:.55, ease:'expo.out'}, 0)
        .to('.hero-slit', {opacity:0, duration:.7, ease:'power2.out'}, .6);
    }
    var stEl = document.querySelector('.hero:not(.page-hero) .stats'); if (stEl) stEl.classList.add('pre');
    tl.from('.hero h1 .w:not(.rot) > span, .hero h1 .rot-track > .on', {yPercent:110, duration:1.1, stagger:.08}, hv ? .3 : 0)
      .from('[data-hero]', {y:30, opacity:0, duration:1, stagger:.12}, '-=.8');
    if (stEl) tl.call(function(){ stEl.classList.remove('pre'); }, null, '-=.5');
    var kk = document.querySelector('.hero:not(.page-hero) .kicker');
    if (kk && kk.children.length === 0) {
      var kFinal = kk.textContent, KA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+';
      kk.setAttribute('aria-label', kFinal);
      tl.call(function(){
        var n = 0, id = setInterval(function(){
          n += 2;
          kk.textContent = kFinal.split('').map(function(ch, i){ return (i < n || ch === ' ' || ch === '·' || ch === ',') ? ch : KA.charAt(Math.floor(Math.random() * KA.length)); }).join('');
          if (n >= kFinal.length) { clearInterval(id); kk.textContent = kFinal; }
        }, 26);
      }, null, hv ? .55 : .2);
    }
    // counters
    document.querySelectorAll('[data-count]').forEach(function(el){
      var n = +el.dataset.count, o = {v:0};
      tl.to(o, {v:n, duration:1.4, ease:'power2.out', onUpdate:function(){ el.textContent = Math.round(o.v); }}, '-=.9');
    });
    // hero parallax on scroll
    gsap.to('#heroMedia', {yPercent:18, scale:1.08, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}});
    gsap.to('.hero-in', {y:-80, opacity:.2, ease:'none', scrollTrigger:{trigger:'.hero', start:'center center', end:'bottom top', scrub:true}});

    // headline: the last word cycles through what we build, following the video scene
    (function(){
      var rot = document.querySelector('.hero h1 .rot'); if (!rot) return;
      var track = rot.querySelector('.rot-track'), items = track.children, vis = true, call = null;
      var groups = items.length >= 7 ? [[0, 1, 2], [3, 4], [5, 6]] : [Array.prototype.map.call(items, function(_, i){ return i; })];
      var g = 0, gi = 0, cur = 0;
      function place(k, anim){
        cur = k;
        var y = -(items[k].offsetTop - items[0].offsetTop), w = items[k].offsetWidth;
        if (anim) { gsap.to(track, {y:y, duration:.95, ease:'expo.inOut', overwrite:'auto'}); gsap.to(rot, {width:w, duration:.95, ease:'expo.inOut', overwrite:'auto'}); }
        else { gsap.set(track, {y:y}); gsap.set(rot, {width:w}); }
        for (var j = 0; j < items.length; j++) { items[j].classList.toggle('on', j === k); items[j].classList.remove('shine'); }
        if (anim) { void items[k].offsetWidth; items[k].classList.add('shine'); }
      }
      function fit(){ place(cur, false); }
      fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); addEventListener('resize', fit);
      if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; }).observe(rot.closest('.hero'));
      var STEP = 2.8 / (window.HERO_RATE || 1) * 1.15;   // word changes keep pace with the faster video
      function next(){ if (vis && !document.hidden) { gi = (gi + 1) % groups[g].length; place(groups[g][gi], true); } call = gsap.delayedCall(STEP, next); }
      call = gsap.delayedCall(STEP + 1, next);
      addEventListener('heroscene', function(e){
        var s = Math.min(groups.length - 1, e.detail | 0); if (s === g) return;
        g = s; gi = 0; place(groups[g][0], true);
        if (call) call.kill(); call = gsap.delayedCall(STEP, next);
      });
    })();

    // pointer depth: the rig drifts against the cursor, the traces with it
    (function(){
      var hero = document.querySelector('.hero:not(.page-hero)'), dep = hero && hero.querySelector('.hm-depth'), fx = document.getElementById('heroFx');
      if (!dep || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
      var dx = gsap.quickTo(dep, 'x', {duration:1.2, ease:'power3'}), dy = gsap.quickTo(dep, 'y', {duration:1.2, ease:'power3'});
      var fxx = fx ? gsap.quickTo(fx, 'x', {duration:1.4, ease:'power3'}) : null, fxy = fx ? gsap.quickTo(fx, 'y', {duration:1.4, ease:'power3'}) : null;
      hero.addEventListener('mousemove', function(e){ var r = hero.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5; dx(-nx * 30); dy(-ny * 18); if (fxx) { fxx(nx * 12); fxy(ny * 8); } }, {passive:true});
      hero.addEventListener('mouseleave', function(){ dx(0); dy(0); if (fxx) { fxx(0); fxy(0); } });
    })();

    // generic reveals, staggered per section
    gsap.utils.toArray('section').forEach(function(sec){
      var items = sec.querySelectorAll('[data-r]');
      if (!items.length) return;
      gsap.set(items, {opacity:0, y:40});
      ScrollTrigger.batch(items, {start:'top 88%', once:true, onEnter:function(b){ gsap.to(b, {y:0, opacity:1, duration:.9, ease:'expo.out', stagger:.08, overwrite:'auto'}); }});
    });
    // image clip reveal inside service cards
    gsap.utils.toArray('.svc-img img').forEach(function(img){
      gsap.fromTo(img, {scale:1.25}, {scale:1, ease:'none', scrollTrigger:{trigger:img, start:'top bottom', end:'bottom 60%', scrub:true}});
    });

    var mm = gsap.matchMedia();
    // services reel (desktop): pinned list + shutter-slice photo frame; colour glows follow the active service
    mm.add('(min-width: 1024px)', function(){
      var sec = document.querySelector('section.services'), grid = sec && sec.querySelector('.svc-grid');
      if (!grid) return;
      var cards = [].slice.call(grid.querySelectorAll('.svc')), N = cards.length, S = 6;
      var SLUG = ['mechanical','pcb','embedded','ai','software','aerospace','automation','rf'];
      var COL = [['#f59e0b','#fb7185'],['#22c55e','#14b8a6'],['#06b6d4','#3b82f6'],['#8b5cf6','#ec4899'],['#3b82f6','#22d3ee'],['#6366f1','#0ea5e9'],['#f97316','#14b8a6'],['#ec4899','#8b5cf6']];
      var reel = sec.querySelector('.reel');
      if (!reel) {
        var pad = function(n){ return (n < 9 ? '0' : '') + (n + 1); };
        var esc = function(t){ return t.replace(/&amp;/g, '&').split('').map(function(ch){ return ch === ' ' ? '<span class="ch sp">&nbsp;</span>' : '<span class="ch">' + (ch === '&' ? '&amp;' : ch) + '</span>'; }).join(''); };
        var list = '', figs = '', nums = '', tts = '', bars = '', tags = '';
        cards.forEach(function(c, i){
          var img = c.querySelector('img'), h = c.querySelector('h3').innerHTML, d = c.querySelector('.svc-body p').innerHTML, ch = c.querySelector('.chips');
          list += '<button class="reel-item' + (i ? '' : ' is-on') + '" type="button" aria-pressed="' + (i ? 'false' : 'true') + '"><span class="ri-n">' + pad(i) + '</span><span class="ri-t">' + h + '</span><span class="ri-d"><span class="ri-d-in"><p>' + d + '</p>' + (ch ? '<span class="chips">' + ch.innerHTML + '</span>' : '') + '</span></span></button>';
          var im = '<img src="' + img.getAttribute('src') + '" srcset="' + (img.getAttribute('srcset') || '') + '" sizes="(min-width: 1024px) 60vw, 100vw" alt="" loading="lazy" decoding="async">', sl = '';
          for (var k = 0; k < S; k++) sl += '<span class="sl" style="--i:' + k + '">' + im + '</span>';
          figs += '<figure class="rm-img' + (i ? '' : ' is-on') + '" role="img" aria-label="' + img.getAttribute('alt').replace(/"/g, '&quot;') + '">' + sl + '</figure>';
          nums += '<b>' + pad(i) + '</b>'; tts += '<span class="rm-tt' + (i ? '' : ' is-on') + '">' + esc(c.querySelector('h3').textContent.replace(/&/g, '&amp;')) + '</span>'; bars += '<i' + (i ? '' : ' class="done"') + '></i>';
          tags += '<span class="rm-tg' + (i ? '' : ' is-on') + '">' + (ch ? [].slice.call(ch.children).map(function(x){ return '<b>' + x.innerHTML + '</b>'; }).join('') : '') + '</span>';
        });
        reel = document.createElement('div'); reel.className = 'reel';
        reel.innerHTML = '<div class="reel-pin"><div class="reel-aura" aria-hidden="true"><i></i><i></i><i></i></div><div class="reel-list"><div class="reel-items"><div class="reel-rail" aria-hidden="true"><i></i></div>' + list + '</div></div>' +
          '<div class="reel-media"><div class="rm-frame">' + figs + '<div class="rm-shade"></div>' +
          '<div class="rm-top"><span class="rm-count">Service <span class="rm-win"><span class="rm-track">' + nums + '</span></span><em>/ ' + pad(N - 1) + '</em></span><a class="rm-go" href="services.html#' + SLUG[0] + '" aria-label="Open this service in detail"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/></svg></a></div>' +
          '<div class="rm-tags" aria-hidden="true">' + tags + '</div>' +
          '<div class="rm-cap"><span class="rm-kick">Engineering services</span><div class="rm-t" aria-hidden="true">' + tts + '</div><div class="rm-bar" aria-hidden="true">' + bars + '</div></div></div></div></div>';
        grid.parentNode.insertBefore(reel, grid);
      }
      sec.classList.add('has-reel');
      var items = [].slice.call(reel.querySelectorAll('.reel-item')), figEls = [].slice.call(reel.querySelectorAll('.rm-img'));
      var titles = [].slice.call(reel.querySelectorAll('.rm-tt')), barEls = [].slice.call(reel.querySelectorAll('.rm-bar i')), tagEls = [].slice.call(reel.querySelectorAll('.rm-tg'));
      var track = reel.querySelector('.rm-track'), rail = reel.querySelector('.reel-rail i'), go = reel.querySelector('.rm-go'), pin = reel.querySelector('.reel-pin');
      var cur = 0, z = 1, tw = [];
      function paint(i){ reel.style.setProperty('--ga', COL[i][0]); reel.style.setProperty('--gb', COL[i][1]); document.dispatchEvent(new CustomEvent('svccolor', {detail:COL[i]})); }
      paint(0);
      gsap.set(figEls.slice(1).map(function(f){ return f.querySelectorAll('.sl'); }), {clipPath:'inset(100% 0% 0% 0%)'});
      gsap.set(tagEls[0].children, {x:0, opacity:1});
      function setActive(i){
        if (i === cur) return;
        var prev = cur, dir = i > prev ? 1 : -1; cur = i;
        items.forEach(function(b, k){ b.classList.toggle('is-on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
        barEls.forEach(function(b, k){ b.classList.toggle('done', k <= i); });
        track.style.transform = 'translateY(' + (-1.2 * i) + 'em)';
        go.setAttribute('href', 'services.html#' + SLUG[i]);
        paint(i);
        // photo: six slices shutter in, alternating up and down
        var nf = figEls[i], of = figEls[prev], sl = nf.querySelectorAll('.sl'), ims = nf.querySelectorAll('img');
        nf.style.zIndex = ++z; nf.classList.add('is-on'); of.classList.remove('is-on');
        tw.forEach(function(t){ t.kill(); }); tw = [];
        gsap.set(of.querySelectorAll('.sl'), {clipPath:'inset(0% 0% 0% 0%)'});
        tw.push(gsap.fromTo(sl, {clipPath:function(k){ return k % 2 ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)'; }}, {clipPath:'inset(0% 0% 0% 0%)', duration:.95, ease:'expo.inOut', stagger:{each:.055, from: dir > 0 ? 'start' : 'end'}}));
        tw.push(gsap.fromTo(ims, {scale:1.28}, {scale:1.08, duration:1.5, ease:'expo.out', onComplete:function(){ tw.push(gsap.to(ims, {scale:1, duration:9, ease:'sine.out'})); }}));
        tw.push(gsap.to(of.querySelectorAll('img'), {scale:1.02, duration:1, ease:'expo.inOut'}));
        figEls.forEach(function(f, k){ if (k !== i && k !== prev) gsap.set(f.querySelectorAll('.sl'), {clipPath:'inset(100% 0% 0% 0%)'}); });
        // title: letters roll out and in; tools float onto the photo
        titles.forEach(function(t, k){ t.classList.toggle('is-on', k === i); if (k !== i && k !== prev) gsap.set(t.children, {opacity:0}); });
        tagEls.forEach(function(t, k){ if (k !== i && k !== prev) gsap.set(t.children, {opacity:0}); });
        tw.push(gsap.to(titles[prev].children, {yPercent:-120, rotate:-6, opacity:0, duration:.45, ease:'power3.in', stagger:.012}));
        tw.push(gsap.fromTo(titles[i].children, {yPercent:120, rotate:8, opacity:0}, {yPercent:0, rotate:0, opacity:1, duration:.9, ease:'expo.out', stagger:.022, delay:.18}));
        tw.push(gsap.to(tagEls[prev].children, {x:24, opacity:0, duration:.35, ease:'power2.in', stagger:.04}));
        tw.push(gsap.fromTo(tagEls[i].children, {x:-30, opacity:0}, {x:0, opacity:1, duration:.9, ease:'back.out(1.6)', stagger:.08, delay:.45}));
      }
      var startY = function(){ return 'top ' + Math.round(Math.max(92, (innerHeight + 76 - pin.offsetHeight) / 2)) + 'px'; };
      var st = ScrollTrigger.create({trigger:reel, start:startY, end:function(){ return '+=' + Math.round((N - 1) * innerHeight * .4); }, pin:true, anticipatePin:1, invalidateOnRefresh:true,
        onUpdate:function(self){ rail.style.transform = 'scaleY(' + self.progress.toFixed(4) + ')'; setActive(Math.min(N - 1, Math.floor(self.progress * N * .9999))); }});
      items.forEach(function(b, k){ b.addEventListener('click', function(){ var y = st.start + (st.end - st.start) * (k + .5) / N; if (lenis) lenis.scrollTo(y, {duration:1.2}); else scrollTo({top:y, behavior:'smooth'}); }); });
      // the frame leans toward the cursor; the photo drifts the other way
      var media = reel.querySelector('.reel-media'), frame = reel.querySelector('.rm-frame');
      var rx = gsap.quickTo(frame, 'rotationX', {duration:.8, ease:'power3'}), ry = gsap.quickTo(frame, 'rotationY', {duration:.8, ease:'power3'});
      var ix = gsap.quickTo(figEls, 'x', {duration:.9, ease:'power3'}), iy = gsap.quickTo(figEls, 'y', {duration:.9, ease:'power3'});
      function mv(e){ var r = media.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; ry(x * 7); rx(-y * 6); ix(-x * 16); iy(-y * 12); }
      function lv(){ rx(0); ry(0); ix(0); iy(0); }
      media.addEventListener('pointermove', mv); media.addEventListener('pointerleave', lv);
      gsap.from(reel.querySelectorAll('.reel-item'), {x:-30, opacity:0, duration:1, ease:'expo.out', stagger:.05, scrollTrigger:{trigger:reel, start:'top 80%'}});
      gsap.fromTo(frame, {clipPath:'inset(12% 10% 12% 10% round 28px)'}, {clipPath:'inset(0% 0% 0% 0% round 28px)', duration:1.4, ease:'expo.out', scrollTrigger:{trigger:reel, start:'top 80%'}});
      ScrollTrigger.sort();
      return function(){ sec.classList.remove('has-reel'); media.removeEventListener('pointermove', mv); media.removeEventListener('pointerleave', lv); gsap.set(frame, {clearProps:'transform'}); };
    });
    mm.add('(min-width: 681px)', function(){
      // lab: pinned zoom
      if (document.getElementById('labPin')) { var lt = gsap.timeline({scrollTrigger:{trigger:'#labPin', start:'top top', end:'+=120%', scrub:1, pin:true}});
      lt.fromTo('#labFrame', {clipPath:'inset(14% 22% 14% 22% round 28px)'}, {clipPath:'inset(0% 0% 0% 0% round 0px)', ease:'none'})
        .fromTo('#labFrame img', {scale:1.25}, {scale:1, ease:'none'}, 0)
        .from('#labCopy > *', {y:60, opacity:0, stagger:.08, ease:'power2.out'}, .35)
        .from('.spec', {y:30, opacity:0, stagger:.06, ease:'power2.out'}, .55); }

      // projects: horizontal scroll
      var track = document.getElementById('projTrack');
      if (track) {
      var dist = function(){ return Math.max(0, track.scrollWidth - innerWidth); };
      var projStart = function(){ var sec = document.getElementById('projects'); return sec.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'; };
      gsap.to(track, {x:function(){ return -dist(); }, ease:'none', scrollTrigger:{trigger:'#projects', start:projStart, end:function(){ return '+=' + dist(); }, pin:'#projects', scrub:1, invalidateOnRefresh:true, onUpdate:function(s){ document.getElementById('projBar').style.transform = 'scaleX(' + (.12 + s.progress * .88) + ')'; }}});
      // depth: the card at the centre is large and bright, the others turn away; the counter names it
      (function(){
        var cards = [].slice.call(track.querySelectorAll('.proj')), N = cards.length, hint = document.getElementById('projHint'), base = hint ? hint.textContent : '', last = -1;
        var COL = {Aerospace:'#3b82f6', Embedded:'#22d3ee', IoT:'#22c55e', Industrial:'#f59e0b', Robotics:'#ec4899', Software:'#8b5cf6'};
        cards.forEach(function(c){ var t = c.querySelector('.tag').textContent, k = Object.keys(COL).filter(function(n){ return t.indexOf(n) > -1; })[0]; c.style.setProperty('--pa', COL[k] || '#22d3ee'); });
        var tick = function(){
          var cx = innerWidth / 2, best = 0, bd = 1e9;
          cards.forEach(function(c, k){
            var r = c.getBoundingClientRect(), d = (r.left + r.width / 2 - cx) / innerWidth, a = Math.min(1, Math.abs(d) * 1.6);
            if (Math.abs(d) < bd) { bd = Math.abs(d); best = k; }
            gsap.set(c, {rotationY: Math.max(-14, Math.min(14, -d * 18)), z: -a * 60, scale: 1 - a * .06, opacity: 1 - a * .4, transformOrigin:'50% 50%', transformPerspective:1400});
          });
          if (best !== last) { last = best; cards.forEach(function(c, k){ c.classList.toggle('is-focus', k === best); });
            if (hint) hint.innerHTML = '<b>' + String(best + 1).padStart(2, '0') + '</b> / ' + String(N).padStart(2, '0') + ' &middot; ' + cards[best].querySelector('h3').textContent; }
        };
        var on = false, secEl = document.getElementById('projects');
        if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !on) { on = true; gsap.ticker.add(tick); } else if (!v && on) { on = false; gsap.ticker.remove(tick); } }).observe(secEl); else gsap.ticker.add(tick);
        tick();
      })();
      gsap.from('.proj', {y:60, opacity:0, stagger:.06, duration:.9, ease:'expo.out', scrollTrigger:{trigger:'#projPin', start:'top 85%'}});
      }

      // products: stacked cards scale down as the next one arrives
      var cards = gsap.utils.toArray('.prod');
      cards.forEach(function(c, i){
        if (i < cards.length - 1) gsap.fromTo(c, {scale:1, filter:'brightness(1)'}, {scale:.94, filter:'brightness(.55)', ease:'none', scrollTrigger:{trigger:cards[i+1], start:'top 45%', end:'top 150px', scrub:true}});
      });
    });
    mm.add('(max-width: 680px)', function(){
      var ph = document.getElementById('projHint'); if (ph) ph.textContent = 'Swipe to explore all 9 systems';
    });
    gsap.utils.toArray('[data-par2]').forEach(function(img){ gsap.fromTo(img, {yPercent:-8}, {yPercent:8, ease:'none', scrollTrigger:{trigger:img.parentNode, start:'top bottom', end:'bottom top', scrub:true}}); });
    // products: the section's ambient light takes the colour of the card in view
    (function(){
      var amb = document.getElementById('prodAmb'); if (!amb) return;
      gsap.utils.toArray('.prod').forEach(function(c, i){
        if (!i) return;
        ScrollTrigger.create({trigger:c, start:'top 62%', onEnter:function(){ amb.dataset.on = i; }, onLeaveBack:function(){ amb.dataset.on = i - 1; }});
      });
    })();
    // products: floating switcher, active card ring, content rises in as each card arrives
    (function(){
      var cards = gsap.utils.toArray('.prod'), dock = document.querySelector('.prod-dock'), amb = document.getElementById('prodAmb'), sec = document.getElementById('products');
      if (!cards.length) return;
      var btns = dock ? [].slice.call(dock.querySelectorAll('button')) : [], hl = dock && dock.querySelector('.pd-hl');
      function act(i){
        cards.forEach(function(c, k){ c.classList.toggle('is-front', k === i); });
        btns.forEach(function(b, k){ b.classList.toggle('on', k === i); b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
        if (hl && btns[i]) { hl.style.width = btns[i].offsetWidth + 'px'; hl.style.transform = 'translateX(' + btns[i].offsetLeft + 'px)'; hl.style.background = getComputedStyle(btns[i]).getPropertyValue('--pc'); }
      }
      act(0);
      if (amb && 'MutationObserver' in window) new MutationObserver(function(){ act(+amb.dataset.on || 0); }).observe(amb, {attributes:true, attributeFilter:['data-on']});
      if (dock && sec) {
        ScrollTrigger.create({trigger:sec, start:'top 40%', end:'bottom 70%', onToggle:function(st){ dock.classList.toggle('show', st.isActive); }});
        btns.forEach(function(b, k){ b.addEventListener('click', function(){ var stk = document.getElementById('stack'), y = (stk ? stk.getBoundingClientRect().top + scrollY : 0) - 110; if (k) { var st = ScrollTrigger.getAll().filter(function(t){ return t.trigger === cards[k] && t.vars.start === 'top 62%'; })[0]; if (st) y = st.start + innerHeight * .62 - 150 + 4; } if (lenis) lenis.scrollTo(y, {duration:1.2}); else scrollTo({top:y, behavior:'smooth'}); }); });
        addEventListener('resize', function(){ act(+((amb && amb.dataset.on) || 0)); });
      }
      cards.forEach(function(c){
        gsap.from(c.querySelectorAll('.prod-copy > *'), {y:34, opacity:0, duration:1, ease:'expo.out', stagger:.07, scrollTrigger:{trigger:c, start:'top 70%'}});
      });
    })();
    // parallax product images
    gsap.utils.toArray('[data-par]').forEach(function(img){
      gsap.fromTo(img, {yPercent:-6}, {yPercent:6, ease:'none', scrollTrigger:{trigger:img.closest('.prod'), start:'top bottom', end:'bottom top', scrub:true}});
    });
    // process line draws
    var horiz = matchMedia('(min-width: 681px)').matches;
    // values: lines slide in from alternating sides
    gsap.utils.toArray('[data-v]').forEach(function(l, i){
      gsap.from(l, {x: i % 2 ? 140 : -140, opacity:0, ease:'expo.out', duration:1.2, scrollTrigger:{trigger:l, start:'top 85%'}});
    });
    // footer word rises

    addEventListener('load', function(){ ScrollTrigger.refresh(); });
  } else {
    var lp0 = document.getElementById('labPin'); if (lp0) lp0.classList.add('no-pin');
  }


  /* ---------- hero circuit field ---------- */
  (function(){
    var c = document.getElementById('heroFx'); if (!c || !c.getContext) return;
    var ctx = c.getContext('2d'), W, H, G = 44, traces = [], mouse = {x:-999, y:-999}, run = true, dpr = Math.min(2, devicePixelRatio || 1);
    function build(){
      var r = c.getBoundingClientRect(); W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      traces = []; var n = W < 700 ? 10 : 24, seed = 7;
      function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var i = 0; i < n; i++) {
        var x = Math.round((W * (W < 700 ? .1 : .42) + rnd() * W * .6) / G) * G, y = Math.round(rnd() * H / G) * G, pts = [[x,y]], horiz = rnd() > .5;
        for (var k = 0, segs = 3 + Math.floor(rnd() * 4); k < segs; k++) { var d = (2 + Math.floor(rnd() * 4)) * G * (rnd() > .5 ? 1 : -1); if (horiz) x += d; else y += d; pts.push([x,y]); horiz = !horiz; }
        var len = 0, cum = [0]; for (var j = 1; j < pts.length; j++) { len += Math.abs(pts[j][0]-pts[j-1][0]) + Math.abs(pts[j][1]-pts[j-1][1]); cum.push(len); }
        traces.push({pts:pts, cum:cum, len:len, off:rnd(), spd:.05 + rnd() * .08});
      }
    }
    function at(t, d){ d = Math.max(0, Math.min(t.len, d)); for (var j = 1; j < t.pts.length; j++) { if (d <= t.cum[j]) { var a = t.pts[j-1], b = t.pts[j], f = (d - t.cum[j-1]) / ((t.cum[j] - t.cum[j-1]) || 1); return [a[0] + (b[0]-a[0]) * f, a[1] + (b[1]-a[1]) * f]; } } return t.pts[t.pts.length-1]; }
    function frame(now){
      if (!run) return; if (!reduce && now - (frame.l || 0) < 32) { requestAnimationFrame(frame); return; } frame.l = now; ctx.clearRect(0,0,W,H);
      // spotlight grid dots
      if (mouse.x > -500) { var R = 200; for (var gx = Math.floor((mouse.x-R)/G)*G; gx < mouse.x+R; gx += G) for (var gy = Math.floor((mouse.y-R)/G)*G; gy < mouse.y+R; gy += G) { var dd = Math.hypot(gx-mouse.x, gy-mouse.y); if (dd < R) { ctx.fillStyle = 'rgba(96,165,250,' + (1 - dd/R) * .7 + ')'; ctx.fillRect(gx-1, gy-1, 2, 2); } } }
      traces.forEach(function(t){
        ctx.strokeStyle = 'rgba(59,130,246,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t.pts[0][0], t.pts[0][1]); for (var j = 1; j < t.pts.length; j++) ctx.lineTo(t.pts[j][0], t.pts[j][1]); ctx.stroke();
        var e = t.pts[t.pts.length-1]; ctx.fillStyle = 'rgba(34,211,238,.35)'; ctx.beginPath(); ctx.arc(e[0], e[1], 2.5, 0, 7); ctx.fill();
        if (reduce) return;
        var head = ((now / 1000 * t.spd + t.off) % 1) * (t.len + 120);
        for (var s = 0; s < 14; s++) { var p1 = at(t, head - s * 7), p2 = at(t, head - (s+1) * 7); ctx.strokeStyle = 'rgba(34,211,238,' + (1 - s/14) * .9 + ')'; ctx.lineWidth = 2 - s * .1; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); }
      });
      if (!reduce) requestAnimationFrame(frame);
    }
    build(); addEventListener('resize', function(){ build(); if (reduce) frame(0); });
    var hero = document.querySelector('.hero');
    hero.addEventListener('mousemove', function(e){ var r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('mouseleave', function(){ mouse.x = mouse.y = -999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(frame); } else if (!v) run = false; }).observe(hero);
    requestAnimationFrame(frame);
  })();

  /* ---------- Orvex demo ---------- */
  (function(){
    var path = document.getElementById('oxPath'); if (!path || !path.getTotalLength) return;
    var L = path.getTotalLength(), dot = document.getElementById('oxDot'), halo = document.getElementById('oxHalo'), trail = document.getElementById('oxTrail');
    var cams = document.querySelectorAll('.ox-map .cam'), logs = document.querySelectorAll('.ox-log li'), DUR = 10000, visible = false, t0 = performance.now();
    function camAt(x, y){ return y < 124 ? (x < 188 ? 0 : 1) : (x > 264 ? 3 : 2); }
    function tick(now){
      if (visible) {
        var t = ((now - t0) % (DUR + 1400)) / DUR; if (t > 1) t = 1;
        var p = path.getPointAtLength(t * L), c = camAt(p.x, p.y);
        dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); halo.setAttribute('cx', p.x); halo.setAttribute('cy', p.y);
        var d = 'M', steps = Math.max(2, Math.floor(t * 60)); for (var i = 0; i <= steps; i++) { var q = path.getPointAtLength(i / steps * t * L); d += (i ? ' L' : '') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); } trail.setAttribute('d', d);
        cams.forEach(function(g){ g.classList.toggle('on', +g.dataset.c === c); });
        var order = [0,1,3,2], idx = order.indexOf(c);
        logs.forEach(function(li, i){ li.classList.toggle('seen', i <= idx); li.classList.toggle('now', i === idx); });
      }
      if (!reduce) requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ visible = es[0].isIntersecting; }).observe(path.closest('.ui')); else visible = true;
    if (reduce) { visible = true; t0 = performance.now() - DUR * .62; tick(performance.now()); } else requestAnimationFrame(tick);
  })();

  /* ---------- Cubbo demo ---------- */
  (function(){
    var chat = document.getElementById('cbChat'); if (!chat) return;
    var bubs = chat.querySelectorAll('.bub'), wave = document.getElementById('cbWave'), i = 0, timer = null, on = false;
    function step(){
      if (!on) return;
      if (i === 0) bubs.forEach(function(b){ b.classList.remove('show'); });
      var b = bubs[i]; b.classList.add('show'); wave.classList.toggle('talk', b.classList.contains('cub'));
      i = (i + 1) % bubs.length;
      timer = setTimeout(step, i === 0 ? 3600 : 1900);
    }
    if (reduce) { bubs.forEach(function(b){ b.classList.add('show'); }); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !on) { on = true; step(); } else if (!v) { on = false; clearTimeout(timer); wave.classList.remove('talk'); } }).observe(chat);
    else { on = true; step(); }
  })();

  /* ---------- split headings, curtains, tilt, cursor ---------- */
  document.querySelectorAll('[data-split]').forEach(function(h){
    var words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map(function(w){ return '<span class="sw" aria-hidden="true"><span>' + w + '</span></span>'; }).join(' ');
  });
  if (window.gsap && window.ScrollTrigger && !reduce) {
    document.querySelectorAll('[data-split]').forEach(function(h){
      gsap.from(h.querySelectorAll('.sw > span'), {yPercent:115, rotate:4, duration:1.1, ease:'expo.out', stagger:.05, scrollTrigger:{trigger:h, start:'top 88%'}});
    });
    gsap.utils.toArray('section.light').forEach(function(sec){
      gsap.fromTo(sec, {clipPath:'inset(0% 3% 0% 3% round 44px)'}, {clipPath:'inset(0% 0% 0% 0% round 0px)', ease:'none', scrollTrigger:{trigger:sec, start:'top bottom', end:'top 25%', scrub:true}});
    });
    if (document.getElementById('stack')) gsap.from('#stack .ui', {y:50, opacity:0, duration:1.1, ease:'expo.out', stagger:.1, scrollTrigger:{trigger:'#stack', start:'top 75%'}});
  }
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (fine && !reduce) {
    document.querySelectorAll('.svc, .feat, .how, .fcard, .vcard').forEach(function(el){
      el.classList.add('tilt');
      el.addEventListener('mousemove', function(e){ var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = 'perspective(900px) rotateX(' + (-y * 7) + 'deg) rotateY(' + (x * 7) + 'deg) translateY(-6px)'; });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });
    root.classList.add('has-cursor');
    var cur = document.getElementById('cur'), ring = document.getElementById('curRing'), cdot = document.getElementById('curDot'), lab = document.getElementById('curLabel');
    var mx = -100, my = -100, rx = mx, ry = my; cur.style.opacity = 0;
    addEventListener('mousemove', function(e){ if (cur.style.opacity === '0') { cur.style.opacity = 1; rx = e.clientX; ry = e.clientY; } mx = e.clientX; my = e.clientY; cdot.style.transform = 'translate(' + mx + 'px,' + my + 'px)'; }, {passive:true});
    var looping = false;
    function loop(){ rx += (mx - rx) * .18; ry += (my - ry) * .18; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; if (Math.abs(mx - rx) + Math.abs(my - ry) > .3) requestAnimationFrame(loop); else looping = false; }
    addEventListener('mousemove', function(){ if (!looping) { looping = true; requestAnimationFrame(loop); } }, {passive:true});
    document.addEventListener('mouseover', function(e){
      var t = e.target.closest('a, button, .pick, input, textarea, .proj, #stack .prod-media, .ui');
      cur.classList.remove('hover', 'label', 'reticle');
      if (!t) { if (e.target.closest && e.target.closest('.hero:not(.page-hero)')) cur.classList.add('reticle'); return; }
      if (t.matches('.proj')) { lab.textContent = 'View'; cur.classList.add('label'); }
      else if (t.matches('.ui') || t.matches('.prod-media')) { lab.textContent = t.closest('.prod') ? 'Open' : 'Demo'; cur.classList.add('label'); }
      else cur.classList.add('hover');
    });
    var heroEl = document.querySelector('.hero:not(.page-hero)');
    addEventListener('mousemove', function(e){ if (!heroEl || !cur.classList.contains('reticle')) return; var r = heroEl.getBoundingClientRect(); lab.textContent = 'X ' + String(Math.max(0, Math.round(e.clientX - r.left))).padStart(4, '0') + '  Y ' + String(Math.max(0, Math.round(e.clientY - r.top))).padStart(4, '0'); }, {passive:true});
    document.addEventListener('mouseleave', function(){ cur.style.opacity = 0; });
    document.addEventListener('mouseenter', function(){ cur.style.opacity = 1; });
  }

  /* contact picker (live thing) */
  if (document.getElementById('enquiry')) {
  var D = {
    mech:{who:'Mechanical lead', how:'Printed and machined prototypes with fit and thermal checks'},
    pcb:{who:'Electronics lead', how:'Board bring-up on our bench'},
    emb:{who:'Embedded lead', how:'Firmware tests on the target hardware'},
    ai:{who:'AI lead', how:'Accuracy measured on your own data, then on the device'},
    sw:{who:'Software lead', how:'Automated tests and a staging release you can try'},
    uav:{who:'Systems & avionics lead', how:'HIL/SIL benches and our three-axis rate table'},
    plc:{who:'Automation lead', how:'Factory acceptance testing of the control panel'},
    rf:{who:'RF lead', how:'Spectrum analysis and coexistence tests on our RF bench'}
  };
  var picks = document.querySelectorAll('.pick');
  var rWho = document.getElementById('r-who'), rHow = document.getElementById('r-how'), rFirst = document.getElementById('r-first');
  function sel(){ return Array.prototype.filter.call(picks, function(p){ return p.getAttribute('aria-pressed') === 'true'; }).map(function(p){ return p.dataset.k; }); }
  function join(a){ return a.length < 2 ? a.join('') : a.slice(0,-1).join(', ') + ' and ' + a[a.length-1]; }
  function lc(t, i){ return i && !/^[A-Z]{2}/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function update(){
    var s = sel();
    if (!s.length) { rWho.textContent = 'Pick at least one discipline'; rHow.textContent = '–'; rFirst.textContent = 'A first call to talk it through'; return; }
    rWho.textContent = join(s.map(function(k,i){ return lc(D[k].who, i); }));
    rHow.textContent = join(s.map(function(k,i){ return lc(D[k].how, i); }));
    rFirst.textContent = s.length >= 3 ? 'A complete product build in milestones, after a short feasibility sprint'
      : s.indexOf('ai') > -1 ? 'A short data review, then a feasibility sprint on your own data'
      : s.indexOf('uav') > -1 ? 'A test plan we agree with you, then a first run on our rigs'
      : 'A feasibility sprint that tests the riskiest part first';
  }
  picks.forEach(function(p){ p.addEventListener('click', function(){ p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); update(); }); });
  update();
  var form = document.getElementById('enquiry');
  function fieldErr(id, bad){ var el = document.getElementById(id), er = document.getElementById('e-' + id.slice(2)); el.setAttribute('aria-invalid', bad ? 'true' : 'false'); el.closest('.field').classList.toggle('bad', bad); if (er) er.hidden = !bad; return bad; }
  ['f-name','f-email'].forEach(function(id){ document.getElementById(id).addEventListener('input', function(){ if (this.getAttribute('aria-invalid') === 'true') fieldErr(id, id === 'f-name' ? !this.value.trim() : !/^\S+@\S+\.\S+$/.test(this.value.trim())); }); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var n = document.getElementById('f-name').value.trim(), m = document.getElementById('f-email').value.trim();
    var b1 = fieldErr('f-name', !n), b2 = fieldErr('f-email', !/^\S+@\S+\.\S+$/.test(m));
    if (b1 || b2) { document.getElementById(b1 ? 'f-name' : 'f-email').focus(); return; }
    var btn = form.querySelector('button[type="submit"]'), st = document.getElementById('status'); if (btn.disabled) return;
    btn.disabled = true; st.textContent = 'Sending…';
    sendForm(form, 'Website enquiry from ' + n).then(function(){
      st.textContent = '';
      document.getElementById('doneName').textContent = n.split(' ')[0];
      form.classList.add('is-done'); document.getElementById('formDone').hidden = false;
      setTimeout(function(){ document.getElementById('doneTitle').focus(); }, 50);
    }).catch(function(err){
      console.warn('Enquiry form not sent:', err); st.textContent = SEND_FAIL;
    }).then(function(){ btn.disabled = false; });
  });
  document.getElementById('doneReset').addEventListener('click', function(){ form.reset(); form.classList.remove('is-done'); document.getElementById('formDone').hidden = true; update(); document.getElementById('f-name').focus(); });

  }



  /* scroll-spy for in-page index (services page) */
  var spy = document.querySelectorAll('[data-spy] a[href^="#"]');
  if (spy.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) spy.forEach(function(a){ a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); }); }, {rootMargin:'-40% 0px -55% 0px'});
    spy.forEach(function(a){ var t = document.querySelector(a.getAttribute('href')); t && sio.observe(t); });
  }
  /* arriving with a #hash from another page */
  if (location.hash && location.hash.length > 1) {
    var land = function(){ var t = document.querySelector(location.hash); if (!t) return; if (window.ScrollTrigger) ScrollTrigger.refresh(); if (lenis) lenis.scrollTo(t, {offset:-76, immediate:true}); else t.scrollIntoView(); };
    addEventListener('load', function(){ setTimeout(land, document.getElementById('loader') ? 1700 : 300); });
  }


  /* ---------- polish: page transitions ---------- */
  (function(){
    if (root.classList.contains('pt-cover')) {
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ root.classList.add('pt-reveal'); root.classList.remove('pt-cover'); setTimeout(function(){ root.classList.remove('pt-reveal'); }, 800); }); });
    }
    addEventListener('pageshow', function(e){ if (e.persisted) root.classList.remove('pt-go', 'pt-cover'); });
    var framed = false; try { framed = window.self !== window.top; } catch (err) { framed = true; }
    if (reduce || framed) return; // inside Claude's viewer (an iframe) let links navigate normally
    document.addEventListener('click', function(e){
      var a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href'); if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url; try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      try { sessionStorage.setItem('ftdNav', '1'); } catch (err) {}
      root.classList.add('pt-go');
      setTimeout(function(){ try { location.href = url.href; } catch (err) { root.classList.remove('pt-go'); } }, 360);
      setTimeout(function(){ root.classList.remove('pt-go'); }, 3000); // safety: never leave the screen covered
    });
  })();

  /* ---------- polish: back to top with progress ring ---------- */
  (function(){
    var b = document.createElement('button');
    b.className = 'totop'; b.type = 'button'; b.setAttribute('aria-label', 'Back to top');
    b.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="tt-bg" cx="24" cy="24" r="21"/><circle class="tt-ring" cx="24" cy="24" r="21"/></svg><span aria-hidden="true">↑</span>';
    document.body.appendChild(b);
    var ring = b.querySelector('.tt-ring'), C = 2 * Math.PI * 21; ring.style.strokeDasharray = C;
    window.__toTop = function(y, h){ b.classList.toggle('show', y > 700); ring.style.strokeDashoffset = C * (1 - (h > 0 ? y / h : 0)); };
    window.__toTop(scrollY, document.documentElement.scrollHeight - innerHeight);
    b.addEventListener('click', function(){ if (lenis) lenis.scrollTo(0, {duration:1.6}); else scrollTo({top:0, behavior: reduce ? 'auto' : 'smooth'}); });
  })();

  /* ---------- perf: pause CSS animations in off-screen sections ---------- */
  if ('IntersectionObserver' in window) {
    var offIO = new IntersectionObserver(function(es){ es.forEach(function(e){ e.target.classList.toggle('anim-off', !e.isIntersecting); }); }, {rootMargin:'200px 0px'});
    document.querySelectorAll('main > section, body > section, .marquee, footer').forEach(function(el){ offIO.observe(el); });
  }

  /* ---------- polish: spotlight borders on cards ---------- */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.proj, .news-card, .how, .other, .svc, .sd, .feat, .prod, .form, .fcard, .vcard, .cipher, .ia-frame').forEach(function(card){
      var g = document.createElement('span'); g.className = 'glow-b'; g.setAttribute('aria-hidden', 'true'); card.appendChild(g);
      card.addEventListener('pointermove', function(e){ var r = card.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, {passive:true});
    });
  }


  /* =========== animation layer 2 =========== */
  /* circuit traces (same look as the hero) behind contact + CTA boxes */
  function circuitFx(host, density){
    var c = document.createElement('canvas'); c.className = 'fx-bg'; c.setAttribute('aria-hidden', 'true'); host.insertBefore(c, host.firstChild);
    var ctx = c.getContext && c.getContext('2d'); if (!ctx) return;
    var W, H, G = 44, traces = [], mouse = {x:-999, y:-999}, run = false, dpr = Math.min(2, devicePixelRatio || 1), seed = 11;
    function rnd(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    function build(){
      var r = host.getBoundingClientRect(); W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      traces = []; seed = 11; var n = Math.round((W < 700 ? .5 : 1) * density);
      for (var i = 0; i < n; i++) {
        var x = Math.round(rnd() * W / G) * G, y = Math.round(rnd() * H / G) * G, pts = [[x,y]], hz = rnd() > .5;
        for (var k = 0, s = 3 + Math.floor(rnd() * 4); k < s; k++) { var d = (2 + Math.floor(rnd() * 4)) * G * (rnd() > .5 ? 1 : -1); if (hz) x += d; else y += d; pts.push([x,y]); hz = !hz; }
        var len = 0, cum = [0]; for (var q = 1; q < pts.length; q++) { len += Math.abs(pts[q][0]-pts[q-1][0]) + Math.abs(pts[q][1]-pts[q-1][1]); cum.push(len); }
        traces.push({pts:pts, cum:cum, len:len, off:rnd(), spd:.04 + rnd() * .07});
      }
    }
    function at(t, d){ d = Math.max(0, Math.min(t.len, d)); for (var q = 1; q < t.pts.length; q++) { if (d <= t.cum[q]) { var a = t.pts[q-1], b = t.pts[q], f = (d - t.cum[q-1]) / ((t.cum[q] - t.cum[q-1]) || 1); return [a[0] + (b[0]-a[0]) * f, a[1] + (b[1]-a[1]) * f]; } } return t.pts[t.pts.length-1]; }
    function frame(now){
      if (!run) return; if (!reduce && now - (frame.l || 0) < 32) { requestAnimationFrame(frame); return; } frame.l = now; ctx.clearRect(0,0,W,H);
      if (mouse.x > -500) { var R = 220; for (var gx = Math.floor((mouse.x-R)/G)*G; gx < mouse.x+R; gx += G) for (var gy = Math.floor((mouse.y-R)/G)*G; gy < mouse.y+R; gy += G) { var dd = Math.hypot(gx-mouse.x, gy-mouse.y); if (dd < R) { ctx.fillStyle = 'rgba(96,165,250,' + (1 - dd/R) * .6 + ')'; ctx.fillRect(gx-1, gy-1, 2, 2); } } }
      traces.forEach(function(t){
        ctx.strokeStyle = 'rgba(59,130,246,.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t.pts[0][0], t.pts[0][1]); for (var q = 1; q < t.pts.length; q++) ctx.lineTo(t.pts[q][0], t.pts[q][1]); ctx.stroke();
        var e = t.pts[t.pts.length-1]; ctx.fillStyle = 'rgba(34,211,238,.3)'; ctx.beginPath(); ctx.arc(e[0], e[1], 2.5, 0, 7); ctx.fill();
        var head = ((now / 1000 * t.spd + t.off) % 1) * (t.len + 120);
        for (var s = 0; s < 14; s++) { var p1 = at(t, head - s * 7), p2 = at(t, head - (s+1) * 7); ctx.strokeStyle = 'rgba(34,211,238,' + (1 - s/14) * .8 + ')'; ctx.lineWidth = 2 - s * .1; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); }
      });
      requestAnimationFrame(frame);
    }
    build(); addEventListener('resize', build);
    host.addEventListener('mousemove', function(e){ var r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    host.addEventListener('mouseleave', function(){ mouse.x = mouse.y = -999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !run) { run = true; build(); requestAnimationFrame(frame); } else if (!v) run = false; }).observe(host);
  }
  if (!reduce) document.querySelectorAll('.contact, .cta-box').forEach(function(h){ circuitFx(h, h.classList.contains('contact') ? 26 : 12); });

  /* live test-profile dials over the rate table */
  (function(){
    var pin = document.getElementById('labPin'); if (!pin) return;
    var dial = function(label){ var ticks = ''; for (var i = 0; i < 24; i++) { var a = i * 15 * Math.PI / 180, r1 = i % 6 ? 38 : 34; ticks += '<line x1="' + (50 + Math.sin(a) * r1).toFixed(1) + '" y1="' + (50 - Math.cos(a) * r1).toFixed(1) + '" x2="' + (50 + Math.sin(a) * 42).toFixed(1) + '" y2="' + (50 - Math.cos(a) * 42).toFixed(1) + '"/>'; }
      return '<div class="dial"><svg viewBox="0 0 100 100"><circle class="d-track" cx="50" cy="50" r="46"/><g class="d-ticks">' + ticks + '</g><circle class="d-arc" cx="50" cy="50" r="46"/><g class="d-rot"><path d="M50 50 L50 14"/><circle cx="50" cy="14" r="3.2"/></g><circle class="d-hub" cx="50" cy="50" r="4"/></svg><b>' + label + '</b><span class="d-val">+0.0°</span></div>'; };
    var hud = document.createElement('div'); hud.className = 'hud'; hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = '<div class="hud-head"><i></i>Test profile · demo</div><div class="hud-dials">' + dial('Roll') + dial('Pitch') + dial('Yaw') + '</div><div class="hud-foot"><span>IMU stream</span><span class="ok">HIL link ●</span></div>';
    pin.appendChild(hud);
    var rots = hud.querySelectorAll('.d-rot'), vals = hud.querySelectorAll('.d-val'), arcs = hud.querySelectorAll('.d-arc'), on = false, C = 2 * Math.PI * 46;
    arcs.forEach(function(a){ a.style.strokeDasharray = C; });
    function fmt(v){ return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '°'; }
    function tick(now){
      if (!on) return; if (now - (tick.l || 0) < 32) { requestAnimationFrame(tick); return; } tick.l = now; var t = now / 1000;
      var v = [24 * Math.sin(t * .8), 12 * Math.sin(t * 1.15 + 1), ((t * 22) % 360) - 180];
      v.forEach(function(x, i){ rots[i].setAttribute('transform', 'rotate(' + (i === 2 ? x : x * 3) + ' 50 50)'); vals[i].textContent = fmt(x); arcs[i].style.strokeDashoffset = C * (1 - Math.min(1, Math.abs(i === 2 ? x / 180 : x / (i ? 12 : 24)))); });
      requestAnimationFrame(tick);
    }
    if (reduce) { on = true; tick(4000); on = false; return; }
    new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !on) { on = true; requestAnimationFrame(tick); } else if (!v) on = false; }).observe(pin);
  })();

  if (window.gsap && window.ScrollTrigger && !reduce) {
    root.classList.add('k-anim');
    ScrollTrigger.batch('.kicker', {start:'top 92%', once:true, onEnter:function(b){ b.forEach(function(k, i){ setTimeout(function(){ k.classList.add('k-in'); }, i * 80); }); }});
    // HUD slides in once the lab photo has opened
    if (document.querySelector('.hud') && matchMedia('(min-width: 681px)').matches) gsap.from('.hud', {x:60, opacity:0, duration:1, ease:'expo.out', scrollTrigger:{trigger:'#lab', start:'top -35%', toggleActions:'play none none reverse'}});
    // image wipes
    gsap.utils.toArray('.svc-img, .step-img, .sd-img, .problem-img, .other-img, .band-img').forEach(function(el){
      gsap.fromTo(el, {clipPath:'inset(100% 0% 0% 0%)'}, {clipPath:'inset(0% 0% 0% 0%)', duration:1.4, ease:'expo.out', scrollTrigger:{trigger:el, start:'top 90%'}, onComplete:function(){ el.style.clipPath = ''; }});
    });
    // cards tip up in 3D
    gsap.utils.toArray('.svc, .how, .feat, .sd, .fcard, .vcard').forEach(function(c){
      gsap.from(c, {rotationX:14, transformPerspective:1000, transformOrigin:'50% 100%', duration:1.3, ease:'expo.out', scrollTrigger:{trigger:c, start:'top 94%'}});
    });
    // intro paragraphs come into focus
    gsap.utils.toArray('.sec-head p, .hero-sub, .problem-grid .big').forEach(function(p){ if (p.closest('.hero') && !p.closest('.page-hero')) return; gsap.from(p, {filter:'blur(10px)', duration:1.2, ease:'power2.out', scrollTrigger:{trigger:p, start:'top 90%'}}); });
    // values fill with colour as you scroll
    gsap.utils.toArray('.val-line em').forEach(function(em){
      em.classList.add('fill');
      gsap.fromTo(em, {backgroundPosition:'100% 0'}, {backgroundPosition:'0% 0', ease:'none', scrollTrigger:{trigger:em, start:'top 88%', end:'top 45%', scrub:true}});
    });
    // feature icons pop
    document.querySelectorAll('.feat-grid').forEach(function(g){ gsap.from(g.querySelectorAll('.feat i'), {scale:0, rotation:-35, duration:.9, ease:'back.out(2.2)', stagger:.09, scrollTrigger:{trigger:g, start:'top 85%'}}); });
    if (document.querySelector('.ct-steps')) gsap.fromTo('.ct-steps', {'--ct-l':0}, {'--ct-l':1, duration:1.6, ease:'expo.inOut', scrollTrigger:{trigger:'.ct-steps', start:'top 85%'}});
    var fwd = document.querySelector('.foot-word');
    if (fwd) gsap.fromTo(fwd, {'--fill':0}, {'--fill':1, ease:'none', scrollTrigger:{trigger:fwd, start:'top bottom', end:'bottom bottom', scrub:true}});
    gsap.utils.toArray('.foot-grid > div').forEach(function(col, i){ gsap.from(col, {y:30, opacity:0, duration:1, ease:'expo.out', delay:i * .07, scrollTrigger:{trigger:'.foot-grid', start:'top 92%'}}); });
    // news: cards open from a slit, photos settle, text rises
    gsap.utils.toArray('.news-card').forEach(function(c, i){
      var tl2 = gsap.timeline({scrollTrigger:{trigger:'.news-grid', start:'top 82%'}, delay:i * .14});
      tl2.fromTo(c, {clipPath:'inset(30% 0% 30% 0% round 24px)', y:60, opacity:0}, {clipPath:'inset(0% 0% 0% 0% round 24px)', y:0, opacity:1, duration:1.2, ease:'expo.out', clearProps:'clipPath,transform'})
         .from(c.querySelector('.news-img img'), {scale:1.35, duration:1.6, ease:'expo.out', clearProps:'transform'}, 0)
         .from(c.querySelectorAll('.news-meta, h3, p, .news-more'), {y:24, opacity:0, duration:.9, ease:'expo.out', stagger:.08}, .35);
    });
    // engagement + "how" numbers: step labels slide
    gsap.utils.toArray('.how b').forEach(function(b){ gsap.from(b, {x:-24, opacity:0, duration:.9, ease:'expo.out', scrollTrigger:{trigger:b, start:'top 92%'}}); });
    // footer: letters rise one by one
    var fw = document.querySelector('.foot-word');
    if (fw) {
      fw.innerHTML = fw.textContent.split('').map(function(ch){ return ch === ' ' ? '<span class="sp">&nbsp;</span>' : '<span>' + ch + '</span>'; }).join('');
      gsap.from(fw.querySelectorAll('span'), {yPercent:105, duration:1.3, ease:'expo.out', stagger:.045, scrollTrigger:{trigger:'.foot', start:'top 85%'}});
    }
    // project images drift sideways inside their cards while the row scrolls
    var track = document.getElementById('projTrack');
    if (track && matchMedia('(min-width: 681px)').matches) {
      track.querySelectorAll('.proj-img img').forEach(function(img){ gsap.fromTo(img, {xPercent:-6, scale:1.16}, {xPercent:6, scale:1.16, ease:'none', scrollTrigger:{trigger:'#projects', start:function(){ var sec = document.getElementById('projects'); return sec.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'; }, end:function(){ return '+=' + Math.max(1, track.scrollWidth - innerWidth); }, scrub:true}}); });
    }
    // scroll speed: marquee leans and stretches, project cards lean
    var mq = document.querySelector('.marquee .mq-track');
    var skewEls = gsap.utils.toArray('.proj');
    var setters = skewEls.map(function(el){ return gsap.quickTo(el, 'skewX', {duration:.5, ease:'power3'}); });
    var mqTracks = gsap.utils.toArray('.mq-track');
    var lastY = scrollY, lastT = performance.now();
    var lastSk = 0, lastSp = 1, moving = false;
    function onVel(v){
      var sk = Math.round(Math.max(-7, Math.min(7, v * -0.18)) * 10) / 10;
      var sp = Math.round((1 + Math.min(4, Math.abs(v) * .08)) * 10) / 10;
      moving = sk !== 0 || sp !== 1;
      if (sk !== lastSk) { lastSk = sk; setters.forEach(function(s, i){ s(skewEls[i].classList.contains('proj') ? sk * .6 : sk * .5); }); }
      if (sp !== lastSp) { lastSp = sp; mqTracks.forEach(function(t){ t.getAnimations && t.getAnimations().forEach(function(a){ a.playbackRate = sp; }); }); }
    }
    if (lenis) lenis.on('scroll', function(e){ onVel(e.velocity || 0); });
    else addEventListener('scroll', function(){ var now = performance.now(), v = (scrollY - lastY) / Math.max(1, now - lastT) * 16; lastY = scrollY; lastT = now; onVel(v); }, {passive:true});
    gsap.ticker.add(function(){ if (!lenis || !moving) return; if (Math.abs(lenis.velocity || 0) < .05) onVel(0); });
  }


  /* ---------- ReCura: count-up scores + encrypted text ---------- */
  (function(){
    var nums = document.querySelectorAll('[data-countup]');
    if (nums.length && window.gsap && window.ScrollTrigger && !reduce) {
      nums.forEach(function(el){
        var n = +el.dataset.countup, o = {v:0}; el.textContent = '0';
        ScrollTrigger.create({trigger:el, start:'top 90%', once:true, onEnter:function(){ gsap.to(o, {v:n, duration:1.6, ease:'power2.out', onUpdate:function(){ el.textContent = Math.round(o.v); }}); }});
      });
    }
    var sc = document.getElementById('ciScramble'); if (!sc) return;
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789+/=', on = false;
    function rnd(n){ var s = ''; for (var i = 0; i < n; i++) s += A.charAt(Math.floor(Math.random() * A.length)); return s; }
    sc.textContent = rnd(34);
    if (reduce) return;
    setInterval(function(){ if (!on) return; var t = sc.textContent.split(''); for (var k = 0; k < 6; k++) t[Math.floor(Math.random() * t.length)] = A.charAt(Math.floor(Math.random() * A.length)); sc.textContent = t.join(''); }, 70);
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ on = es[0].isIntersecting; }).observe(sc); else on = true;
  })();


  /* ---------- phone slideshows (ReCura real screens) ---------- */
  document.querySelectorAll('[data-slides]').forEach(function(box){
    var imgs = box.querySelectorAll('img'), dots = box.parentNode.querySelectorAll('.fp-dots i'), i = 0, vis = true;
    if (imgs.length < 2 || reduce) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; }).observe(box);
    setInterval(function(){
      if (!vis) return;
      imgs[i].classList.remove('on'); if (dots[i]) dots[i].classList.remove('on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('on'); if (dots[i]) dots[i].classList.add('on');
    }, 3200);
  });


  /* ---------- tabbed app screens (ReCura dashboard) ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function(box){
    var tabs = box.querySelectorAll('[role="tab"]'), panels = box.querySelectorAll('[role="tabpanel"]'), cur = 0, timer = null, vis = false;
    function select(i, focus){
      tabs.forEach(function(t, k){ var on = k === i; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function(p, k){ p.classList.toggle('on', k === i); });
      var bar = tabs[i].querySelector('.ia-bar'); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      var app = box.querySelector('.rc-app'); if (app && app.__setView && tabs[i].dataset.view) app.__setView(tabs[i].dataset.view);
      cur = i; if (focus) tabs[i].focus();
    }
    function start(){ clearInterval(timer); if (reduce) { box.classList.add('ia-paused'); return; } timer = setInterval(function(){ if (vis) select((cur + 1) % tabs.length); }, 6000); }
    tabs.forEach(function(t, k){
      t.addEventListener('click', function(){ select(k); start(); });
      t.addEventListener('keydown', function(e){ var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return; e.preventDefault(); select((cur + d + tabs.length) % tabs.length, true); start(); });
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; if (vis) select(cur); }).observe(box); else vis = true;
    start();
  });


  /* ---------- ReCura stages: devices follow the mouse ---------- */
  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.rc-3d').forEach(function(stage){
      var host = stage.closest('.rc-hero, .prod-media-rc') || stage, tilt = stage.querySelector('.rc-tilt');
      if (!tilt) return;
      host.addEventListener('mousemove', function(e){ var r = host.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; tilt.style.transform = 'rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 6) + 'deg)'; });
      host.addEventListener('mouseleave', function(){ tilt.style.transform = ''; });
    });
  }


  /* ---------- ReCura plasma background (WebGL) ---------- */
  function rcPlasma(stage){
    var c = document.createElement('canvas'); c.className = 'rc-plasma'; c.setAttribute('aria-hidden', 'true');
    var gl = c.getContext('webgl', {antialias:false, premultipliedAlpha:false}) || c.getContext('experimental-webgl');
    if (!gl) return;
    stage.insertBefore(c, stage.firstChild); stage.classList.add('has-plasma');
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = ['precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float mi;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
      'float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
      'void main(){vec2 uv=gl_FragCoord.xy/r.y;vec2 mm=m/r.y;float d=length(uv-mm);',
      'vec2 q=vec2(fb(uv*1.5+t*.045),fb(uv*1.5+vec2(5.2,1.3)-t*.038));',
      'vec2 w=vec2(fb(uv*1.3+3.*q+vec2(1.7,9.2)+t*.07+mi*.35*exp(-d*3.)),fb(uv*1.3+3.*q+vec2(8.3,2.8)-t*.055));',
      'float f=fb(uv*1.15+3.4*w);',
      'vec3 c0=vec3(.039,.055,.032),c1=vec3(.10,.19,.085),c2=vec3(.29,.48,.23),c3=vec3(.72,.92,.60);',
      'vec3 col=mix(c0,c1,smoothstep(.25,.62,f));col=mix(col,c2,smoothstep(.5,.9,f*length(w)*1.1));',
      'col+=c3*pow(smoothstep(.72,1.,f),3.)*.55;col+=c3*.10*exp(-d*4.)*mi;',
      'vec2 vp=gl_FragCoord.xy/r;col*=.5+.5*smoothstep(1.25,.15,length(vp-vec2(.68,.58)));',
      'gl_FragColor=vec4(col,1.);}'].join('\n');
    function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { c.remove(); stage.classList.remove('has-plasma'); return; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm'), uMi = gl.getUniformLocation(pr, 'mi');
    var Q = .38, mx = -1e4, my = -1e4, tx = mx, ty = my, mi = 0, mit = 0, run = false, t0 = performance.now(), last = 0;
    function size(){ var w = Math.max(1, Math.round(c.clientWidth * Q)), hh = Math.max(1, Math.round(c.clientHeight * Q)); if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; gl.viewport(0, 0, w, hh); } }
    function draw(now){
      if (now - last < 32 && run && !reduce) { requestAnimationFrame(draw); return; } last = now;
      size(); mx += (tx - mx) * .08; my += (ty - my) * .08; mi += (mit - mi) * .05;
      gl.uniform2f(uR, c.width, c.height); gl.uniform1f(uT, (now - t0) / 1000); gl.uniform2f(uM, mx * Q, (c.clientHeight - my) * Q); gl.uniform1f(uMi, mi);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (run && !reduce) requestAnimationFrame(draw);
    }
    var host = stage.parentNode;
    host.addEventListener('pointermove', function(e){ var rr = c.getBoundingClientRect(); tx = e.clientX - rr.left; ty = e.clientY - rr.top; if (mx < -1e3) { mx = tx; my = ty; } mit = 1; });
    host.addEventListener('pointerleave', function(){ mit = 0; });
    addEventListener('resize', function(){ if (!run) draw(performance.now()); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(draw); } else if (!v) run = false; }).observe(stage);
    else { run = true; requestAnimationFrame(draw); }
    if (reduce) draw(t0 + 12000);
  }
  document.querySelectorAll('.rc-stage').forEach(rcPlasma);

  /* ---------- Services: 3D signal wave field (canvas 2D) - rolls behind the showcase, takes each service's colour ---------- */
  function svcWave(sec, o){
    o = o || {};
    var c = document.createElement('canvas'); c.className = o.cls || 'svc-wave'; c.setAttribute('aria-hidden', 'true');
    var ctx = c.getContext && c.getContext('2d'); if (!ctx) return;
    sec.insertBefore(c, sec.firstChild);
    var hex = function(h){ return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
    var rgb = function(a){ return 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')'; };
    var PAL = o.pal || [['#3b82f6','#22d3ee'],['#f59e0b','#fb7185'],['#22c55e','#14b8a6'],['#06b6d4','#3b82f6'],['#8b5cf6','#ec4899'],['#6366f1','#0ea5e9'],['#f97316','#14b8a6'],['#ec4899','#8b5cf6']], AM = o.alpha || 1;
    var ca = hex(PAL[0][0]), cb = hex(PAL[0][1]), ta = ca.slice(), tb = cb.slice(), auto = true, autoI = 0, autoT = 0;
    var W = 0, H = 0, dpr = Math.min(2, devicePixelRatio || 1), run = false, last = 0, prevT = 0, t = 0, ripple = 0;
    var mx = -1, my = -1, hov = 0, hovT = 0, COLS = 76, ROWS = 30, pts = new Float32Array(76 * 2), hs = new Float32Array(76);
    if (o.listen !== false) document.addEventListener('svccolor', function(e){ ta = hex(e.detail[0]); tb = hex(e.detail[1]); auto = false; ripple = 0; });
    var rl = sec.querySelector('.reel'), g0 = rl && rl.style.getPropertyValue('--ga').trim();
    if (sec.classList.contains('has-reel') && /^#[0-9a-f]{6}$/i.test(g0)) { ta = hex(g0); tb = hex(rl.style.getPropertyValue('--gb').trim()); ca = ta.slice(); cb = tb.slice(); auto = false; }
    function size(){ var w = c.clientWidth, h = c.clientHeight; if (w !== W || h !== H) { W = w; H = h; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); COLS = Math.round(Math.max(28, Math.min(76, w / 19))); ROWS = w < 700 ? 20 : 30; } }
    function draw(now){
      if (now - last < 32 && run && !reduce) { requestAnimationFrame(draw); return; }
      var dt = Math.min(.1, (now - (prevT || now)) / 1000); prevT = now; last = now; t += dt; ripple += dt;
      size(); if (!W || !H) { if (run && !reduce) requestAnimationFrame(draw); return; }
      if (auto) { autoT += dt; if (autoT > 4.5) { autoT = 0; autoI = (autoI + 1) % PAL.length; ta = hex(PAL[autoI][0]); tb = hex(PAL[autoI][1]); ripple = 0; } }
      for (var k = 0; k < 3; k++) { ca[k] += (ta[k] - ca[k]) * .05; cb[k] += (tb[k] - cb[k]) * .05; }
      hov += (hovT - hov) * .08;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var f = Math.max(W, 900) * .55, cx = W * .5, hy = H * .3, camH = 1.25;
      var Z0 = camH * f / (H * 1.02 - hy), Z1 = Z0 * 5.2;
      var g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, rgb(cb)); g.addColorStop(.6, rgb(ca)); g.addColorStop(1, rgb(cb));
      ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = 1.1;
      var mxp = 1e3, mzp = 1e3;
      if (hov > .01 && my > hy + 6) { mzp = f * camH / (my - hy); mxp = (mx - cx) * mzp / f; }
      var rr = ripple * 2.4, rfade = Math.exp(-ripple * .55);
      for (var r = ROWS - 1; r >= 0; r--) {
        var q = r / (ROWS - 1), z = Z0 * Math.pow(Z1 / Z0, q), depth = 1 - q;
        var hw = (W / 2) * z / f * 1.08;
        ctx.beginPath();
        for (var i = 0; i < COLS; i++) {
          var x = -hw + 2 * hw * i / (COLS - 1);
          var y = .22 * Math.sin(x * 1.25 + t * .85) + .16 * Math.sin(z * 1.05 - t * 1.15) + .1 * Math.sin(x * .6 + z * .85 + t * .45);
          if (hov > .01) { var dx = x - mxp, dz = z - mzp; y += .32 * hov * Math.exp(-(dx * dx + dz * dz) * 1.4); }
          var rx = x - .7, rz = z - Z0 * 1.9, rd = Math.sqrt(rx * rx + rz * rz);
          y += .3 * rfade * Math.exp(-Math.pow((rd - rr) * 2, 2));
          var sx = cx + x * f / z, sy = hy + (camH - y) * f / z;
          if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy);
          pts[i * 2] = sx; pts[i * 2 + 1] = sy; hs[i] = y;
        }
        ctx.globalAlpha = (.07 + .45 * depth * depth) * AM * (W < 700 ? .7 : 1); ctx.stroke();
        ctx.globalAlpha = (.16 + .72 * depth) * AM * (W < 700 ? .7 : 1);
        var ds = .8 + 2.6 * depth;
        for (i = 0; i < COLS; i++) { var sz = ds * (1 + Math.max(0, hs[i]) * 2.6); ctx.fillRect(pts[i * 2] - sz / 2, pts[i * 2 + 1] - sz / 2, sz, sz); }
      }
      // keep the text side calm: fade the field behind the list and the heading
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out';
      var fx = o.hole ? o.hole[0] * W : (W > 1023 ? W * .24 : W * .5), fy = o.hole ? o.hole[1] * H : (W > 1023 ? H * .52 : H * .3), fr = o.hole ? o.hole[2] * W : (W > 1023 ? W * .26 : W * .7);
      var mg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr); mg.addColorStop(0, 'rgba(0,0,0,.72)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
      var tg = ctx.createLinearGradient(0, hy - 10, 0, hy + H * .12); tg.addColorStop(0, 'rgba(0,0,0,1)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, hy + H * .12);
      ctx.globalCompositeOperation = 'source-over';
      if (run && !reduce) requestAnimationFrame(draw);
    }
    if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
      sec.addEventListener('pointermove', function(e){ var rc = c.getBoundingClientRect(); mx = e.clientX - rc.left; my = e.clientY - rc.top; hovT = 1; }, {passive:true});
      sec.addEventListener('pointerleave', function(){ hovT = 0; });
    }
    addEventListener('resize', function(){ dpr = Math.min(2, devicePixelRatio || 1); W = 0; if (!run) draw(performance.now()); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ var v = es[0].isIntersecting; if (v && !run) { run = true; prevT = 0; requestAnimationFrame(draw); } else if (!v) run = false; }).observe(sec);
    else { run = true; requestAnimationFrame(draw); }
    if (reduce) { t = 3; draw(performance.now()); }
  }
  var svcSecW = document.querySelector('section.services');
  if (svcSecW) svcWave(svcSecW);
  if (document.getElementById('orvexPipe')) document.querySelectorAll('section.section.light').forEach(function(sec){ svcWave(sec, {listen:false, alpha:.6, pal:[['#3b82f6','#22d3ee'],['#0ea5e9','#6366f1']], hole:[.3,.4,.4]}); });
  var proSec = document.querySelector('section.process.light');
  if (proSec) svcWave(proSec, {listen:false, alpha:.55, pal:[['#3b82f6','#22d3ee'],['#6366f1','#22d3ee'],['#0ea5e9','#8b5cf6']], hole:[.3,.34,.42]});


  /* ---------- ReCura live dashboard demo ---------- */
  document.querySelectorAll('.rc-app').forEach(function(app){
    var wrap = app.parentNode, vis = false, view = app.dataset.view || 'home', counted = false;
    var BW = app.classList.contains('compact') ? 894 : 1100;
    function fit(){ app.style.setProperty('--s', (wrap.clientWidth / BW).toFixed(4)); }
    fit(); if ('ResizeObserver' in window) new ResizeObserver(fit).observe(wrap); else addEventListener('resize', fit);
    var d = new Date(), hr = d.getHours();
    var dt = app.querySelector('.ra-date'); if (dt) dt.textContent = d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
    var hi = app.querySelector('.rv-home .ra-hello'); if (hi) hi.textContent = (hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') + ', Demo Clinic';
    var views = app.querySelectorAll('.rv'), navs = app.querySelectorAll('.ra-nav-i');
    function count(){
      if (counted) return; counted = true; app.classList.add('drawn');
      app.querySelectorAll('.ra-stat b[data-to]').forEach(function(b){ var to = +b.dataset.to, s = performance.now(); if (reduce) return;
        (function step(now){ var k = Math.min(1, (now - s) / 1400), e = 1 - Math.pow(1 - k, 3); b.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); })(s); });
    }
    // toasts
    var toasts = app.querySelectorAll('.ra-toast'), ti = 0;
    // mini comeback button
    var mini = app.querySelector('.ra-cb .ra-btn'), miniTick = 0;
    // comeback rows
    var sends = app.querySelectorAll('.ra-send'), si = 0;
    // new patient typing
    var typing = false;
    app.querySelectorAll('.rv-new .ra-input').forEach(function(el){ var p = el.querySelector('.ra-ph'); el.dataset.ph = p ? p.textContent : ''; });
    function typeForm(){
      if (typing) return; typing = true;
      var inputs = app.querySelectorAll('.rv-new .ra-input'), btn = app.querySelector('.ra-create'), k = 0;
      inputs.forEach(function(el){ el.innerHTML = '<em class="ra-ph">' + (el.dataset.ph || '') + '</em>'; el.classList.remove('typing'); });
      app.querySelectorAll('.ra-enc').forEach(function(e){ e.classList.remove('on'); });
      function next(){
        if (view !== 'newpatient' || !vis) { typing = false; return; }
        if (k >= inputs.length) { btn.classList.add('press'); btn.textContent = 'Saving…';
          setTimeout(function(){ btn.classList.remove('press'); btn.textContent = 'Patient created ✓'; setTimeout(function(){ btn.textContent = 'Create patient'; typing = false; if (view === 'newpatient' && vis) setTimeout(typeForm, 400); }, 2200); }, 700); return; }
        var el = inputs[k], txt = el.dataset.type, n = 0; el.innerHTML = ''; el.classList.add('typing');
        (function ch(){ if (view !== 'newpatient') { typing = false; return; } el.textContent = txt.slice(0, ++n); if (n < txt.length) setTimeout(ch, 55 + Math.random() * 40); else { el.classList.remove('typing'); var enc = el.parentNode.querySelector('.ra-enc'); if (enc) enc.classList.add('on'); k++; setTimeout(next, 260); } })();
      }
      next();
    }
    var scr = app.querySelector('.ra-scr'), A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789+/';
    function setView(v){
      view = v; views.forEach(function(el){ el.classList.toggle('on', el.dataset.rv === v); });
      navs.forEach(function(n){ n.classList.toggle('on', n.dataset.nav === v); });
      if (v === 'comeback') { sends.forEach(function(s){ s.classList.remove('sent'); s.querySelector('span').textContent = 'Send'; }); si = 0; }
      if (v === 'newpatient' && vis && !reduce) setTimeout(typeForm, 500);
    }
    app.__setView = setView;
    if (reduce) { count(); app.classList.add('drawn'); }
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis = es[0].isIntersecting; if (vis) { count(); if (view === 'newpatient') typeForm(); } }).observe(wrap); else { vis = true; count(); }
    if (reduce) return;
    setInterval(function(){
      if (!vis) return;
      if (view === 'home') {
        if (toasts.length) { toasts[ti].classList.remove('show'); ti = (ti + 1) % toasts.length; toasts[ti].classList.add('show'); }
        if (mini) { miniTick = (miniTick + 1) % 4; if (miniTick === 2) { mini.classList.add('sent'); mini.querySelector('span').textContent = 'Sent · 4 invites'; } if (miniTick === 0) { mini.classList.remove('sent'); mini.querySelector('span').textContent = 'Send WhatsApp invites'; } }
      } else if (view === 'comeback') {
        if (si < sends.length) { sends[si].classList.add('sent'); sends[si].querySelector('span').textContent = 'Sent ✓'; si++; }
        else { sends.forEach(function(s){ s.classList.remove('sent'); s.querySelector('span').textContent = 'Send'; }); si = 0; }
      }
      if (scr && view === 'newpatient') { var s2 = ''; for (var q = 0; q < 16; q++) s2 += A.charAt(Math.floor(Math.random() * A.length)); scr.textContent = s2; }
    }, 1600);
  });

})();
