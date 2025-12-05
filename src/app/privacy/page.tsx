export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[540px] mx-auto px-4 py-10">
        {/* Title */}
        <h1 className="text-[20px] font-medium leading-6 text-black mb-4">
          Privacy Policy
        </h1>

        {/* Content */}
        <div className="text-[14px] font-normal leading-6 text-black space-y-0">
          <p className="text-[#6a6a6a] mb-4">Last Updated: December 5, 2025</p>
          
          <p className="mb-1"><strong>Company:</strong> Manxz, Inc. (&quot;Manxz,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;)</p>
          <p className="mb-4"><strong>Product:</strong> Workapp (&quot;Workapp,&quot; &quot;the Service&quot;)</p>

          <h2 className="font-semibold mb-1">1. Introduction</h2>
          <p className="mb-1">
            This Privacy Policy describes how Manxz, Inc. collects, uses, discloses, and protects personal information when users (&quot;you,&quot; &quot;your,&quot; &quot;Users&quot;) access or use Workapp, our business collaboration platform.
          </p>
          <p className="mb-1">
            By accessing or using the Service, you agree to the practices described in this Privacy Policy. If you do not agree, you must not use the Service.
          </p>
          <p className="mb-4">
            Workapp is intended solely for business use and for individuals 18 years of age or older.
          </p>

          <h2 className="font-semibold mb-1">2. Information We Collect</h2>
          <p className="mb-2">We collect the following categories of information:</p>

          <h3 className="font-semibold mb-1">2.1. Account Information</h3>
          <p className="mb-1">When you create or manage an account, we collect:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>Full name</li>
            <li>Email address</li>
            <li>Profile photo (optional)</li>
            <li>Role and title</li>
            <li>Company name</li>
            <li>Organization/Workspace name</li>
            <li>Billing email</li>
            <li>Billing address</li>
            <li>Payment information (processed directly by Stripe; Manxz does not store full payment details)</li>
          </ul>

          <h3 className="font-semibold mb-1">2.2. Content You Create or Upload</h3>
          <p className="mb-1">We collect and process content you submit while using the Service, including:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>Chat messages</li>
            <li>Notes, documents, and comments</li>
            <li>Tasks and projects</li>
            <li>Calendar entries</li>
            <li>Uploaded files</li>
            <li>AI-generated summaries and outputs</li>
            <li>Metadata such as timestamps</li>
          </ul>
          <p className="mb-4">You retain ownership of User Content submitted to the Service.</p>

          <h3 className="font-semibold mb-1">2.3. Usage Data</h3>
          <p className="mb-1">When you use Workapp, we automatically collect:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>Page views</li>
            <li>Buttons/actions clicked</li>
            <li>Session duration</li>
            <li>Device type and browser type</li>
            <li>IP address</li>
            <li>Error logs</li>
            <li>Diagnostic information</li>
          </ul>
          <p className="mb-1">Tools used:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>Google Analytics</li>
            <li>Vercel Analytics</li>
            <li>Supabase logs</li>
          </ul>

          <h3 className="font-semibold mb-1">2.4. Google Calendar Integrations</h3>
          <p className="mb-2">
            Workapp uses Google&apos;s APIs to power all calendar features. If you choose to use the calendar portion of Workapp, we require access to your Google Calendar so we can show and sync your schedule.
          </p>
          
          <p className="font-semibold mb-1">What we access:</p>
          <ul className="list-disc ml-5 mb-2">
            <li>Your calendar list</li>
            <li>Event details (title, time, description, location, participants, reminders)</li>
            <li>Basic calendar settings and sharing information</li>
          </ul>
          
          <p className="font-semibold mb-1">What we use it for:</p>
          <ul className="list-disc ml-5 mb-2">
            <li>Showing your calendars inside Workapp</li>
            <li>Keeping events in sync</li>
            <li>Letting you create, edit, or delete events when you take an action in the app</li>
          </ul>
          
          <p className="font-semibold mb-1">What we don&apos;t do:</p>
          <ul className="list-disc ml-5 mb-2">
            <li>No advertising or marketing use</li>
            <li>No selling or sharing Google Calendar data</li>
            <li>No unrelated use outside of calendar features</li>
          </ul>
          
          <p className="font-semibold mb-1">Your choices:</p>
          <ul className="list-disc ml-5 mb-2">
            <li>If you decline access, you can still use Workapp, but the calendar will be locked</li>
            <li>You can revoke Workapp&apos;s access at any time through your Google Account settings</li>
          </ul>
          
          <p className="font-semibold mb-1">Data retention:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>Calendar data is stored only as needed to provide calendar features</li>
            <li>It is deleted when you revoke access or remove your Workapp account</li>
          </ul>

          <h3 className="font-semibold mb-1">2.5. Cookies and Tracking Technologies</h3>
          <p className="mb-1">We use:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>Essential cookies necessary to operate the Service</li>
            <li>Analytics cookies for usage measurement</li>
            <li>No marketing or advertising cookies</li>
          </ul>

          <h2 className="font-semibold mb-1">3. How We Use Your Information</h2>
          <p className="mb-1">Manxz uses personal data for the following purposes:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>To provide, maintain, and improve the Service</li>
            <li>To authenticate users and manage accounts</li>
            <li>To operate collaboration tools (Chat, Tasks, Notes/Docs, Calendar)</li>
            <li>To generate AI-based summaries and recommendations</li>
            <li>To provide organization and workspace administration</li>
            <li>To process payments and manage billing</li>
            <li>To monitor usage, performance, and security</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p className="mb-4">We do not sell or rent personal data to third parties.</p>

          <h2 className="font-semibold mb-1">4. AI Processing and Third-Party AI Providers</h2>
          <p className="mb-2">Workapp uses third-party AI providers, including OpenAI and Anthropic, to generate summaries and assistive outputs.</p>

          <h3 className="font-semibold mb-1">4.1. What We Send</h3>
          <p className="mb-1">We may send portions of:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>Chat messages</li>
            <li>Documents</li>
            <li>Tasks</li>
            <li>Other user-provided content</li>
          </ul>
          <p className="mb-4">…to these AI providers solely to generate summaries or outputs requested by the user.</p>

          <h3 className="font-semibold mb-1">4.2. How Providers Use the Data (Neutral Transparency Statement)</h3>
          <p className="mb-1">Based on the published policies of OpenAI and Anthropic as of this writing:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>API-submitted data is not used to train their models</li>
            <li>Data may be stored temporarily for abuse prevention</li>
            <li>Data is processed only to provide the requested AI functionality</li>
          </ul>
          <p className="mb-4">Manxz does not control how long these providers retain logs under their respective terms.</p>

          <h3 className="font-semibold mb-1">4.3. What Manxz Does NOT Do</h3>
          <p className="mb-1">Manxz:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>Does not use customer data to train internal AI models</li>
            <li>Does not use customer data for product improvement unrelated to the user&apos;s request</li>
            <li>Does not give AI providers rights to reuse customer content</li>
          </ul>
          <p className="mb-4">This Privacy Policy is consistent with the Terms of Service and does not constitute a contradiction.</p>

          <h2 className="font-semibold mb-1">5. How We Share Information</h2>
          <p className="mb-2">We do not sell or share your personal information with third parties for advertising or marketing.</p>
          <p className="mb-2">We only share information with:</p>

          <h3 className="font-semibold mb-1">5.1. Service Providers (Infrastructure & Operations)</h3>
          <p className="mb-1">To operate Workapp, we use:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>AWS</li>
            <li>Vercel</li>
            <li>Supabase</li>
            <li>Cloudflare</li>
            <li>Google Cloud APIs</li>
            <li>Stripe</li>
          </ul>
          <p className="mb-4">These providers process data on our behalf under contractual obligations.</p>

          <h3 className="font-semibold mb-1">5.2. Calendar Integration Providers</h3>
          <p className="mb-4">Only if you choose to connect your calendar.</p>

          <h3 className="font-semibold mb-1">5.3. Compliance With Legal Obligations</h3>
          <p className="mb-1">We may disclose information if required to:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>Comply with law</li>
            <li>Respond to subpoenas or legal process</li>
            <li>Protect the rights and safety of Manxz, our users, or the public</li>
          </ul>

          <h2 className="font-semibold mb-1">6. Data Retention</h2>
          <p className="mb-1">We retain user data:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>For as long as the account is active; and</li>
            <li>For 30 days after a deletion request, after which data is permanently deleted</li>
          </ul>
          <p className="mb-4">Some backup copies may persist for a limited time per standard backup procedures but will be removed in accordance with our normal retention cycles.</p>

          <h2 className="font-semibold mb-1">7. Data Deletion Rights</h2>
          <p className="mb-1">Users may request deletion of:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>Account information</li>
            <li>Profile data</li>
            <li>User-generated content</li>
          </ul>
          <p className="mb-1">Administrators may request deletion of users within their organization (if this feature is enabled in the future).</p>
          <p className="mb-1">Upon deletion:</p>
          <ul className="list-disc ml-5 mb-4">
            <li>Data becomes inaccessible immediately</li>
            <li>Permanent deletion occurs within 30 days</li>
          </ul>

          <h2 className="font-semibold mb-1">8. Data Location</h2>
          <p className="mb-1">All data is stored and processed in the United States.</p>
          <p className="mb-4">We do not currently support region-specific data residency.</p>

          <h2 className="font-semibold mb-1">9. Security Measures</h2>
          <p className="mb-1">Manxz uses commercially reasonable safeguards to protect personal information, including:</p>
          <ul className="list-disc ml-5 mb-1">
            <li>Encryption in transit</li>
            <li>Secure infrastructure providers</li>
            <li>Access controls</li>
            <li>Monitoring and logging</li>
          </ul>
          <p className="mb-4">No system is 100% secure, and we cannot guarantee absolute security.</p>

          <h2 className="font-semibold mb-1">10. Children&apos;s Privacy</h2>
          <p className="mb-4">The Service is intended for adults 18 years or older. We do not knowingly collect personal information from minors.</p>

          <h2 className="font-semibold mb-1">11. Data Processing Addendum (DPA)</h2>
          <p className="mb-4">A Data Processing Addendum (&quot;DPA&quot;) may be made available to business customers upon request. The DPA governs our processing of Customer Data under applicable data-protection laws.</p>

          <h2 className="font-semibold mb-1">12. Changes to This Privacy Policy</h2>
          <p className="mb-1">We may update this Policy from time to time. We will notify users of material changes by email or in-app notices.</p>
          <p className="mb-4">Continued use of the Service after changes become effective constitutes acceptance.</p>

          <h2 className="font-semibold mb-1">13. Contact Information</h2>
          <p className="mb-1">For questions or requests:</p>
          <p>
            Manxz, Inc.<br />
            Email: legal@manxz.com
          </p>
        </div>
      </div>
    </div>
  );
}

