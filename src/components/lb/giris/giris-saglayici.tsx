"use client";

// Giriş penceresini her yerden açmak için: useGiris().ac(hedef?).
// Pencere tek; menü, otel sayfası ya da başka bir düğme aynı pencereyi açar.

import * as React from "react";
import { GirisPenceresi } from "./giris-penceresi";

const Baglam = React.createContext<{ ac: (hedef?: string) => void }>({ ac: () => {} });

export function GirisSaglayici({ children }: { children: React.ReactNode }) {
  const [acik, setAcik] = React.useState(false);
  const [hedef, setHedef] = React.useState<string | null>(null);
  const deger = React.useMemo(
    () => ({
      ac: (h?: string) => {
        setHedef(h ?? null);
        setAcik(true);
      },
    }),
    []
  );
  const kapat = React.useCallback(() => setAcik(false), []);
  return (
    <Baglam.Provider value={deger}>
      {children}
      <GirisPenceresi acik={acik} hedef={hedef} onKapat={kapat} />
    </Baglam.Provider>
  );
}

export const useGiris = () => React.useContext(Baglam);
