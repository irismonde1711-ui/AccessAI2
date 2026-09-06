import type { Metadata } from "next";
import { LegalPage, Section, Bullets, Pending } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — AccessAI2",
  description: "How AccessAI2 collects, uses, stores and discloses personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="6 September 2026">
      <p>
        AccessAI2 is operated by IRIS-Monde (<Pending>registered entity name</Pending>,{" "}
        ABN <Pending>ABN</Pending>) (&quot;we&quot;, &quot;us&quot;). This policy explains what
        personal information we collect when you use AccessAI2, how we handle it, and the choices
        you have. We handle personal information in accordance with the{" "}
        <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs).
      </p>

      <Section heading="1. Information we collect">
        <p>We collect only what the service needs to function:</p>
        <Bullets
          items={[
            <>
              <strong>Account details.</strong> Your name and email address when you create an
              account. If you sign in with Google, we receive your name, email address and profile
              picture from Google. We never receive your Google password.
            </>,
            <>
              <strong>Conversation content.</strong> The messages you send, and the assistant&apos;s
              replies, so your conversations, projects and drafts persist between visits.
            </>,
            <>
              <strong>Documents you upload.</strong> Files you attach to a message, together with
              their filename and file type.
            </>,
            <>
              <strong>Email records.</strong> Where you use the email feature, the recipient
              address, subject, message body and whether it was sent normally or for review.
            </>,
            <>
              <strong>Usage records.</strong> A timestamped record of each message, upload and email
              send, used to apply fair-use limits. For visitors who are not signed in, we record the
              IP address instead of an account identifier, solely for this purpose.
            </>,
            <>
              <strong>Payment records.</strong> Where you subscribe, we record the PayPal order
              identifier, the payer email address, the amount and the plan expiry date.{" "}
              <strong>We never receive or store your card details</strong> — those are handled
              entirely by PayPal.
            </>,
          ]}
        />
      </Section>

      <Section heading="2. How we use it">
        <Bullets
          items={[
            "To provide the assistant, and to generate responses to your messages and documents.",
            "To keep your conversations, projects and drafts available to you across sessions.",
            "To apply fair-use limits and to distinguish free from paid accounts.",
            "To process subscription payments and confirm your plan status.",
            "To secure the service, investigate misuse, and meet our legal obligations.",
          ]}
        />
        <p>
          We do not sell your personal information, and we do not use your conversations or
          documents for advertising.
        </p>
      </Section>

      <Section heading="3. Who we share it with">
        <p>
          We disclose personal information only to the service providers needed to run AccessAI2:
        </p>
        <Bullets
          items={[
            <>
              <strong>Google (Gemini API)</strong> — the content of your messages and any documents
              you attach are sent to Google to generate a response. Google processes this as our
              service provider.
            </>,
            <>
              <strong>Supabase</strong> — hosts our database, authentication and file storage.
            </>,
            <>
              <strong>Vercel</strong> — hosts and serves the application.
            </>,
            <>
              <strong>PayPal</strong> — processes subscription payments and notifies us when a
              payment completes.
            </>,
            <>
              <strong>Resend</strong> — delivers emails you choose to send through the service.
            </>,
          ]}
        />
        <p>
          We may also disclose information where required by law, or to protect our rights or the
          safety of others.
        </p>
      </Section>

      <Section heading="4. Overseas disclosure">
        <p>
          Some of these providers store or process data outside Australia, including in the United
          States and the European Union. By using AccessAI2 you consent to this disclosure. We take
          reasonable steps to ensure recipients handle your information consistently with the
          Australian Privacy Principles, but overseas recipients may not be subject to the Privacy
          Act.
        </p>
      </Section>

      <Section heading="5. Security">
        <p>
          Access to your data is restricted at the database level so that you can only read and
          write your own records. Uploaded documents are stored in a private bucket, scoped to your
          account, and are not publicly accessible. Data is transmitted over encrypted connections.
        </p>
        <p>
          No system is perfectly secure. Please do not upload information more sensitive than the
          service requires, and tell us immediately if you believe your account has been
          compromised.
        </p>
      </Section>

      <Section heading="6. Retention and deletion">
        <p>
          We keep your conversations, drafts and documents until you delete them or ask us to close
          your account. Usage records are kept only as long as needed to apply fair-use limits.
          Payment records are retained as required by Australian tax and corporations law. Chats
          started in temporary (incognito) mode are not saved to your history.
        </p>
      </Section>

      <Section heading="7. Accessing and correcting your information">
        <p>
          You may request access to the personal information we hold about you, ask us to correct
          it, or ask us to delete your account and associated data. Contact us at{" "}
          <Pending>privacy contact email</Pending> and we will respond within a reasonable period.
          If we refuse a request, we will tell you why.
        </p>
      </Section>

      <Section heading="8. Cookies and similar technologies">
        <p>
          We use cookies and browser storage strictly to keep you signed in and to remember
          preferences such as your light or dark theme. We do not use advertising or cross-site
          tracking cookies.
        </p>
      </Section>

      <Section heading="9. Complaints">
        <p>
          If you believe we have mishandled your personal information, contact us first at{" "}
          <Pending>privacy contact email</Pending> so we can investigate. If you are not satisfied
          with our response, you may complain to the Office of the Australian Information
          Commissioner (OAIC) at oaic.gov.au or on 1300 363 992.
        </p>
      </Section>

      <Section heading="10. Changes to this policy">
        <p>
          We review this policy at least annually and will update this page when it changes. Where
          changes are material, we will take reasonable steps to notify you.
        </p>
      </Section>

      <Section heading="11. Contact us">
        <p>
          IRIS-Monde
          <br />
          <Pending>registered entity name</Pending>
          <br />
          <Pending>business address, state, postcode</Pending>
          <br />
          <Pending>privacy contact email</Pending>
        </p>
      </Section>
    </LegalPage>
  );
}
