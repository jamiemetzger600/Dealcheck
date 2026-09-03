export const LISTING_EXIT_MS = 280;

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function listingDomId(deal) {
  if (deal?.id == null || deal.id === '') return '';
  return String(deal.id);
}

function findListingEl(deal) {
  const id = listingDomId(deal);
  if (!id || typeof document === 'undefined') return null;
  const node = document.querySelector(`[data-deal-id="${CSS.escape(id)}"]`);
  if (!node) return null;
  return node.closest('tr, li') || node;
}

function collapseTableRow(el, duration) {
  const cells = Array.from(el.cells || el.querySelectorAll('td'));
  el.classList.add('listing-exiting');
  el.style.pointerEvents = 'none';
  for (const cell of cells) {
    cell.style.overflow = 'hidden';
    cell.style.transition = `padding ${duration}ms ease, opacity ${Math.round(duration * 0.65)}ms ease, border-width ${duration}ms ease`;
  }
  el.style.transition = `opacity ${Math.round(duration * 0.65)}ms ease`;
  void el.offsetHeight;
  requestAnimationFrame(() => {
    for (const cell of cells) {
      cell.style.opacity = '0';
      cell.style.paddingTop = '0';
      cell.style.paddingBottom = '0';
      cell.style.borderBottomWidth = '0';
    }
    el.style.opacity = '0';
  });
}

function collapseBlockEl(el, duration) {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  el.classList.add('listing-exiting');
  el.style.pointerEvents = 'none';
  el.style.overflow = 'hidden';
  el.style.boxSizing = 'border-box';
  el.style.maxHeight = `${Math.max(rect.height, 1)}px`;
  el.style.marginTop = cs.marginTop;
  el.style.marginBottom = cs.marginBottom;
  void el.offsetHeight;
  el.style.transition = [
    `max-height ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    `opacity ${Math.round(duration * 0.7)}ms ease`,
    `margin ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    `padding ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`
  ].join(', ');
  el.style.maxHeight = '0px';
  el.style.opacity = '0';
  el.style.marginTop = '0px';
  el.style.marginBottom = '0px';
  el.style.paddingTop = '0px';
  el.style.paddingBottom = '0px';
  el.style.transform = 'translateY(-6px)';
}

/**
 * Collapse a listing row/card in place so the rest of the list eases up,
 * then resolve so the caller can remove it from state.
 */
export function collapseListingEl(deal, duration = LISTING_EXIT_MS) {
  if (prefersReducedMotion()) return Promise.resolve();
  const el = findListingEl(deal);
  if (!el) return Promise.resolve();
  console.log('[listingExit] collapse', listingDomId(deal), el.tagName);
  if (el.tagName === 'TR') {
    collapseTableRow(el, duration);
  } else {
    collapseBlockEl(el, duration);
  }
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration + 30);
  });
}
