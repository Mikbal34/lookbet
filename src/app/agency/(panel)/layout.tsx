// LookBeds Partner (acente paneli): üst çubuk + sayfa.
import { PartnerCubugu } from "@/components/partner/partner-cubugu";
import s from "@/components/partner/partner.module.css";

export default function PartnerDuzeni({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lb ${s.sayfa}`}>
      <PartnerCubugu />
      <main>{children}</main>
    </div>
  );
}
