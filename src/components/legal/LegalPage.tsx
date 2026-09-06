import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-panel-grey dark:bg-navy-deeper">
      <header className="border-b border-black/5 bg-white dark:border-white/10 dark:bg-navy-deeper">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-display text-lg font-semibold text-navy-deeper dark:text-white">
              AccessAI2
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-grey hover:text-navy-deeper dark:text-white/60 dark:hover:text-white"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-navy-deeper dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-grey dark:text-white/50">Last updated {updated}</p>
        <div className="legal-body mt-8 space-y-6 text-[15px] leading-relaxed text-navy-deeper/90 dark:text-white/70">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-navy-deeper dark:text-white">
        {heading}
      </h2>
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
