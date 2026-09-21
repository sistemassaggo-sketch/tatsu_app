import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Imágenes de productos alojadas en Cloudinary (solo la cuenta de la app).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/rfbetmqy/**",
      },
    ],
  },
};

export default nextConfig;
