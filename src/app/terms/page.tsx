import type { Metadata } from "next";
import { LegalPage, Section, Bullets, Pending } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — AccessAI2",
  description: "The terms governing your use of the AccessAI2 assistant.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="6 September 2026">
      <p>
        These terms govern your use of AccessAI2, operated by IRIS-Monde (
        <Pending>registered entity name</Pending>, ABN <Pending>ABN</Pending>). By creating an
        account or using the service, you agree to them. If you do not agree, do not use the
        service.
      </p>

      <Section heading="1. What AccessAI2 is">
        <p>
          AccessAI2 is an AI assistant scoped to governance, risk, HR, finance, tax and ESG topics.
          It can draft communications, summarise and review documents you upload, and help you
          prepare correspondence.
        </p>
      </Section>

      <Section heading="2. It is not professional advice">
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <strong>Important.</strong> AccessAI2 generates responses using an AI language model. Its
          output is general information only. It is <strong>not</strong> legal, financial,
          accounting, taxation, audit or professional advice, and it does not create a
          client&nbsp;relationship with IRIS-Monde. Responses may be incomplete, out of date or
          incorrect, including where they cite legislation, standards or dates. You must
          independently verify anything you intend to rely on, and obtain advice from a qualified
          professional before acting. You remain solely responsible for decisions you make and for
          your own regulatory obligations.
        </p>
      </Section>

      <Section heading="3. Your account">
        <Bullets
          items={[
            "You must be at least 18 and provide accurate details when registering.",
            "You are responsible for keeping your login credentials secure and for activity under your account.",
            "Tell us promptly if you suspect unauthorised access.",
          ]}
        />
      </Section>

      <Section heading="4. Acceptable use">
        <p>You must not:</p>
        <Bullets
          items={[
            "Use the service unlawfully, or to produce misleading, deceptive or unlawful material.",
            "Upload content you do not have the right to share, or that infringes another party's rights.",
            "Upload information belonging to third parties without a lawful basis for doing so.",
            "Attempt to circumvent usage limits, security controls or access other users' data.",
            "Resell or redistribute the service, or use it to build a competing product.",
          ]}
        />
      </Section>

      <Section heading="5. Your content">
        <p>
          You keep ownership of the messages and documents you submit. You grant us the limited
          licence needed to operate the service — including transmitting your content to our AI
          provider to generate a response, and storing it so your conversations remain available to
          you. How that content is handled is described in our{" "}
          <a href="/privacy" className="text-teal underline">
            Privacy Policy
          </a>
          .
        </p>
        <p>
          Because message content is sent to a third-party AI provider for processing, do not submit
          material you are not permitted to disclose to an external processor.
        </p>
      </Section>

      <Section heading="6. Free tier and usage limits">
        <p>
          Free accounts are subject to fair-use limits over a rolling four-hour window — currently
          10 messages, 3 document uploads and 1 email send. We may adjust these limits. Attempting
          to evade them may result in suspension.
        </p>
      </Section>

      <Section heading="7. Paid plans and payment">
        <Bullets
          items={[
            "Paid access is purchased through PayPal and unlocks unrestricted use for 30 days from the date payment completes.",
            "Access is not automatically renewed; you purchase a further period when you choose to.",
            "Your plan is linked to the email address associated with your PayPal payment. Using a different address may delay activation.",
            "Prices are in Australian dollars and include applicable taxes unless stated otherwise.",
            "Payments are generally non-refundable except where required by the Australian Consumer Law.",
          ]}
        />
      </Section>

      <Section heading="8. Availability">
        <p>
          We aim to keep the service available but do not guarantee uninterrupted access. We may
          modify, suspend or discontinue features, and we rely on third-party providers whose
          outages may affect the service. The service is provided &quot;as is&quot; to the extent
          permitted by law.
        </p>
      </Section>

      <Section heading="9. Australian Consumer Law">
        <p>
          Nothing in these terms excludes, restricts or modifies any guarantee, right or remedy you
          have under the Australian Consumer Law that cannot lawfully be excluded. Where our
          liability can be limited, it is limited at our option to resupplying the service or paying
          the cost of resupply.
        </p>
      </Section>

      <Section heading="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, and subject to clause 9, IRIS-Monde is not liable
          for indirect or consequential loss, loss of profits, loss of data, or loss arising from
          reliance on AI-generated output. Our total liability arising out of the service is limited
          to the amount you paid us in the 12 months before the claim.
        </p>
      </Section>

      <Section heading="11. Suspension and termination">
        <p>
          You may stop using the service and request account deletion at any time. We may suspend or
          terminate access where these terms are breached, where use threatens the security or
          integrity of the service, or where required by law.
        </p>
      </Section>

      <Section heading="12. Changes to these terms">
        <p>
          We may update these terms and will revise the date at the top of this page. Continuing to
          use the service after a change takes effect means you accept the updated terms.
        </p>
      </Section>

      <Section heading="13. Governing law">
        <p>
          These terms are governed by the laws of <Pending>state or territory</Pending>, Australia,
          and you submit to the non-exclusive jurisdiction of the courts of that jurisdiction.
        </p>
      </Section>

      <Section heading="14. Contact">
        <p>
          IRIS-Monde
          <br />
          <Pending>registered entity name</Pending>
          <br />
          <Pending>business address, state, postcode</Pending>
          <br />
          <Pending>contact email</Pending>
        </p>
      </Section>
    </LegalPage>
  );
}
