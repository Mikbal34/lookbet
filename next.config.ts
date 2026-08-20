import type { NextConfig } from "next";

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

export default nextConfig;
