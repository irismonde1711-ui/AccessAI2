"use client";

import { useState } from "react";

const ROWS: [string, string, string, string, string][] = [
  ["AI messages", "10 / 4hrs", "10 / 4hrs", "Unlimited", "Unlimited"],
  ["Email sends", "—", "1 / 4hrs", "Unlimited", "Unlimited"],
  ["Document uploads", "—", "5 / 4hrs", "Unlimited", "Unlimited"],
  ["Saved history", "—", "Yes", "Yes", "Yes"],
  ["Projects, pins & drafts", "—", "Yes", "Yes", "Shared"],
  ["Send-for-review log", "—", "Personal", "Personal", "Team-wide"],
  ["Support", "—", "Email", "Email", "Named contact"],
];

const FAQ = [
  {
    q: "Where is my data held?",
    a: "AccessAI2 is operated from Australia. Your account, conversations and uploaded documents are stored using our hosting and database infrastructure.




We engage third-party providers only when necessary for service delivery, preferred answers, compliance or authorised data processing. The content of a message may be shared with third-party AI platforms to generate a response. 




Any data shared with third-party providers is limited to the information necessary for the relevant purpose and is handled in accordance with our Privacy Policy, which identifies the providers involved and explains how data is processed and protected.




Where available and technically supported, client data may be processed locally without sharing it with or providing access to third-party AI platforms. Applicable processing arrangements depend on the client's service configuration and requirements.",
  },
  {
    q: 'What does "Send for Review" actually do?',
    a: "It sends your message as an email but tags it separately in your send history for compliance review, instead of mixing it in with direct sends.",
  },
  {
    q: "How does the free allowance reset?",
    a: "Each of the 10 messages, 1 email send and 5 document uploads refills on a rolling 4-hour window measured from your first action in that window, not a fixed daily reset. Uploads are shared across chat attachments and project files.",
  },
  {
    q: "What is a temporary chat?",
    a: "A temporary (incognito) chat is never saved to your history — once you close it, it's gone for good.",
  },
];

export function PricingDetailSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="pricing-detail" className="mx-auto max-w-4xl px-6 pb-20">
      <h2 className="font-display text-2xl font-semibold text-navy-deeper dark:text-white">
        Compare plans
      </h2>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-panel-grey text-xs uppercase tracking-wide text-muted-grey dark:bg-white/5 dark:text-white/40">
              <th className="py-3 pl-4 pr-4"></th>
              <th className="py-3 pr-4">Guest</th>
              <th className="py-3 pr-4">Free</th>
              <th className="py-3 pr-4">Pro</th>
              <th className="py-3 pr-4">Team</th>
            </tr>
          </thead>
          <tbody className="text-navy-deeper dark:text-white/80">
            {ROWS.map((row) => (
              <tr key={row[0]} className="border-t border-black/10 dark:border-white/10">
                <td className="py-3 pl-4 pr-4 font-medium text-navy-deeper dark:text-white">
                  {row[0]}
                </td>
                <td className="py-3 pr-4">{row[1]}</td>
                <td className="py-3 pr-4">{row[2]}</td>
                <td className="py-3 pr-4">{row[3]}</td>
                <td className="py-3 pr-4">{row[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="font-display mt-10 text-lg font-semibold text-navy-deeper dark:text-white">
        Common questions
      </h3>
      <div className="mt-3 space-y-2">
        {FAQ.map((item, i) => (
          <div
            key={item.q}
            className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-navy-dark"
          >
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-navy-deeper dark:text-white"
            >
              {item.q}
              <span className="text-muted-grey dark:text-white/50">
                {openFaq === i ? "×" : "+"}
              </span>
            </button>
            {openFaq === i && (
              <p className="px-4 pb-3 text-sm text-muted-grey dark:text-white/60">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
