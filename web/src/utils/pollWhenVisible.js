/** Run `fn` on an interval only while the document is visible. */
export function pollWhenVisible(fn, intervalMs) {
  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    fn();
  };
  const onVisibility = () => {
    if (!document.hidden) {
      console.log('[pollWhenVisible] tab visible — tick');
      fn();
    }
  };
  const id = window.setInterval(tick, intervalMs);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
