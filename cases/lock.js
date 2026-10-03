/* Password gate for case pages: the content and images are AES-GCM encrypted by tools/encrypt-case.mjs.
   Two modes: a closed case is one encrypted payload behind a full-screen code; an open case ("mode":"open") is plain HTML
   where only the NDA fragments are encrypted — they sit under a scratch-off foil and ask for the code in a modal.
   A correct password is kept in sessionStorage so the other cases open without asking again. */
(() => {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const store = {
    get(k){ try{ return sessionStorage.getItem(k) }catch{ return null } },
    set(k,v){ try{ sessionStorage.setItem(k,v) }catch{} }
  };
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const payload = JSON.parse($('#payload').textContent);
  const lock = $('#lock'), form = $('#lockForm'), pw = $('#pw'), cells = form.querySelectorAll('span');
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let attempt = open, done = unlocked;   // what a full code does: the open-case mode swaps both

  async function deriveKey(pass){
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name:'PBKDF2', salt:b64(payload.salt), iterations:payload.iter, hash:'SHA-256' },
      base, { name:'AES-GCM', length:256 }, false, ['decrypt']);
  }

  async function open(pass){
    const key = await deriveKey(pass);
    const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name:'AES-GCM', iv:b64(payload.iv) }, key, b64(payload.ct)));
    const main = $('#case');
    main.innerHTML = html;
    const h1 = main.querySelector('h1');
    if (h1) document.title = h1.textContent.trim() + ' — Vladislav Kurguzov';
    main.querySelectorAll('img[data-enc]').forEach(img => loadImage(img, key));
    main.querySelectorAll('video[data-enc]').forEach(v => loadVideo(v, key));
    const voice = main.querySelector('audio[data-enc]');
    if (voice){ loadVoice(voice, key); voice.remove() }   // out of the flow, or the hero stops being the first child and loses its top alignment
    reveal(main);
    $('#foot').hidden = false;
    document.dispatchEvent(new CustomEvent('case:ready', { detail:{ main, voice:!!voice } }));
    return true;
  }

  async function decryptFile(url, key){
    const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
    return crypto.subtle.decrypt({ name:'AES-GCM', iv:buf.subarray(0,12) }, key, buf.subarray(12));
  }

  /* voice-over: decrypted into a blob and handed to the player (case-ui.js) */
  async function loadVoice(el, key){
    try{
      const url = URL.createObjectURL(new Blob([await decryptFile(el.dataset.enc, key)], { type:el.dataset.type }));
      document.dispatchEvent(new CustomEvent('case:voice', { detail:url }));
    }catch(e){ document.dispatchEvent(new CustomEvent('case:voice', { detail:null })) }
  }

  async function loadImage(img, key){
    try{
      const data = await decryptFile(img.dataset.enc, key);
      img.addEventListener('load', () => img.classList.add('in'), { once:true });
      img.src = URL.createObjectURL(new Blob([data], { type:img.dataset.type }));
    }catch(e){ img.classList.add('in', 'broken') }
  }

  /* videos: decrypted into a blob; muted + looped, case-ui.js plays them only while they're on screen */
  async function loadVideo(v, key){
    try{
      const data = await decryptFile(v.dataset.enc, key);
      v.addEventListener('loadeddata', () => v.classList.add('in'), { once:true });
      v.src = URL.createObjectURL(new Blob([data], { type:v.dataset.type }));
    }catch(e){ v.classList.add('in', 'broken') }
  }

  /* sections rise in as they enter the viewport */
  function reveal(main){
    const els = main.querySelectorAll(':scope > *');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches){ els.forEach(e => e.classList.add('rv-in')); return }
    const show = el => { el.classList.add('rv-in'); io.unobserve(el) };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) show(e.target) }), { rootMargin:'0px 0px -8% 0px' });
    els.forEach(e => { e.classList.add('rv'); io.observe(e) });
    /* safety net: the content arrives after decryption, so the browser restores the scroll position with a jump
       and the observer can miss sections — on every scroll anything already above the fold is shown too */
    let raf = 0;
    const sweep = () => { raf = 0; els.forEach(el => { if (!el.classList.contains('rv-in') && el.getBoundingClientRect().top < innerHeight * .92) show(el) }) };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sweep) }, { passive:true });
    addEventListener('load', () => setTimeout(sweep, 50));
  }

  function unlocked(){
    lock.classList.add('out');
    root.classList.remove('locked');
    setTimeout(() => lock.remove(), 600);
  }

  /* one input drawn as 6 cells: a dot per digit, the next cell highlighted; the 6th digit checks the code */
  function paint(){
    const n = pw.value.length, focus = document.activeElement === pw;
    cells.forEach((c, i) => { c.classList.toggle('on', i < n); c.classList.toggle('cur', focus && i === Math.min(n, cells.length - 1)) });
  }
  async function check(){
    form.classList.add('busy'); pw.disabled = true;
    try{
      await attempt(pw.value);
      store.set('case-pass', pw.value);
      done();
    }catch{
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake', 'bad');
      setTimeout(() => { form.classList.remove('bad'); pw.value = ''; paint(); pw.focus() }, 450);
    }finally{ form.classList.remove('busy'); pw.disabled = false; pw.focus() }
  }
  pw.addEventListener('input', () => {
    pw.value = pw.value.replace(/\D/g, '').slice(0, cells.length);
    paint();
    if (pw.value.length === cells.length) check();
  });
  ['focus', 'blur', 'keyup', 'click'].forEach(t => pw.addEventListener(t, paint));
  form.addEventListener('submit', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !document.getElementById('lock') || (lock.classList.contains('modal') && !lock.classList.contains('show'))) return;
    $('#lockClose').click();
  });

  /* phones: while the keyboard is open the code sits midway between the top of the screen and the top of the keyboard;
     when it closes the code goes back to the centre */
  const vv = window.visualViewport;
  if (vv){
    const fit = () => {
      const kb = innerHeight - vv.height - vv.offsetTop;
      const title = $('#lockTitle');   // only in shells built after the open-case mode
      if (kb < 80){ form.style.translate = ''; if (title) title.style.translate = ''; return }
      const r = form.getBoundingClientRect(), mid = r.top + r.height / 2 - (parseFloat(getComputedStyle(form).translate.split(' ')[1]) || 0);
      form.style.translate = `0 ${Math.round(vv.offsetTop + vv.height / 2 - mid)}px`;
      if (title) title.style.translate = form.style.translate;
    };
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  }

  if (payload.mode === 'open'){ openCase(); return }
  if (!window.crypto || !crypto.subtle){ pw.disabled = true; return }

  root.classList.add('locked');
  const saved = store.get('case-pass');
  if (saved){ lock.classList.add('quiet'); open(saved).then(unlocked, () => { lock.classList.remove('quiet'); pw.focus(); paint() }) }
  else { pw.focus(); paint() }
  /* ── open case: the text is already on the page, only [data-nda] fragments are encrypted ── */
  function openCase(){
    const main = $('#case'), title = $('#lockTitle');
    const shown = el => el.classList.add('in');
    const media = scope => {
      scope.querySelectorAll('img:not([data-enc])').forEach(img => img.complete && img.naturalWidth ? shown(img) : img.addEventListener('load', () => shown(img), { once:true }));
      scope.querySelectorAll('video:not([data-enc])').forEach(v => v.readyState >= 2 ? shown(v) : v.addEventListener('loadeddata', () => shown(v), { once:true }));
    };
    media(main);
    const voice = main.querySelector('audio[data-enc]');   // encrypted like the NDA data: it reads them aloud
    voice?.remove();
    reveal(main);
    $('#foot').hidden = false;
    document.dispatchEvent(new CustomEvent('case:ready', { detail:{ main, voice:!!voice } }));

    const foils = [...main.querySelectorAll('.nda')];
    if (!foils.length && !voice){ lock.remove(); return }   // nothing hidden — no code screen at all
    title.hidden = false;
    lock.classList.add('modal');
    lock.setAttribute('aria-label', 'Password for the hidden data');

    /* the modal */
    let opener = null;
    const show = el => { opener = el; pw.value = ''; lock.classList.add('show'); pw.focus({ preventScroll:true }); paint() };
    const hide = () => { lock.classList.remove('show'); pw.blur(); opener?.isConnected && opener.focus({ preventScroll:true }) };
    $('#lockClose').addEventListener('click', e => { e.preventDefault(); hide() });
    lock.addEventListener('click', e => { if (e.target === lock) hide() });
    // Listen before the code: the modal instead of the player (captured before case-ui.js sees the click)
    if (voice) document.addEventListener('click', e => {
      if (got || !e.target.closest('#listen')) return;
      e.stopPropagation(); show($('#listen'));
    }, true);
    foils.forEach(f => {
      f.addEventListener('click', () => show(f));
      f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); show(f) } });
    });

    /* the foil: silver bands + grain on a canvas, redrawn on resize and theme change */
    const css = n => getComputedStyle(root).getPropertyValue(n).trim();
    let grain = null, grainFor = '';
    function grainTile(ctx){
      const c = css('--foil-grain');
      if (grain && grainFor === c) return grain;
      const t = document.createElement('canvas'); t.width = t.height = 96;
      const g = t.getContext('2d'); g.fillStyle = c;
      for (let i = 0; i < 1400; i++) g.fillRect(Math.random() * 96 | 0, Math.random() * 96 | 0, 1, 1);
      grainFor = c;
      return grain = ctx.createPattern(t, 'repeat');
    }
    function paintFoil(cv){
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (!w || !h) return;
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, w, Math.max(h, w * .25));
      const [a, b, c] = ['--foil-1', '--foil-2', '--foil-3'].map(css);
      [[0, a], [.3, b], [.46, c], [.54, b], [.78, a], [1, b]].forEach(([o, col]) => g.addColorStop(o, col));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = grainTile(ctx); ctx.fillRect(0, 0, w, h);
    }
    const canvases = new Set();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => paintFoil(e.target))) : null;
    const addFoil = host => { const cv = document.createElement('canvas'); host.prepend(cv); canvases.add(cv); ro ? ro.observe(cv) : paintFoil(cv); return cv };
    foils.forEach(addFoil);
    new MutationObserver(() => canvases.forEach(cv => cv.isConnected && paintFoil(cv))).observe(root, { attributes:true, attributeFilter:['data-theme'] });

    /* scratch it off: a round brush zig-zags across the canvas, then whatever is left fades */
    function scratch(cv, end){
      const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      const lw = h < 120 ? h * 1.1 : Math.max(48, Math.min(w, h) / 4);
      const pts = [];
      if (h <= lw * 1.2){ for (let x = -lw / 2, i = 0; x <= w + lw; x += lw * .7, i++) pts.push([x, i % 2 ? h * .8 : h * .2]) }
      else { const rows = Math.ceil(h / (lw * .6)); for (let i = 0; i <= rows; i++) pts.push([i % 2 ? w + lw / 3 : -lw / 3, i * h / rows]) }
      const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const total = seg.reduce((s, l) => s + l, 0), dur = 650, t0 = performance.now();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lw; ctx.lineCap = ctx.lineJoin = 'round';
      let drawn = 0;
      (function frame(now){
        const k = Math.min(1, (now - t0) / dur), to = total * (1 - Math.pow(1 - k, 2));
        ctx.beginPath();
        let acc = 0, moved = false;
        for (let i = 0; i < seg.length; i++){
          const a = acc, b = acc + seg[i]; acc = b;
          if (b < drawn || a > to) continue;
          const f0 = Math.max(0, (drawn - a) / seg[i]), f1 = Math.min(1, (to - a) / seg[i]);
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
          if (!moved){ ctx.moveTo(x0 + (x1 - x0) * f0, y0 + (y1 - y0) * f0); moved = true }
          ctx.lineTo(x0 + (x1 - x0) * f1, y0 + (y1 - y0) * f1);
        }
        ctx.stroke();
        drawn = to;
        if (k < 1) return requestAnimationFrame(frame);
        cv.style.opacity = 0;
        setTimeout(end, 260);
      })(t0);
    }

    /* the code: every fragment is sealed with the same key, so a wrong code fails on the first one */
    let got = null;
    attempt = async pass => {
      const key = await deriveKey(pass);
      const dec = async f => new TextDecoder().decode(await crypto.subtle.decrypt({ name:'AES-GCM', iv:b64(f.iv) }, key, b64(f.ct)));
      got = { key, html:await Promise.all(payload.frags.map(dec)) };
    };
    done = () => { hide(); place(true) };

    function place(animate){
      if (voice) loadVoice(voice, got.key);
      got.html.forEach((html, i) => {
        const host = main.querySelector(`[data-nda="${i}"]`);
        if (!host) return;
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        const real = tpl.content.firstElementChild;
        real.querySelectorAll('img[data-enc]').forEach(img => loadImage(img, got.key));
        real.querySelectorAll('video[data-enc]').forEach(v => loadVideo(v, got.key));
        media(real);
        const data = real.matches('.c-stats,.c-nums,.c-bars,.c-cols,.c-calc') ? real : null;
        if (!animate || still()){
          host.replaceWith(real);
          data?.classList.add('in', 'done');
          return;
        }
        // the foil is redrawn over the real thing (the image only, so a figure keeps its caption) and scratched off
        host.replaceWith(real);
        const target = real.matches('figure') ? real.querySelector('img,video') || real : real;
        const wrap = document.createElement(target.matches('span') ? 'span' : 'div');
        wrap.className = 'nda-rev';
        target.replaceWith(wrap);
        wrap.append(target);
        const cv = document.createElement('canvas');
        wrap.append(cv);
        paintFoil(cv);
        requestAnimationFrame(() => data?.classList.add('in'));
        setTimeout(() => scratch(cv, () => wrap.replaceWith(target)), i * 120);
      });
      lock.remove();
    }

    const saved = store.get('case-pass');
    if (saved && window.crypto && crypto.subtle) attempt(saved).then(() => place(false), () => {});
  }
})();
