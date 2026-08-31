"use client";

// Acente paneli — koyu sidebar + açık içerik alanı (tasarım: ACENTE PANELİ).
import { AgencySidebar } from "@/components/layout";

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:flex-row lg:items-start">
      <AgencySidebar />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-6 lg:px-11 lg:py-9">
        {children}
      </main>
    </div>
  );
}
