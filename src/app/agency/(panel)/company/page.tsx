"use client";

// Şirket Bilgilerim — acentenin kayıtlı şirket ve anlaşma bilgileri (salt okunur).
// Değişiklik talepleri admin üzerinden yürütülür.

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileDigit,
  MapPin,
  Phone,
  BadgePercent,
  Percent,
  CalendarDays,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface DashboardData {
  agency: {
    companyName: string;
    taxId: string;
    address: string | null;
    phone: string | null;
    discountRate: number;
    commission: number;
    isApproved: boolean;
    createdAt: string;
  };
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <dt className="flex items-center gap-2.5 text-sm text-gray-500">
        <Icon className="h-4 w-4 text-gray-400" aria-hidden />
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
    </div>
  );
}

export default function AgencyCompanyPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["agency-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/agency/dashboard");
      if (!res.ok) throw new Error("Bilgiler yüklenemedi");
      return res.json();
    },
  });

  const agency = data?.agency;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-[28px] font-normal text-ink">Şirket Bilgilerim</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lookbet sisteminde kayıtlı şirket ve anlaşma bilgileriniz
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-white rounded-md border border-[rgb(26_24_20/0.08)]" />
          ))}
        </div>
      ) : agency ? (
        <>
          {/* Şirket */}
          <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Building2 className="h-4 w-4 text-navy" aria-hidden />
                Şirket
              </h2>
              {agency.isApproved ? (
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3 mr-1" aria-hidden />
                  Onaylı Acente
                </Badge>
              ) : (
                <Badge variant="warning">Onay Bekliyor</Badge>
              )}
            </div>
            <dl>
              <InfoRow icon={Building2} label="Şirket Adı" value={agency.companyName} />
              <InfoRow icon={FileDigit} label="Vergi Numarası" value={agency.taxId} />
              <InfoRow icon={MapPin} label="Adres" value={agency.address ?? "-"} />
              <InfoRow icon={Phone} label="Telefon" value={agency.phone ?? "-"} />
              <InfoRow
                icon={CalendarDays}
                label="Üyelik Tarihi"
                value={formatDate(agency.createdAt)}
              />
            </dl>
          </div>

          {/* Anlaşma */}
          <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
              <BadgePercent className="h-4 w-4 text-navy" aria-hidden />
              Anlaşma Koşulları
            </h2>
            <dl>
              <InfoRow
                icon={BadgePercent}
                label="B2B İndirim Oranı"
                value={`%${agency.discountRate}`}
              />
              <InfoRow
                icon={Percent}
                label="Komisyon Oranı"
                value={`%${agency.commission}`}
              />
            </dl>
          </div>

          {/* Bilgi notu */}
          <div className="flex gap-3 rounded-lg border border-line bg-chip-blue p-4">
            <Info className="h-5 w-5 shrink-0 text-navy mt-0.5" aria-hidden />
            <p className="text-sm text-navy-dark leading-relaxed">
              Şirket bilgilerinizde veya anlaşma koşullarınızda değişiklik için{" "}
              <a
                href="mailto:info@lookbet.com"
                className="font-semibold underline hover:no-underline"
              >
                info@lookbet.com
              </a>{" "}
              adresinden bizimle iletişime geçebilirsiniz.
            </p>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-10 text-center text-sm text-gray-500">
          Şirket bilgileri yüklenemedi
        </div>
      )}
    </div>
  );
}
