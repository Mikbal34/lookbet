import type { Metadata } from "next";
import { Favoriler } from "@/components/hesap/favoriler";

export const metadata: Metadata = { title: "Favoriler — LookBeds" };

export default function FavorilerSayfasi() {
  return <Favoriler />;
}
