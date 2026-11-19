import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para todo el sitio (incluido el Studio en /studio).
 *
 * La política de contenido (CSP) sólo deja cargar recursos del propio sitio y
 * de Sanity: si alguien lograra inyectar un script o un iframe apuntando a
 * otro servidor, el navegador lo bloquea. Nadie puede meter el sitio dentro de
 * un iframe ajeno (evita que lo disfracen para robar clics o contraseñas).
 *
 * 'unsafe-inline' en scripts y estilos lo exigen Next.js y el Studio de
 * Sanity; 'unsafe-eval' sólo en desarrollo (recarga en caliente).
 * HSTS va sin includeSubDomains: el correo de la empresa vive en subdominios
 * del hosting anterior y no debe verse afectado.
 */
const dev = process.env.NODE_ENV === "development";
/** El Studio además carga sus scripts, fuentes y avisos de versión desde los servidores de Sanity. */
const politica = (studio: boolean) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${studio ? " https://*.sanity-cdn.com" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `font-src 'self' data:${studio ? " https://*.sanity.io" : ""}`,
    "media-src 'self' blob:",
    `connect-src 'self' https://*.sanity.io wss://*.sanity.io https://*.api.sanity.io wss://*.api.sanity.io${studio ? " https://sanity-cdn.com https://*.sanity-cdn.com" : ""}`,
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

const seguridad = [
  { key: "Content-Security-Policy", value: politica(false) },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

/** Páginas generales de la web anterior (www.metalandes.com/archivos/…) → página nueva. */
const PAGINAS_VIEJAS: Record<string, string> = {
  MAIN: "/",
  MAIN2: "/",
  MAIN2025: "/",
  MAINFISE: "/",
  TOP: "/",
  LEFT1: "/",
  CONTzz: "/",
  EMPR: "/empresa",
  Company: "/empresa",
  "1SUB": "/productos",
  MAN: "/servicios/mantenimiento",
  "2MAN": "/servicios/mantenimiento",
  "2MAN1": "/servicios/mantenimiento",
  "3AUT": "/servicios",
  CONT: "/contacto",
  SIG1: "/empresa/gestion-integral",
  SIG2: "/empresa/gestion-integral",
  SIG3: "/empresa/certificaciones",
  SIG3G: "/empresa/certificaciones",
  SIG3R: "/empresa/certificaciones",
  SIG4: "/empresa/tratamiento-datos",
};

/**
 * Los códigos QR impresos en los tableros entregados desde 2020 apuntan a
 * www.metalandes.com/archivos/qr/… y /archivos/pc/…; esas direcciones no
 * pueden cambiar. Los archivos siguen en el hosting anterior (Bluehost,
 * public_html/archivos), así que el sitio los trae de allá sin cambiar la
 * dirección: el QR no nota la diferencia y la empresa los sigue subiendo
 * como siempre.
 *
 * Sólo se reenvían esas dos carpetas, no /archivos completo: ahí también
 * hay certificados originales y hojas internas que no deben publicarse.
 * metalandes.net debe seguir en Bluehost mientras esto apunte a él.
 */
const ORIGEN_ARCHIVOS = "https://metalandes.net";
const CARPETAS_QR = ["qr", "pc"];

const nextConfig: NextConfig = {
  // No anunciar con qué está hecho el sitio (pista gratis para un atacante).
  poweredByHeader: false,
  async rewrites() {
    return {
      // Antes que cualquier página del sitio (incluida la de «no encontrada»).
      beforeFiles: CARPETAS_QR.map((c) => ({
        source: `/archivos/${c}/:ruta*`,
        destination: `${ORIGEN_ARCHIVOS}/archivos/${c}/:ruta*`,
      })),
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: "/:path*", headers: seguridad },
      // Va después: para /studio reemplaza la política general por la del Studio.
      { source: "/studio/:path*", headers: [{ key: "Content-Security-Policy", value: politica(true) }] },
    ];
  },
  images: {
    // AVIF primero (más liviano), luego WebP.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    // 75 por defecto; 85 para la portada del hero, que va a pantalla completa.
    qualities: [75, 85],
    // Fotos subidas desde el Studio: viven en la CDN de Sanity.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  async redirects() {
    return [
      // La sección se llama PQRS: quien escriba /pqrs llega a la página.
      { source: "/pqrs", destination: "/pqr", permanent: true },
      // Páginas de la web anterior que Google todavía muestra: cada una lleva a su equivalente.
      ...Object.entries(PAGINAS_VIEJAS).map(([vieja, nueva]) => ({
        source: `/archivos/${vieja}.html`,
        destination: nueva,
        permanent: true,
      })),
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/index.htm", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
