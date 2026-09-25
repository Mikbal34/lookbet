// LookBeds Partner (acente paneli): üst çubuk + sayfa. Panel yalnız onaylı
// acenteye açılır; onaysızsa her panel adresinde başvuru formu ya da
// başvurunun durumu görünür. Durum her istekte veritabanından okunur, admin
// onaylayınca yeniden giriş gerekmez.
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth-options";
import { acenteDurumu } from "@/lib/acente-durumu";
import { PartnerCubugu } from "@/components/partner/partner-cubugu";
import { AcenteBasvuru } from "@/components/partner/basvuru";
import s from "@/components/partner/partner.module.css";

export const dynamic = "force-dynamic";

export default async function PartnerDuzeni({ children }: { children: React.ReactNode }) {
  const oturum = await getServerSession(authOptions);
  // Middleware de denetliyor; burada yine de oturumsuz kalmasın.
  if (!oturum?.user?.email || oturum.user.role !== "AGENCY") redirect("/agency/login");

  const durum = await acenteDurumu(oturum.user.id, oturum.user.email);
  const onayli = durum.tur === "onayli";

  return (
    <div className={`lb ${s.sayfa}`}>
      <PartnerCubugu kilitli={!onayli} />
      <main>{durum.tur === "onayli" ? children : <AcenteBasvuru durum={durum} />}</main>
    </div>
  );
}
