import type { Metadata } from "next";
import { Sora, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { RecoveryRedirect } from "@/components/auth/RecoveryRedirect";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.accessai2.com"),
  title: {
    default: "AccessAI2 — compliance, drafting and document review",
    template: "%s — AccessAI2",
  },
  description:
    "An AI assistant for governance, risk, HR, finance, tax and ESG work: ask a question, review a document, and draft the email that follows.",
  applicationName: "AccessAI2",
  // Ads and shared links show this card rather than a bare URL.
  openGraph: {
    type: "website",
    siteName: "AccessAI2",
    url: "https://www.accessai2.com",
    title: "AccessAI2 — compliance, drafting and document review",
    description:
      "Ask a compliance question, review a document, draft the email that follows. Ten messages free, no card required.",
  },
  twitter: {
    card: "summary",
    title: "AccessAI2 — compliance, drafting and document review",
    description:
      "Ask a compliance question, review a document, draft the email that follows. Ten messages free, no card required.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${dmSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-panel-grey text-foreground font-sans">
        <RecoveryRedirect />
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
