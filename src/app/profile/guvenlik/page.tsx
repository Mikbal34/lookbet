import type { Metadata } from "next";
import { Guvenlik } from "@/components/hesap/guvenlik";

export const metadata: Metadata = { title: "Giriş ve güvenlik — LookBeds" };

export default function GuvenlikSayfasi() {
  return <Guvenlik />;
}
