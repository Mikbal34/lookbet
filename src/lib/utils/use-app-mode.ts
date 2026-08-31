"use client";

import * as React from "react";
import type { AppMode } from "./app-mode";

// useSyncExternalStore: sunucuda daima "web", istemcide DOM'daki işareti okur.
// Bu sayede hydration uyuşmazlığı ve "effect içinde setState" uyarısı olmaz.
const subscribe = () => () => {};

const getSnapshot = (): AppMode => {
  const d = document.documentElement.getAttribute("data-app");
  return d === "b2c" || d === "partner" ? d : "web";
};

const getServerSnapshot = (): AppMode => "web";

/**
 * Sayfa nerede açıldı: "web" | "b2c" | "partner"?
 *
 * Yalnızca DAVRANIŞ farkları için kullan (ör. bir akışı atlamak, bir linki
 * farklı açmak). Bir şeyi göstermek/gizlemek için `web-only` / `app-only` /
 * `b2c-only` / `partner-only` sınıflarını tercih et — onlar ilk boyamada
 * doğru sonucu verir, bu hook ise hydration sonrası.
 */
export function useAppMode(): AppMode {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Herhangi bir WebView uygulamasının içinde miyiz? */
export function useIsApp(): boolean {
  return useAppMode() !== "web";
}
