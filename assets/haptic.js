/* Touch screens: a light haptic tick on every tap on a button or link.
   Android has navigator.vibrate. iOS has no API, but since iOS 18 clicking the label of an <input switch> gives the
   system tick — the switch has to be fresh, in the document and clicked inside the tap (same trick as ios-haptics). */
(() => {
  if (!matchMedia('(pointer: coarse)').matches) return;
  let busy = false;   // the switch's own synthetic click comes back through the listener below
  const tick = () => {
    if (typeof navigator.vibrate === 'function' && navigator.vibrate(10)) return;
    const label = document.createElement('label'), input = document.createElement('input');
    label.setAttribute('aria-hidden', 'true'); label.style.display = 'none';
    input.type = 'checkbox'; input.setAttribute('switch', '');
    label.append(input); document.head.append(label);
    busy = true; label.click(); busy = false;
    label.remove();
  };
  document.addEventListener('click', e => {
    if (!busy && e.target.closest('a, button, label, summary, [role="button"], [data-snd]')) tick();
  }, true);
})();
