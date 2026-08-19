"use client";

// Admin panelde tek bir acente başvurusunu gösterir.
// "Onayla" inline bir panel açar (indirim/komisyon/feedId/şifre) — onayda
// hesap oluşturulur. "Reddet" sebep alanı açar.

import * as React from "react";
import { Building2, Check, X, ChevronDown, ChevronUp, Mail, Phone, MapPin, MessageSquareText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface AgencyApplicationItem {
  id: string;
  contactName: string;
  email: string;
  phone?: string | null;
  companyName: string;
  taxId: string;
  companyPhone?: string | null;
  address?: string | null;
  message?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  reviewedBy?: { id: string; name: string } | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface ApproveOptions {
  password?: string;
  discountRate?: number;
  commission?: number;
  feedId?: string;
  notes?: string;
}

interface ApplicationReviewCardProps {
  application: AgencyApplicationItem;
  onApprove: (id: string, options: ApproveOptions) => void;
  onReject: (id: string, reason?: string) => void;
  loading?: boolean;
}

export function ApplicationReviewCard({
  application: app,
  onApprove,
  onReject,
  loading,
}: ApplicationReviewCardProps) {
  const [panel, setPanel] = React.useState<"none" | "approve" | "reject">("none");
  const [discountRate, setDiscountRate] = React.useState("0");
  const [commission, setCommission] = React.useState("0");
  const [feedId, setFeedId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [reason, setReason] = React.useState("");

  const submitApprove = () => {
    onApprove(app.id, {
      password: password.trim() || undefined,
      discountRate: Number(discountRate) || 0,
      commission: Number(commission) || 0,
      feedId: feedId.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="bg-white rounded-md border border-[rgb(26_24_20/0.08)] p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-orange-100 rounded-lg shrink-0">
            <Building2 className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900">{app.companyName}</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              {app.contactName} &middot; VKN: {app.taxId}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {app.email}
              </span>
              {app.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {app.phone}
                </span>
              )}
              {app.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {app.address}
                </span>
              )}
              <span>{new Date(app.createdAt).toLocaleDateString("tr-TR")}</span>
            </div>
            {app.message && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
                <MessageSquareText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                <p className="leading-relaxed">{app.message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setPanel(panel === "approve" ? "none" : "approve")}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
            Onayla
            {panel === "approve" ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setPanel(panel === "reject" ? "none" : "reject")}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
            Reddet
          </button>
        </div>
      </div>

      {/* Onay paneli: hesap ayarları */}
      {panel === "approve" && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50/50 p-4">
          <p className="text-sm font-medium text-gray-800 mb-3">
            Hesap oluşturulacak: <span className="text-gray-500">{app.email}</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="İndirim Oranı (%)"
              type="number"
              min={0}
              max={100}
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
            />
            <Input
              label="Komisyon (%)"
              type="number"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
            <Input
              label="Feed ID (opsiyonel)"
              placeholder="B2B feed"
              value={feedId}
              onChange={(e) => setFeedId(e.target.value)}
            />
            <Input
              label="Şifre (boşsa otomatik üretilir)"
              type="text"
              placeholder="Otomatik"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <Input
              label="Not (opsiyonel)"
              placeholder="Dahili not"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPanel("none")}>
              Vazgeç
            </Button>
            <Button size="sm" loading={loading} onClick={submitApprove}>
              <Check className="h-4 w-4" />
              Onayla ve Hesap Oluştur
            </Button>
          </div>
        </div>
      )}

      {/* Red paneli */}
      {panel === "reject" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
          <Input
            label="Red sebebi (opsiyonel)"
            placeholder="Örn: Vergi numarası doğrulanamadı"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPanel("none")}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={loading}
              onClick={() => onReject(app.id, reason.trim() || undefined)}
            >
              <X className="h-4 w-4" />
              Başvuruyu Reddet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
