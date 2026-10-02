import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Çeviri: dil çerezden (i18n/request.ts), metinler messages/<dil>/*.json.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Docker (Hetzner/VPS) dağıtımı için standalone çıktı gerekir; Vercel gibi
// yönetilen platformlarda ise standalone kullanılmaz. DOCKER_BUILD=1 ile açılır.
const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
