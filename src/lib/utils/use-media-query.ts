"use client";

import * as React from "react";

/**
 * SSR-güvenli medya sorgusu. İlk render'da her zaman `false` döner
 * (sunucuda `window` yok), mount sonrası gerçek değere geçer.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Tailwind `lg` kırılımının altı. Bu projede 1024px, "uygulama düzeni"
 * (yığılmış form, alt sayfa panelleri) ile masaüstü düzenini ayıran tek
 * sınır — filtre kenar çubuğu da aynı noktada beliriyor.
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
