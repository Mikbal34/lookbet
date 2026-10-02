// Bu istek mobil uygulamadan mı geliyor? (Sunucu tarafı; istemcide useUygulama.)

import { cookies, headers } from "next/headers";
import { UYGULAMA_CEREZ, UYGULAMA_UA } from "./uygulama-ortak";

export async function uygulamaMi(): Promise<boolean> {
  if (((await headers()).get("user-agent") ?? "").includes(UYGULAMA_UA)) return true;
  return (await cookies()).get(UYGULAMA_CEREZ)?.value === "1";
}
