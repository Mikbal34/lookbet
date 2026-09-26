// LookBeds Yönetim: üst çubuk + sayfa. Yetki middleware'de (yalnız ADMIN).
import type { Metadata } from "next";
import { YonetimCubugu } from "@/components/yonetim/yonetim-cubugu";
import { BildiriSaglayici } from "@/components/yonetim/ortak";
import s from "@/components/yonetim/yonetim.module.css";

export const metadata: Metadata = { title: "LookBeds Yönetim", robots: { index: false } };

export default function YonetimDuzeni({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lb ${s.sayfa}`}>
      <BildiriSaglayici>
        <YonetimCubugu />
        <main>{children}</main>
      </BildiriSaglayici>
    </div>
  );
}
