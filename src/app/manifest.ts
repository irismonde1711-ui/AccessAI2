import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AccessAI2",
    short_name: "AccessAI2",
    description:
      "A professional assistant for governance, HR, finance, tax and ESG compliance work.",
    start_url: "/",
    display: "standalone",
    background_color: "#00124A",
    theme_color: "#00124A",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
