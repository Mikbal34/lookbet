import { Hotel, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Hotel className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Lookbet</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              10.000+ otel arasından en uygun fiyatlarla rezervasyon yapın.
              Güvenli, hızlı, kolay.
            </p>
            {/* Trust badges */}
            <div className="flex gap-2 mt-4">
              <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700">
                SSL Güvenli
              </span>
              <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700">
                7/24 Destek
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Hızlı Linkler
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm hover:text-white transition-colors">
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm hover:text-white transition-colors">
                  Otel Ara
                </Link>
              </li>
              <li>
                <Link href="/reservations" className="text-sm hover:text-white transition-colors">
                  Rezervasyonlarım
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-sm hover:text-white transition-colors">
                  Profilim
                </Link>
              </li>
            </ul>
          </div>

          {/* Agencies */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Acenteler
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/register/agency"
                  className="text-sm hover:text-white transition-colors"
                >
                  Acente Kaydı
                </Link>
              </li>
              <li>
                <Link
                  href="/agency/dashboard"
                  className="text-sm hover:text-white transition-colors"
                >
                  Acente Paneli
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              İletişim
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                <span>info@lookbet.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                <span>+90 (212) 000 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                <span>İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Lookbet. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white transition-colors">Gizlilik Politikası</Link>
            <Link href="#" className="hover:text-white transition-colors">Kullanım Koşulları</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
