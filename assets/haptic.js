/* Touch screens: a light haptic tick on every tap on a button or link.
   Android has navigator.vibrate; iOS (18+) has no API, but toggling a hidden <input switch> gives the system tick. */
(() => {
  if (!matchMedia('(pointer: coarse)').matches) return;
  let tick, own = null;   // own: the hidden switch, so its synthetic clicks don't tick again
  if (navigator.vibrate) tick = () => navigator.vibrate(10);
  else {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'checkbox'; input.setAttribute('switch', ''); input.tabIndex = -1;
    label.setAttribute('aria-hidden', 'true'); label.style.display = 'none';
    label.append(input); document.documentElement.append(label); own = label;
    tick = () => label.click();
  }
  document.addEventListener('click', e => {
    if (own && own.contains(e.target)) return;
    if (e.target.closest('a, button, label, summary, [role="button"], [data-snd]')) tick();
  }, true);
})();
