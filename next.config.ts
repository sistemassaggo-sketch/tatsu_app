import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfmake usa pdfkit por debajo, que carga sus métricas de fuentes estándar (archivos .afm) leyendo
  // el disco en tiempo de ejecución con rutas relativas a su propio módulo. El empaquetador de Next.js
  // reescribe esas rutas y el archivo deja de encontrarse; sacar el paquete del empaquetado (para que
  // se cargue con el require nativo de Node) evita el problema.
  serverExternalPackages: ["pdfmake", "pdfkit"],
  images: {
    unoptimized: true,
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
