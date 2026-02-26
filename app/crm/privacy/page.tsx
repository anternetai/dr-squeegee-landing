import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Dr. Squeegee House Washing",
  description: "Dr. Squeegee House Washing privacy policy - how we collect, use, and protect your information.",
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">&larr; Back to Home</Link>
          <h1 className="text-3xl font-bold mt-2">Privacy Policy</h1>
          <p className="text-slate-400 mt-1">Last updated: February 26, 2026</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-slate">
        <h2>Introduction</h2>
        <p>
          Dr. Squeegee House Washing (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides professional
          exterior cleaning services, including house washing, pressure washing, roof washing, driveway cleaning,
          and gutter cleaning in the Charlotte, NC area. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you interact with our services, including through our
          website (drsqueegeeclt.com) and text message (SMS) communications.
        </p>

        <h2>Information We Collect</h2>
        <p>We may collect the following personal information:</p>
        <ul>
          <li><strong>Contact Information:</strong> Name, phone number, email address</li>
          <li><strong>Service Details:</strong> Type of service requested, property address, project details</li>
          <li><strong>Communication Records:</strong> Records of text messages, phone calls, and other communications between you and our team</li>
          <li><strong>Device &amp; Usage Data:</strong> Browser type, IP address, and website interaction data collected via cookies and analytics tools</li>
        </ul>

        <h2>How We Collect Your Information</h2>
        <p>We collect information through:</p>
        <ul>
          <li><strong>Our Website:</strong> When you fill out a contact or quote request form on drsqueegeeclt.com.</li>
          <li><strong>Phone &amp; SMS:</strong> When you call us, text us, or respond to our text messages.</li>
          <li><strong>In-Person Inquiries:</strong> When you contact us directly to request a service estimate.</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide you with service estimates and quotes</li>
          <li>Schedule and confirm appointments</li>
          <li>Send you text messages (SMS) related to your service inquiry, appointment scheduling, and follow-ups</li>
          <li>Make phone calls to discuss your project</li>
          <li>Improve our services</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>Text Messaging (SMS) Policy</h2>
        <p>
          By providing your phone number through our website contact form or during a service inquiry call,
          you consent to receive text messages from Dr. Squeegee House Washing related to your inquiry.
          This may include:
        </p>
        <ul>
          <li>Service quotes and estimates for your review and approval</li>
          <li>Appointment confirmations and reminders</li>
          <li>Follow-up messages regarding your service</li>
          <li>Responses to your questions</li>
        </ul>
        <p>
          <strong>Message frequency varies</strong> based on your service interactions. Message and data
          rates may apply. You can opt out at any time by replying <strong>STOP</strong> to any text
          message. Reply <strong>HELP</strong> for assistance.
        </p>
        <p>
          We do not send unsolicited marketing text messages. All SMS communications are limited to the
          service inquiry or appointment you initiated.
        </p>

        <h2>Sharing Your Information</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Third-party tools we use to facilitate communications (e.g., SMS platforms)</li>
          <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>

        <h2>Data Security</h2>
        <p>
          We implement reasonable technical and organizational measures to protect your personal information.
          However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee
          absolute security.
        </p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Request access to the personal information we hold about you</li>
          <li>Request correction or deletion of your personal information</li>
          <li>Opt out of text message communications by replying STOP</li>
          <li>Opt out of email communications by contacting us directly</li>
        </ul>

        <h2>Children&apos;s Privacy</h2>
        <p>
          Our services are not directed to individuals under 18. We do not knowingly collect personal
          information from children.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with
          an updated &quot;Last updated&quot; date.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your rights, contact us at:
        </p>
        <ul>
          <li><strong>Email:</strong> anthony@homefieldhub.com</li>
          <li><strong>Website:</strong> drsqueegeeclt.com</li>
        </ul>
      </main>

      <footer className="bg-slate-900 text-white py-6 px-4 mt-12">
        <div className="max-w-3xl mx-auto text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Dr. Squeegee House Washing. All rights reserved.</p>
          <div className="mt-2">
            <Link href="/crm/privacy" className="hover:text-white">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
