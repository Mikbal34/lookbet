"use client";

// Uygulama kimlik çubuğu — iki kılıkta çalışır:
//
//  • Ana sayfa: solda logo, sağda karşılama hapı. Hesabın kapısı o hap; alt
//    sekme çubuğunda "Hesabım" sekmesi yok (bkz. app-tab-bar.tsx).
//
//  • Diğer sekme sayfaları (kampanyalar, rezervasyonlar, daha fazla):
//    yalnızca ortalanmış ekran başlığı. Logo her sekmede tekrar edince yer
//    kaplıyor ve hiçbir şey söylemiyor; kimlik çubuğu kişisel ekranın
//    çubuğu. Kaydırınca gövdedeki başlık kaçtığında da çubuk nerede
//    olduğunu söylemeye devam ediyor.
//
//  • Derin sayfalar (otel, odalar, rezervasyon detayı, ödeme): solda geri
//    oku, yanında ekran başlığı. Sayfa içi "Sonuçlara Dön" gibi metin
//    bağlantıları buraya taşındı — uygulamalarda geri hep aynı yerde durur.
//
// `saydam` verilen sayfalarda (ana sayfa — arkasında kampanya karuseli var)
// çubuk yalnızca yukarıdan aşağı hafifleyen bir karartma taşır. Kullanıcı
// karuseli geçtiğinde altına beyaz içerik geldiği için kaydırma eşiği
// aşılınca dolu turuncuya döner. Fotoğrafsız sayfalarda saydam bırakılırsa
// beyaz logo ve metin kaybolur; oralarda baştan dolu turuncu kalır.
//
// Yalnızca b2c uygulamasında görünür; web'de yerini normal Navbar alıyor.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ChevronRight, CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";

/** Karuselin altına inildiği kabul edilen kaydırma miktarı (px). */
const ESIK = 150;

export interface AppHeaderProps {
  saydam?: boolean;
  /**
   * Geri oku göster. String verilirse o adrese gider, `true` verilirse
   * tarayıcı geçmişinde bir adım geri alır (nereden gelindiği belli
   * olmayan sayfalarda).
   */
  geri?: string | true;
  /** Geri oku yanındaki ekran başlığı. */
  baslik?: string;
}

export function AppHeader({ saydam = false, geri, baslik }: AppHeaderProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [kaydi, setKaydi] = React.useState(false);

  React.useEffect(() => {
    const izle = () => setKaydi(window.scrollY > ESIK);
    window.addEventListener("scroll", izle, { passive: true });
    return () => window.removeEventListener("scroll", izle);
  }, []);

  const ad = session?.user?.name;
  const derin = geri !== undefined;
  // Geri oku yok ama başlık verilmişse: ortalanmış başlık çubuğu.
  const ortaBaslik = !derin && !!baslik;

  const geriIkonu = (
    <ArrowLeft className="size-5" aria-hidden="true" />
  );
  const geriSinifi =
    "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-white active:bg-white/20";

  return (
    <header
      className={cn(
        "b2c-only sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-200",
        saydam && !kaydi
          ? "bg-gradient-to-b from-ink/35 to-transparent"
          : "bg-navy/85 backdrop-blur-md"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2",
          ortaBaslik && "justify-center"
        )}
      >
        {ortaBaslik ? (
          <h1 className="min-w-0 truncate py-2.5 text-[17px] font-extrabold text-white">
            {baslik}
          </h1>
        ) : derin ? (
          <>
            {typeof geri === "string" ? (
              <Link href={geri} aria-label="Geri" className={geriSinifi}>
                {geriIkonu}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Geri"
                className={geriSinifi}
              >
                {geriIkonu}
              </button>
            )}
            {baslik && (
              <h1 className="min-w-0 truncate text-[16px] font-bold text-white">
                {baslik}
              </h1>
            )}
          </>
        ) : (
          <>
            {/* Logo kendi bağlantısını üretiyor; <Link> ile sarmak iç içe
                anchor olurdu. */}
            <Logo href="/" variant="light" size="sm" />

            <Link
              href="/profile"
              className="ml-auto flex min-h-11 min-w-0 items-center gap-1.5 rounded-full bg-ink/35 py-1.5 pr-1.5 pl-2.5 text-white backdrop-blur-sm active:bg-ink/50"
            >
              <CircleUserRound
                className="size-[18px] shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-[12.5px] font-semibold">
                {status === "authenticated" && ad ? ad : "Giriş yap"}
              </span>
              <ChevronRight
                className="size-3.5 shrink-0 opacity-70"
                aria-hidden="true"
              />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
