import { Suspense } from "react";
import type { Metadata } from "next";
import { YardimAna } from "@/components/yardim/yardim-ana";

export const metadata: Metadata = {
  title: "Yardım Merkezi — LookBeds",
  description: "Giriş, rezervasyon, iptal ve acente paneliyle ilgili sık sorulan sorular",
};

export default function YardimSayfasi() {
  return (
    <Suspense>
      <YardimAna />
    </Suspense>
  );
}
