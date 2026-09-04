"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { AuthModal } from "@/components/auth/AuthModal";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { PricingDetailSection } from "@/components/pricing/PricingDetailSection";
import { PayPalSubscribeButton } from "@/components/pricing/PayPalSubscribeButton";
import { GlowHero } from "@/components/ui/Glow";

type ModalState = "login" | "signup" | "forgot" | null;

export function PricingPageClient({
  isLoggedIn,
  fullName,
}: {
  isLoggedIn: boolean;
  fullName: string | null;
}) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="min-h-screen bg-panel-grey">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4 dark:border-white/10 dark:bg-navy-deeper">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-display text-lg font-semibold text-navy-deeper dark:text-white">AccessAI2</span>
        </Link>
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            {fullName && (
              <span className="hidden text-sm text-muted-grey dark:text-white/50 sm:inline">{fullName}</span>
            )}
            <Link
              href="/"
              className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Open workspace
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal("login")}
              className="rounded-full px-4 py-2 text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5 dark:text-white dark:hover:bg-white/10"
            >
              Log in
            </button>
            <button
              onClick={() => setModal("signup")}
              className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Sign up for free
            </button>
          </div>
        )}
      </header>

      <section className="sidebar-gradient relative overflow-hidden px-6 py-16 text-center">
        <GlowHero />
        <span className="relative rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
          Pricing
        </span>
        <h1 className="font-display relative mx-auto mt-6 max-w-2xl text-4xl font-semibold text-white">
          Compliance capacity, priced per organisation
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-white/60">
          Start free. Upgrade when your team needs unlimited drafting, sending and document
          review. All plans include Australian data residency.
        </p>
      </section>

      <section className="mx-auto -mt-10 grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        <PlanCard
          name="Guest"
          tagline="Try the assistant with no account."
          price="$0"
          priceNote="10 messages · 1 send · 3 uploads per 4 hours"
          features={["Full chat interface", "Document upload (3 per window)", "No conversation history"]}
          cta={
            <Link
              href="/"
              className="block w-full rounded-full border border-navy-deeper/20 py-3 text-center text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Continue as guest
            </Link>
          }
        />
        <PlanCard
          name="Free account"
          tagline="Save your work and organise it."
          price="$0"
          priceNote="Same allowance, plus saved history"
          features={["Projects, pinned chats and drafts", "Saved conversation history", "Email send with review tagging"]}
          cta={
            isLoggedIn ? (
              <span className="block w-full rounded-full border border-navy-deeper/20 py-3 text-center text-sm font-medium text-muted-grey dark:border-white/20 dark:text-white/50">
                Current plan
              </span>
            ) : (
              <button
                onClick={() => setModal("signup")}
                className="w-full rounded-full border border-navy-deeper/20 py-3 text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              >
                Create account
              </button>
            )
          }
        />
        <PlanCard
          name="Pro"
          tagline="Unlimited use for one practitioner."
          price="$29"
          priceUnit="/month"
          priceNote="One-time payment via PayPal · unlocks 30 days, renew anytime"
          featured
          features={["Unlimited messages and sends", "Unlimited document analysis", "Priority model access", "Compliance-tagged send log"]}
          cta={
            isLoggedIn ? (
              <PayPalSubscribeButton containerId="paypal-pricing-page" />
            ) : (
              <button
                onClick={() => setModal("signup")}
                className="w-full rounded-full bg-teal py-3 text-sm font-semibold text-white hover:brightness-110"
              >
                Sign up to subscribe
              </button>
            )
          }
        />
        <PlanCard
          name="Team"
          tagline="For advisory and finance teams."
          price="From $129"
          priceUnit="/month"
          priceNote="Up to 10 seats, invoiced annually"
          features={["Everything in Pro", "Shared projects and drafts", "Central send audit trail", "Australian data residency guarantee"]}
          cta={
            <a
              href="mailto:sales@accessai2.example"
              className="block w-full rounded-full border border-navy-deeper/20 py-3 text-center text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Talk to us
            </a>
          }
        />
      </section>

      <div className="pb-10 text-center">
        <a
          href="#pricing-detail"
          className="inline-block rounded-full border border-navy-deeper/20 px-5 py-2.5 text-sm font-medium text-navy-deeper hover:bg-navy-deeper/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          View Detailed Pricing Breakdown
        </a>
      </div>

      <PricingDetailSection />

      <section className="sidebar-gradient relative overflow-hidden px-6 py-16 text-center">
        <GlowHero />
        <h2 className="font-display relative text-2xl font-semibold text-white">
          Try it on your next lodgement
        </h2>
        <p className="relative mt-2 text-white/60">
          Ten messages free, no card required. Upgrade in one tap when you&apos;re ready.
        </p>
        <div className="relative mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            Open the workspace
          </Link>
          {!isLoggedIn && (
            <button
              onClick={() => setModal("signup")}
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
            >
              Create an account
            </button>
          )}
        </div>
      </section>

      {(modal === "login" || modal === "signup") && (
        <AuthModal
          initialMode={modal}
          onClose={() => setModal(null)}
          onForgotPassword={() => setModal("forgot")}
          onSuccess={() => setModal(null)}
        />
      )}
      {modal === "forgot" && <ForgotPasswordModal onClose={() => setModal(null)} />}
    </div>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  priceUnit,
  priceNote,
  features,
  cta,
  featured,
}: {
  name: string;
  tagline: string;
  price: string;
  priceUnit?: string;
  priceNote: string;
  features: string[];
  cta: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl border bg-white p-6 dark:bg-navy-dark ${
        featured ? "border-teal shadow-lg" : "border-black/10 dark:border-white/10"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-teal px-3 py-1 text-xs font-semibold text-white">
          Most Popular
        </span>
      )}
      <p className="font-display text-lg font-semibold text-navy-deeper dark:text-white">{name}</p>
      <p className="mt-1 text-sm text-muted-grey dark:text-white/50">{tagline}</p>
      <p className="mt-4">
        <span className="font-display text-3xl font-semibold text-navy-deeper dark:text-white">{price}</span>
        {priceUnit && <span className="text-sm text-muted-grey dark:text-white/50">{priceUnit}</span>}
      </p>
      <p className="mt-1 text-xs text-muted-grey dark:text-white/50">{priceNote}</p>
      <div className="mt-5">{cta}</div>
      <ul className="mt-6 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-navy-deeper dark:text-white/80">
            <span className="text-teal">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
