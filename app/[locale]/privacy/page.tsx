import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <PageSection className="space-y-6 text-sm leading-6 text-muted">
      <PageHeader
        title="Privacy policy"
        subtitle="How AGA uses and protects your information."
      />
      <section>
        <h2 className="text-lg font-semibold text-text">Who we are</h2>
        <p>
          AGA is a UK job marketplace. We are the data controller for the
          personal information you provide when using this service.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-text">Information we use</h2>
        <p>
          We process account details, profile and job information, search
          preferences, and contact activity to provide the marketplace,
          protect users, and improve the service.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-text">Your rights</h2>
        <p>
          Under UK GDPR, you can request access, correction, deletion,
          restriction, or portability of your personal data, and object to
          certain processing. You can also complain to the ICO.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-text">Retention and sharing</h2>
        <p>
          We keep information only as long as needed for the service and
          legal obligations. Contact details are shared only when a user
          reveals them through the marketplace.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-text">Contact</h2>
        <p>For privacy requests, contact the AGA support team.</p>
      </section>
    </PageSection>
  );
}
