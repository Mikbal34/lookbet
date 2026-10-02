/**
 * callbackUrl'i site içi bir adrese çevirir ("/reservations?x=1"). NextAuth
 * tam adres gönderiyor (http://alan/…); başka bir alana giden ya da bozuk
 * adres kabul edilmez (açık yönlendirme olmasın).
 */
export function guvenliHedef(ham: string | null | undefined): string | null {
  if (!ham) return null;
  if (ham.startsWith("/") && !ham.startsWith("//")) return ham;
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(ham);
    return u.origin === window.location.origin ? `${u.pathname}${u.search}${u.hash}` : null;
  } catch {
    return null;
  }
}
