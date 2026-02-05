import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | HomeField Hub",
  description: "HomeField Hub terms of service for our lead generation and messaging services.",
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">&larr; Back to Home</Link>
          <h1 className="text-3xl font-bold mt-2">Terms of Service</h1>
          <p className="text-slate-400 mt-1">Last updated: February 5, 2025</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-slate">
        <h2>Agreement to Terms</h2>
        <p>
          By accessing our website, submitting a lead form, or communicating with us via text message
          or phone, you agree to be bound by these Terms of Service. If you do not agree, please do
          not use our services.
        </p>

        <h2>Description of Services</h2>
        <p>
          HomeField Hub (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides lead generation
          and appointment scheduling services for home service contractors. We connect homeowners
          seeking home services (such as pressure washing, roofing, HVAC, landscaping, and other
          home improvement services) with qualified local contractors.
        </p>
        <p>Our services include:</p>
        <ul>
          <li>Collecting service inquiries via Meta (Facebook/Instagram) Lead Forms and our website</li>
          <li>Following up with potential customers via text message (SMS) and phone calls</li>
          <li>Scheduling appointments between homeowners and contractors</li>
          <li>Facilitating communication related to service requests</li>
        </ul>

        <h2>Consent to Communications</h2>
        <p>
          By submitting your contact information through a Meta Lead Form (on Facebook or Instagram),
          a form on our website, or by initiating contact with us via text or phone, you expressly
          consent to receive:
        </p>
        <ul>
          <li>Text messages (SMS) related to your service inquiry</li>
          <li>Phone calls to discuss your project and schedule appointments</li>
          <li>Follow-up communications regarding your request</li>
        </ul>
        <p>
          <strong>Message frequency varies</strong> based on the nature of your inquiry. Message and
          data rates may apply. You may opt out of text messages at any time by replying
          <strong> STOP</strong>. Reply <strong>HELP</strong> for assistance.
        </p>
        <p>
          Consent to receive text messages is not a condition of purchasing any goods or services.
        </p>

        <h2>User Responsibilities</h2>
        <p>When using our services, you agree to:</p>
        <ul>
          <li>Provide accurate and truthful information</li>
          <li>Be the owner or authorized user of the phone number provided</li>
          <li>Not use our services for any unlawful purpose</li>
          <li>Not submit false or misleading service requests</li>
        </ul>

        <h2>No Guarantee of Service</h2>
        <p>
          While we strive to connect you with a qualified contractor, we do not guarantee that a
          contractor will be available in your area or that services will be performed. Contractors
          operate as independent businesses, and we are not responsible for the quality, safety, or
          outcome of any work performed.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, HomeField Hub shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of your use of our
          services. Our total liability shall not exceed the amount you have paid us, if any, in the
          twelve (12) months preceding the claim.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content on our website, including text, graphics, logos, and software, is the property
          of HomeField Hub and is protected by applicable intellectual property laws.
        </p>

        <h2>Third-Party Services</h2>
        <p>
          Our services integrate with third-party platforms including Meta (Facebook/Instagram) and
          various communication tools. Your use of those platforms is governed by their respective
          terms and privacy policies.
        </p>

        <h2>Modifications</h2>
        <p>
          We reserve the right to modify these Terms at any time. Changes will be posted on this page
          with an updated date. Continued use of our services after changes constitutes acceptance of
          the updated Terms.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of
          North Carolina, without regard to conflict of law principles.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about these Terms, contact us at:
        </p>
        <ul>
          <li><strong>Email:</strong> support@homefieldhub.com</li>
          <li><strong>Website:</strong> homefieldhub.com</li>
        </ul>
      </main>

      <footer className="bg-slate-900 text-white py-6 px-4 mt-12">
        <div className="max-w-3xl mx-auto text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} HomeField Hub. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
