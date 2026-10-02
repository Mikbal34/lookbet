"use client";

// Arama sonuçları — yeni tasarım (components/arama-sonuclari).
// Yeni bir arama (URL değişimi) sayfayı sıfırdan kurar: filtreler ve sayfa başa döner.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AramaSonuclari } from "@/components/arama-sonuclari/arama-sonuclari";

function Icerik() {
  const params = useSearchParams();
  return <AramaSonuclari key={params.toString()} params={new URLSearchParams(params.toString())} />;
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={null}>
      <Icerik />
    </React.Suspense>
  );
}
