"use client";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-[540px] mx-auto px-4 py-10">
        {/* Title */}
        <h1 className="text-[20px] font-medium leading-6 text-black mb-4">
          Terms of Service
        </h1>

        {/* Content */}
        <div className="text-[14px] font-normal leading-6 text-black space-y-0">
          <p className="text-[#6a6a6a] mb-4">Last updated: December 4, 2025</p>
          
          <p className="mb-4">
            This Terms of Service Agreement (&quot;Agreement&quot;) is entered into by and between Manxz, Inc. (&quot;Manxz&quot;) and the entity or individual (&quot;User&quot;) accessing or using the Workapp software platform (&quot;Service&quot;).
          </p>

          <h2 className="font-semibold mb-1">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using the Service, User agrees to be bound by this Agreement. User represents that it is utilizing the Service for business purposes and has the authority to bind its organization.
          </p>

          <h2 className="font-semibold mb-1">2. Description of the Service</h2>
          <p className="mb-4">
            Manxz provides a software-as-a-service platform that includes communication tools, task management, documentation, calendaring, team administration, and AI-assisted productivity features. Manxz may modify or discontinue features or components of the Service at any time.
          </p>

          <h2 className="font-semibold mb-1">3. Accounts and Administration</h2>
          <p className="mb-1">
            User must maintain accurate and secure account credentials. Users within an organization are governed by designated administrators (&quot;Admins&quot;), who manage permissions, billing, and configuration.
          </p>
          <p className="mb-4">
            Admins do not have access to private messages between users unless a future enterprise compliance tool is explicitly provided with appropriate notice.
          </p>

          <h2 className="font-semibold mb-1">4. Fees and Payment</h2>
          <p className="mb-1">
            Fees are billed on a per-user, per-month basis. Manxz provides a limited free tier supporting up to five users. Fees are due immediately upon billing. Refunds may be granted solely at Manxz&apos;s discretion.
          </p>
          <p className="mb-4">
            If payment fails, Manxz will notify the Admin and allow a 60-day grace period prior to suspension.
          </p>

          <h2 className="font-semibold mb-1">5. User Content</h2>
          <p className="mb-4">
            User retains ownership of all information uploaded or created within the Service (&quot;User Content&quot;). User grants Manxz a limited, non-exclusive, worldwide license to host, process, transmit, and display User Content solely for the purpose of providing the Service.
          </p>

          <h2 className="font-semibold mb-1">6. Artificial Intelligence Processing</h2>
          <p className="mb-4">
            The Service includes optional AI features for summarization, decision support, and automated assistance. User owns AI-generated outputs created for its organization. Manxz does not use User Content to train generalized machine learning models.
          </p>

          <h2 className="font-semibold mb-1">7. Restrictions</h2>
          <p className="mb-1">User shall not:</p>
          <p className="mb-4">
            (a) use the Service for unlawful or harmful purposes;<br />
            (b) interfere with or disrupt the Service;<br />
            (c) attempt unauthorized access;<br />
            (d) reverse engineer, decompile, or disassemble the Service;<br />
            (e) use the Service to transmit external SMS or email communications;<br />
            (f) infringe upon the rights of others.
          </p>

          <h2 className="font-semibold mb-1">8. Third-Party Providers</h2>
          <p className="mb-4">
            The Service relies on third-party infrastructure services, including but not limited to AWS, Cloudflare, Google Cloud APIs, Stripe, Vercel, and Supabase. Manxz is not responsible for disruptions, data loss, or outages caused by such providers.
          </p>

          <h2 className="font-semibold mb-1">9. Termination</h2>
          <p className="mb-1">
            Either party may terminate this Agreement in accordance with its terms. Manxz may suspend or terminate access for:
          </p>
          <ul className="list-disc ml-5 mb-1">
            <li>Breach of this Agreement</li>
            <li>Failure to pay fees beyond the grace period</li>
            <li>Conduct that is unlawful or detrimental to the Service</li>
          </ul>
          <p className="mb-4">
            Paid accounts may export their data prior to termination.
          </p>

          <h2 className="font-semibold mb-1">10. Disclaimer of Warranties</h2>
          <p className="mb-4">
            THE SERVICE IS PROVIDED &quot;AS IS,&quot; WITHOUT ANY WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>

          <h2 className="font-semibold mb-1">11. Limitation of Liability</h2>
          <p className="mb-1">
            MANXZ&apos;S TOTAL LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNT PAID BY USER TO MANXZ IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
          <p className="mb-4">
            IN NO EVENT SHALL MANXZ BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES.
          </p>

          <h2 className="font-semibold mb-1">12. Indemnification</h2>
          <p className="mb-1">
            User agrees to indemnify, defend, and hold harmless Manxz from any claims arising from:
          </p>
          <p className="mb-4">
            (a) User Content;<br />
            (b) User&apos;s misuse of the Service;<br />
            (c) User&apos;s violation of this Agreement.
          </p>

          <h2 className="font-semibold mb-1">13. Dispute Resolution</h2>
          <p className="mb-1">
            Parties shall first attempt informal resolution. Failing that, disputes will be resolved through final and binding arbitration conducted on an individual basis. User waives the right to participate in class or collective actions.
          </p>
          <p className="mb-4">
            This Agreement is governed by the laws of California, with exclusive venue in San Joaquin County.
          </p>

          <h2 className="font-semibold mb-1">14. Amendments</h2>
          <p className="mb-4">
            Manxz may modify this Agreement at any time. Continued use of the Service constitutes acceptance of the updated terms.
          </p>

          <h2 className="font-semibold mb-1">15. Contact</h2>
          <p>
            Manxz, Inc.<br />
            Email: legal@manxz.com
          </p>
        </div>
      </div>
    </div>
  );
}

