import type { Metadata } from "next";
import { Hesap } from "@/components/hesap/hesap";

export const metadata: Metadata = { title: "Hesap — LookBeds" };

export default function HesapSayfasi() {
  return <Hesap />;
}
