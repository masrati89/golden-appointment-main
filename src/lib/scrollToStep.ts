/**
 * Scrolls the step element into view with a top offset so content is not hidden
 * under the fixed header. Uses the main scroll container (Layout's main).
 *
 * @param element - The section/step element to scroll to
 * @param options - offsetTop: space from top of viewport (default: header + 20px)
 */
const MAIN_SCROLL_ID = 'main-scroll';
/** Header height (Layout pt-14) + breathing room in px */
const DEFAULT_OFFSET_TOP = 56 + 20; // 76px

export function scrollToStep(
  element: HTMLElement | null,
  options?: { offsetTop?: number; behavior?: ScrollBehavior }
): void {
  if (!element) return;

  const main = document.getElementById(MAIN_SCROLL_ID);
  if (!main) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const offsetTop = options?.offsetTop ?? DEFAULT_OFFSET_TOP;
  const behavior = options?.behavior ?? 'smooth';

  const mainRect = main.getBoundingClientRect();
  const elRect = element.getBoundingClientRect();
  const relativeTop = elRect.top - mainRect.top;
  const targetScrollTop = main.scrollTop + relativeTop - offsetTop;

  main.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior,
  });
}

export const STEP_SCROLL_OFFSET_TOP = DEFAULT_OFFSET_TOP;
