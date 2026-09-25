import type { Metadata } from "next";
import { KisiselBilgiler } from "@/components/hesap/kisisel";

export const metadata: Metadata = { title: "Kişisel bilgiler — LookBeds" };

export default function KisiselSayfasi() {
  return <KisiselBilgiler />;
}
