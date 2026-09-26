"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { bicimleyici } from "./bicim";
import { dilMi, VARSAYILAN_DIL } from "./diller";

/** Geçerli dilde tarih/para/sayı biçimi (i18n/bicim). */
export function useBicim() {
  const l = useLocale();
  const dil = dilMi(l) ? l : VARSAYILAN_DIL;
  return React.useMemo(() => bicimleyici(dil), [dil]);
}
