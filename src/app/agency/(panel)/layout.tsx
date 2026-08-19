"use client";

// Acente paneli — koyu sidebar + açık içerik alanı (tasarım: ACENTE PANELİ).
import { AgencySidebar } from "@/components/layout";

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row">
      <AgencySidebar />
      <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-11 py-6 lg:py-9">
        {children}
      </main>
    </div>
  );
}
