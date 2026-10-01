/* Case page UI that runs once lock.js has decrypted the content:
   contents (rail on wide screens, top bar + sheet on narrow ones) with scroll-spy + reading progress,
   Listen (play / pause) + theme buttons top right, data blocks that play on scroll,
   previous / next case links, and the image lightbox. */
(() => {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const audio = $('#voice'), list = $('#tocList');
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sections = [], links = [];

  /* ── contents ── */
  function buildToc(main){
    sections = [...main.querySelectorAll('.c-sec')].filter(s => s.querySelector('.c-label'));
    list.innerHTML = '';
    links = sections.map((sec, i) => {
      const title = sec.querySelector('.c-label').textContent.trim();
      sec.id ||= 's-' + (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || i);
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + sec.id; a.textContent = title;
      a.addEventListener('click', e => {
        e.preventDefault();
        setToc(false);
        sec.scrollIntoView({ behavior: still() ? 'auto' : 'smooth' });
        history.replaceState(null, '', a.href);
      });
      li.append(a); list.append(li);
      return a;
    });
  }

  function update(){
    const vh = innerHeight, y = scrollY;
    const max = root.scrollHeight - vh;
    root.style.setProperty('--p', (max > 0 ? Math.min(1, y / max) : 0).toFixed(4));
    // contents fade out once the article ends, so the sticky rail never drags them past the pinned back button
    root.classList.toggle('toc-out', $('#case').getBoundingClientRect().bottom < vh * .6);
    if (!sections.length) return;

    // reading line: 30% from the top, sliding down to the bottom edge during the last screen of scroll,
    // so the short sections at the end get their turn instead of being skipped
    const tail = Math.min(1, Math.max(0, 1 - (max - y) / vh));
    const line = vh * (.3 + .7 * tail);
    const tops = sections.map(s => s.getBoundingClientRect().top);
    let cur = -1;
    tops.forEach((t, i) => { if (t <= line) cur = i });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
    $('#barTitle').textContent = cur < 0 ? (document.querySelector('.c-hero h1')?.textContent || '') : links[cur].textContent;

    // the progress line on the rail runs through the active item, proportionally to how far into its section we are
    let tp = 0;
    if (cur >= 0){
      const end = cur + 1 < tops.length ? tops[cur + 1] : $('#case').getBoundingClientRect().bottom;
      const f = Math.min(1, Math.max(0, (line - tops[cur]) / Math.max(1, end - tops[cur])));
      tp = links[cur].offsetTop + f * links[cur].offsetHeight;
    }
    list.style.setProperty('--tp', tp.toFixed(1) + 'px');
  }

  function setToc(open){
    root.classList.toggle('toc-open', open);
    $('#barSec').setAttribute('aria-expanded', open);
  }
  $('#barSec').addEventListener('click', () => setToc(!root.classList.contains('toc-open')));
  document.addEventListener('click', e => { if (root.classList.contains('toc-open') && !e.target.closest('#toc,#bar')) setToc(false) });

  /* ── top-right tools: Listen plays / pauses the voice-over at 1.5×; theme toggle shares the key with the home page ── */
  audio.defaultPlaybackRate = audio.playbackRate = 1.5;
  $('#listen').addEventListener('click', () => {
    if (root.classList.contains('no-voice')) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  });
  audio.addEventListener('play', () => root.classList.add('playing'));
  audio.addEventListener('pause', () => root.classList.remove('playing'));
  audio.addEventListener('ended', () => { root.classList.remove('playing'); audio.currentTime = 0 });
  // Only a click on Listen starts the voice-over. Headphones, media keys and the OS "Now Playing" widget send "play"
  // to the last page that made sound — while the visitor was already on another page or tab — so ignore it in the background,
  // and stop for good when the page is left (incl. the back/forward cache).
  if ('mediaSession' in navigator){
    navigator.mediaSession.setActionHandler('play', () => { if (document.visibilityState === 'visible') audio.play().catch(() => {}) });
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  }
  addEventListener('pagehide', () => audio.pause());
  $('#themeBtn').addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = t;
    try { localStorage.setItem('theme', t) } catch {}
  });

  /* ── data blocks: play once when scrolled into view ── */
  // "−50%", "+1,840", "2.4M", "~1 mo" → prefix, number, suffix; the number counts up from 0
  function countUp(el, dur = 1200){
    const m = el.textContent.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s);
    if (!m) return;
    const [, pre, num, post] = m, to = parseFloat(num.replace(/,/g, '')), dec = (num.split('.')[1] || '').length, comma = num.includes(',');
    const out = v => pre + (comma ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + post;
    el.textContent = out(0);
    el._play = () => {
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = out(k < 1 ? to * e : to);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
  }

  // <div class="c-shift" data-from="9" data-to="3"><span>label</span></div>
  function buildShift(el){
    const from = +el.dataset.from, to = +el.dataset.to, label = el.querySelector('span');
    const num = document.createElement('div'), row = document.createElement('div');
    num.className = 'sh-num'; row.className = 'sh-row';
    num.innerHTML = `<b><s>${from} →</s> <em>${from}</em></b>`;
    if (label) num.append(label);
    for (let i = 0; i < Math.max(from, to); i++){
      const s = document.createElement('i');
      if (i >= to) s.classList.add('gone');
      s.style.setProperty('--d', ((Math.max(from, to) - 1 - i) * .07).toFixed(2) + 's');
      row.append(s);
    }
    el.replaceChildren(num, row);
    el._play = () => {
      const n = num.querySelector('em'), steps = Math.abs(from - to), dir = Math.sign(to - from);
      for (let k = 1; k <= steps; k++) setTimeout(() => { n.textContent = from + dir * k }, k * 70 + 150);
      setTimeout(() => el.classList.add('done'), steps * 70 + 700);
    };
  }

  function dataBlocks(main){
    const blocks = [...main.querySelectorAll('.c-stats,.c-nums,.c-bars,.c-shift,.c-cols,.c-company dl')];
    main.querySelectorAll('.c-shift').forEach(buildShift);
    // numbers that count up: stat values, big numbers in .c-nums, values in the company card
    const nums = el => [...el.querySelectorAll(el.closest('.c-company') ? 'dd' : ':scope > div > b, dt')];
    if (still() || !('IntersectionObserver' in window)){
      blocks.forEach(b => b.classList.add('in', 'done'));
      main.querySelectorAll('.c-shift em').forEach(n => { n.textContent = n.closest('.c-shift').dataset.to });
      return;
    }
    blocks.forEach(b => { if (!b.matches('.c-shift,.c-bars')) nums(b).forEach(n => countUp(n)) });
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const b = e.target;
      io.unobserve(b);
      b.classList.add('in');
      if (b._play) b._play();
      nums(b).forEach(n => n._play && n._play());
    }), { rootMargin: '0px 0px -6% 0px' });
    blocks.forEach(b => io.observe(b));
  }

  /* ── previous / next case, cyclic, from cases.js ── */
  function buildNext(){
    const all = window.CASES || [], i = all.findIndex(c => c.slug === root.dataset.case), nav = $('#next');
    if (i < 0 || all.length < 2) return;
    const card = (c, dir) => `<a href="${c.slug}.html"><span class="nx-dir" aria-label="${dir === 'prev' ? 'Previous case' : 'Next case'}"><svg aria-hidden="true"><use href="#i-${dir === 'prev' ? 'left' : 'right'}"/></svg></span>
      <strong>${c.title}</strong><span class="c-chips">${c.tags.map(t => `<span>${t}</span>`).join('')}</span></a>`;
    nav.innerHTML = card(all[(i - 1 + all.length) % all.length], 'prev') + card(all[(i + 1) % all.length], 'next');
    nav.hidden = false;
  }

  /* ── lightbox: click an image to open it; click again (or the zoom button) for real size ── */
  const lb = $('#lb'), lbImg = $('#lbImg');
  let pics = [], at = 0;
  const fitsAlready = () => lbImg.naturalWidth <= lbImg.clientWidth + 1 && lbImg.naturalHeight <= lbImg.clientHeight + 1;

  function show(i){
    at = (i + pics.length) % pics.length;
    const img = pics[at];
    lb.classList.remove('zoom', 'fit-all');
    lbImg.onload = () => lb.classList.toggle('fit-all', fitsAlready());
    lbImg.src = img.src; lbImg.alt = img.alt;
    $('#lbCap').textContent = img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
    $('#lbCount').textContent = pics.length > 1 ? `${at + 1} / ${pics.length}` : '';
    $('#lbPrev').hidden = $('#lbNext').hidden = pics.length < 2;
  }
  function openLb(img){
    pics = [...document.querySelectorAll('.c-fig img.in:not(.broken)')];
    show(pics.indexOf(img));
    lb.classList.add('open'); root.classList.add('lb-on');
    $('#lbClose').focus({ preventScroll: true });
  }
  function closeLb(){ lb.classList.remove('open', 'zoom'); root.classList.remove('lb-on') }
  function zoom(e){
    if (lb.classList.contains('zoom')){ lb.classList.remove('zoom'); return }
    if (fitsAlready()) return;
    // keep the clicked point under the cursor after the jump to real size
    const r = lbImg.getBoundingClientRect();
    const cx = e ? e.clientX : innerWidth / 2, cy = e ? e.clientY : innerHeight / 2;
    const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    lb.classList.add('zoom');
    lb.scrollLeft = fx * lb.scrollWidth - cx;
    lb.scrollTop = fy * lb.scrollHeight - cy;
  }

  document.addEventListener('click', e => {
    const img = e.target.closest('.c-fig img.in:not(.broken)');
    if (img) openLb(img);
  });
  lbImg.addEventListener('click', e => { e.stopPropagation(); zoom(e) });
  lb.addEventListener('click', e => { if (e.target === lb) closeLb() });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbZoom').addEventListener('click', () => zoom());
  $('#lbPrev').addEventListener('click', () => show(at - 1));
  $('#lbNext').addEventListener('click', () => show(at + 1));

  document.addEventListener('keydown', e => {
    if (lb.classList.contains('open')){
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft' && pics.length > 1) show(at - 1);
      else if (e.key === 'ArrowRight' && pics.length > 1) show(at + 1);
    } else if (e.key === 'Escape') setToc(false);
  });

  /* ── footer: copy the email, like on the home page ── */
  const toast = $('#toast'); let tt;
  document.querySelectorAll('[data-mail]').forEach(b => b.addEventListener('click', async e => {
    const m = e.currentTarget.dataset.mail;
    try { await navigator.clipboard.writeText(m); toast.textContent = 'Email copied' } catch { location.href = 'mailto:' + m; return }
    toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 1600);
  }));

  /* ── wiring ── */
  document.addEventListener('case:ready', e => {
    const main = e.detail.main;
    if (!e.detail.voice) root.classList.add('no-voice');
    if (!e.detail.voice) $('#listen').title = 'Voice-over is coming soon';
    buildToc(main);
    dataBlocks(main);
    buildNext();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });
  document.addEventListener('case:voice', e => {
    if (e.detail){ audio.src = e.detail; root.classList.remove('no-voice'); $('#listen').removeAttribute('title') }
    else root.classList.add('no-voice');
  });
})();
