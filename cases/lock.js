/* Password gate for case pages: the content and images are AES-GCM encrypted by tools/encrypt-case.mjs.
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
      await open(pw.value);
      store.set('case-pass', pw.value);
      unlocked();
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
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('lock')) $('#lockClose').click() });

  /* phones: while the keyboard is open the code sits midway between the top of the screen and the top of the keyboard;
     when it closes the code goes back to the centre */
  const vv = window.visualViewport;
  if (vv){
    const fit = () => {
      const kb = innerHeight - vv.height - vv.offsetTop;
      if (kb < 80){ form.style.translate = ''; return }
      const r = form.getBoundingClientRect(), mid = r.top + r.height / 2 - (parseFloat(getComputedStyle(form).translate.split(' ')[1]) || 0);
      form.style.translate = `0 ${Math.round(vv.offsetTop + vv.height / 2 - mid)}px`;
    };
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  }

  if (!window.crypto || !crypto.subtle){ pw.disabled = true; return }

  root.classList.add('locked');
  const saved = store.get('case-pass');
  if (saved){ lock.classList.add('quiet'); open(saved).then(unlocked, () => { lock.classList.remove('quiet'); pw.focus(); paint() }) }
  else { pw.focus(); paint() }
})();
