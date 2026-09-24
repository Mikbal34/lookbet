// Arama demosu: ilk ekranda yalnızca logo ve arama çubuğu; konum seçilince
// o bölgenin fotoğrafı ve kısa bilgileri beliriyor. Mevcut sayfalara dokunmuyor.

import type { Metadata } from "next";
import { AramaDemo } from "@/components/demo/arama-demo";

export const metadata: Metadata = {
  title: "Arama demosu — LookBeds",
  robots: { index: false },
};

export default function AramaDemoSayfasi() {
  return <AramaDemo />;
}
