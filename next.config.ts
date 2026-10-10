import type { NextConfig } from "next";

// Sent on every response. Nothing here changes how the app behaves; they close
// off the attacks that cost nothing to try once a site is being advertised —
// clickjacking a login form in a hidden frame, a browser guessing that an
// uploaded .txt is really a script, and the full URL of a page leaking to
// third-party sites through the referer header.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone stays open for voice input, and payment has to include
  // PayPal's own frame or the checkout button cannot run.
  {
    key: "Permissions-Policy",
    value: 'camera=(), geolocation=(), payment=(self "https://www.paypal.com")',
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
