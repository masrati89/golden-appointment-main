/**
 * businessSlug — persist the last-visited business slug across navigations.
 *
 * When a user visits /b/:slug, we write the slug to sessionStorage.
 * Any component that needs to redirect "back to the business" (logout,
 * home button, back button) can call businessHomeUrl() to get the correct
 * path instead of always falling back to the generic landing page ("/").
 */

const SLUG_KEY = 'lastBusinessSlug';

export function saveBusinessSlug(slug: string): void {
  try {
    sessionStorage.setItem(SLUG_KEY, slug);
  } catch {
    // sessionStorage unavailable (private-mode restriction, SSR) — ignore
  }
}

export function getLastBusinessSlug(): string | null {
  try {
    return sessionStorage.getItem(SLUG_KEY);
  } catch {
    return null;
  }
}

/** Returns `/b/<slug>` if a slug is known, otherwise `/`. */
export function businessHomeUrl(): string {
  const slug = getLastBusinessSlug();
  return slug ? `/b/${slug}` : '/';
}
