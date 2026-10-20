/** Keep game navigation, never carry provider verifier/code/state into another login. */
export function authReturnUrl(href: string) {
  const current = new URL(href),
    clean = new URL(current.pathname, current.origin);
  for (const key of ["hero", "preset"]) {
    const value = current.searchParams.get(key);
    if (value) clean.searchParams.set(key, value);
  }
  return clean.href;
}
