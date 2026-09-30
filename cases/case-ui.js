/* Case page UI that runs once lock.js has decrypted the content:
   contents (rail on wide screens, dock + sheet on narrow ones) with scroll-spy + reading progress,
   the voice-over pill in the nav, and the image lightbox. */
(() => {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;
  const audio = $('#voice'), wave = $('#wave'), list = $('#tocList');
  const BARS = 22;
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
        sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', a.href);
        setToc(false);
      });
      li.append(a); list.append(li);
      return a;
    });
  }

  function update(){
    if (!sections.length) return;
    const vh = innerHeight;
    let cur = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * .4) cur = i });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
    $('#dkTitle').textContent = links[cur].textContent;

    const max = document.documentElement.scrollHeight - vh;
    root.style.setProperty('--p', (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4));
  }

  function setToc(open){
    root.classList.toggle('toc-open', open);
    ['#dkSec', '#dkList'].forEach(s => $(s).setAttribute('aria-expanded', open));
  }
  const toggleToc = () => setToc(!root.classList.contains('toc-open'));
  $('#dkSec').addEventListener('click', toggleToc);
  $('#dkList').addEventListener('click', toggleToc);
  document.addEventListener('click', e => { if (root.classList.contains('toc-open') && !e.target.closest('#toc,#dock')) setToc(false) });

  /* ── voice-over pill ── */
  // a fixed, speech-like silhouette — the real waveform isn't known until the audio is decoded
  for (let i = 0; i < BARS; i++){
    const h = .25 + .75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * .43 + 1) * .9 + Math.sin(i * .21) * .25);
    const b = document.createElement('i'); b.style.setProperty('--h', Math.min(1, h).toFixed(2)); wave.append(b);
  }
  const bars = [...wave.children];
  const fmt = t => !isFinite(t) ? '0:00' : Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const hasVoice = () => !root.classList.contains('no-voice');
  const toggle = () => { if (hasVoice()) audio.paused ? audio.play().catch(() => {}) : audio.pause() };

  function paint(){
    const f = audio.duration ? audio.currentTime / audio.duration : 0;
    bars.forEach((b, i) => b.classList.toggle('on', i / BARS < f));
    wave.setAttribute('aria-valuenow', Math.round(f * 100));
    wave.setAttribute('aria-valuetext', fmt(audio.currentTime) + ' of ' + fmt(audio.duration));
  }
  audio.addEventListener('timeupdate', paint);
  audio.addEventListener('loadedmetadata', paint);
  audio.addEventListener('play', () => root.classList.add('playing'));
  audio.addEventListener('pause', () => root.classList.remove('playing'));
  audio.addEventListener('ended', () => root.classList.remove('playing'));
  document.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', toggle));

  const seek = x => {
    if (!hasVoice() || !audio.duration) return;
    const r = wave.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * audio.duration;
    paint();
  };
  wave.addEventListener('pointerdown', e => { seek(e.clientX); wave.setPointerCapture(e.pointerId) });
  wave.addEventListener('pointermove', e => { if (wave.hasPointerCapture(e.pointerId)) seek(e.clientX) });
  wave.addEventListener('keydown', e => {
    if (!hasVoice()) return;
    if (e.key === 'ArrowRight') audio.currentTime += 5;
    else if (e.key === 'ArrowLeft') audio.currentTime -= 5;
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle() }
  });

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

  /* ── wiring ── */
  document.addEventListener('case:ready', e => {
    if (!e.detail.voice){ root.classList.add('no-voice'); $('#player').title = 'Voice-over is coming soon' }
    buildToc(e.detail.main);
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });
  document.addEventListener('case:voice', e => {
    if (e.detail){ audio.src = e.detail; root.classList.remove('no-voice'); $('#player').removeAttribute('title') }
    else root.classList.add('no-voice');
  });
})();
