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
  const lock = $('#lock'), form = $('#lockForm'), pw = $('#pw'), err = $('#lockErr'), btn = $('#unlockBtn');

  /* theme toggle — same key as the home page */
  $('#themeBtn').addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    try{ localStorage.setItem('theme', t) }catch{}
  });

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
    reveal(main);
    $('#foot').hidden = false;
    return true;
  }

  async function loadImage(img, key){
    try{
      const buf = new Uint8Array(await (await fetch(img.dataset.enc)).arrayBuffer());
      const data = await crypto.subtle.decrypt({ name:'AES-GCM', iv:buf.subarray(0,12) }, key, buf.subarray(12));
      img.addEventListener('load', () => img.classList.add('in'), { once:true });
      img.src = URL.createObjectURL(new Blob([data], { type:img.dataset.type }));
    }catch(e){ img.classList.add('in', 'broken') }
  }

  /* sections rise in as they enter the viewport */
  function reveal(main){
    const els = main.querySelectorAll(':scope > *');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches){ els.forEach(e => e.classList.add('rv-in')); return }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('rv-in'); io.unobserve(e.target) } }), { rootMargin:'0px 0px -8% 0px' });
    els.forEach(e => { e.classList.add('rv'); io.observe(e) });
  }

  function unlocked(){
    lock.classList.add('out');
    root.classList.remove('locked');
    setTimeout(() => lock.remove(), 600);
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!pw.value) return;
    btn.disabled = true; err.textContent = '';
    try{
      await open(pw.value);
      store.set('case-pass', pw.value);
      unlocked();
    }catch{
      err.textContent = 'Wrong password';
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      pw.select();
    }finally{ btn.disabled = false }
  });

  if (!window.crypto || !crypto.subtle){
    err.textContent = 'Open this page over https to view it';
    btn.disabled = true;
    return;
  }

  root.classList.add('locked');
  const saved = store.get('case-pass');
  if (saved){ lock.classList.add('quiet'); open(saved).then(unlocked, () => { lock.classList.remove('quiet'); pw.focus() }) }
  else pw.focus();
})();
