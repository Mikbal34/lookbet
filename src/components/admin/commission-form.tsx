"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { commissionSchema, type CommissionInput } from "@/lib/validators";

interface CommissionFormProps {
  defaultValues?: Partial<CommissionInput>;
  agencies: { id: string; companyName: string }[];
  onSubmit: (data: CommissionInput) => void;
  loading?: boolean;
}

export function CommissionForm({
  defaultValues,
  agencies,
  onSubmit,
  loading,
}: CommissionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommissionInput>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      type: "PERCENTAGE",
      isActive: true,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Acente
        </label>
        <select
          {...register("agencyId")}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seçin</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.companyName}
            </option>
          ))}
        </select>
        {errors.agencyId && (
          <p className="text-red-500 text-xs mt-1">
            {errors.agencyId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Komisyon Tipi
          </label>
          <select
            {...register("type")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PERCENTAGE">Yüzde (%)</option>
            <option value="FIXED">Sabit Tutar</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Değer
          </label>
          <input
            {...register("value", { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.value && (
            <p className="text-red-500 text-xs mt-1">{errors.value.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Otel Kodu (opsiyonel)
          </label>
          <input
            {...register("hotelCode")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Boş = tüm oteller"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Board Type (opsiyonel)
          </label>
          <input
            {...register("boardType")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Boş = tüm tipler"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Başlangıç
          </label>
          <input
            {...register("startDate")}
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bitiş
          </label>
          <input
            {...register("endDate")}
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            {...register("isActive")}
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Aktif</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
