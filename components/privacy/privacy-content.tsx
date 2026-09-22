export function PrivacyContent() {
  return (
    <div className="space-y-6 text-sm leading-6 text-white/90">
      <div className="w-full space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight text-muted sm:text-5xl">
          Privacy policy
        </h2>
        <p className="text-lg text-white">
          How AGA uses and protects your information.
        </p>
      </div>
      <section>
        <h3 className="text-lg font-semibold text-foreground">Who we are</h3>
        <p>
          AGA is a UK job marketplace. We are the data controller for the
          personal information you provide when using this service.
        </p>
      </section>
      <section>
        <h3 className="text-lg font-semibold text-foreground">Information we use</h3>
        <p>
          We process account details, profile and job information, search
          preferences, and contact activity to provide the marketplace,
          protect users, and improve the service.
        </p>
      </section>
      <section>
        <h3 className="text-lg font-semibold text-foreground">Your rights</h3>
        <p>
          Under UK GDPR, you can request access, correction, deletion,
          restriction, or portability of your personal data, and object to
          certain processing. You can also complain to the ICO.
        </p>
      </section>
      <section>
        <h3 className="text-lg font-semibold text-foreground">Retention and sharing</h3>
        <p>
          We keep information only as long as needed for the service and
          legal obligations. Contact details are shared only when a user
          reveals them through the marketplace.
        </p>
      </section>
      <section>
        <h3 className="text-lg font-semibold text-foreground">Contact</h3>
        <p>For privacy requests, contact the AGA support team.</p>
      </section>
    </div>
  );
}
