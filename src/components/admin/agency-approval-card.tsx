"use client";

import { Building2, Check, X } from "lucide-react";

interface AgencyApprovalCardProps {
  agency: {
    id: string;
    companyName: string;
    taxId: string;
    phone?: string | null;
    user: { name: string; email: string };
    createdAt: string;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading?: boolean;
}

export function AgencyApprovalCard({
  agency,
  onApprove,
  onReject,
  loading,
}: AgencyApprovalCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Building2 className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">
              {agency.companyName}
            </h4>
            <p className="text-sm text-gray-500 mt-0.5">
              {agency.user.name} &middot; {agency.user.email}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>VKN: {agency.taxId}</span>
              {agency.phone && <span>Tel: {agency.phone}</span>}
              <span>
                {new Date(agency.createdAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(agency.id)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Onayla
          </button>
          <button
            onClick={() => onReject(agency.id)}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
}
