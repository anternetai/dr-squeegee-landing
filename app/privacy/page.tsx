import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | HomeField Hub",
  description: "HomeField Hub privacy policy - how we collect, use, and protect your information.",
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">&larr; Back to Home</Link>
          <h1 className="text-3xl font-bold mt-2">Privacy Policy</h1>
          <p className="text-slate-400 mt-1">Last updated: February 5, 2025</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-slate">
        <h2>Introduction</h2>
        <p>
          HomeField Hub (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates on behalf of home service
          contractors to connect them with potential customers. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you interact with our services, including
          through third-party advertising platforms, our website (homefieldhub.com), and text message (SMS)
          communications.
        </p>

        <h2>Information We Collect</h2>
        <p>We may collect the following personal information:</p>
        <ul>
          <li><strong>Contact Information:</strong> Name, phone number, email address</li>
          <li><strong>Service Details:</strong> Type of home service requested, property address, project details</li>
          <li><strong>Lead Form Data:</strong> Information you provide through Meta (Facebook/Instagram) Lead Forms or other advertising platform forms</li>
          <li><strong>Communication Records:</strong> Records of text messages, phone calls, and other communications between you and our team or automated systems</li>
          <li><strong>Device &amp; Usage Data:</strong> Browser type, IP address, and website interaction data collected via cookies and analytics tools</li>
        </ul>

        <h2>How We Collect Your Information</h2>
        <p>We collect information through:</p>
        <ul>
          <li><strong>Meta (Facebook/Instagram) Lead Forms:</strong> When you respond to an advertisement on Facebook or Instagram and submit a lead form, your information is shared with us to facilitate the service you requested.</li>
          <li><strong>Our Website:</strong> When you fill out a contact or quote request form on homefieldhub.com or any of our client landing pages.</li>
          <li><strong>Phone &amp; SMS:</strong> When you call us, text us, or respond to our text messages.</li>
          <li><strong>Third-Party Advertising Platforms:</strong> Through paid advertising campaigns on social media and search platforms.</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Connect you with a qualified home service contractor in your area</li>
          <li>Send you text messages (SMS) related to your service inquiry, appointment scheduling, and follow-ups</li>
          <li>Make phone calls to discuss your project and schedule appointments</li>
          <li>Improve our services and advertising effectiveness</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>Text Messaging (SMS) Policy</h2>
        <p>
          By submitting your phone number through a Meta Lead Form, our website, or by texting us directly,
          you consent to receive text messages from us or on behalf of our home service contractor partners
          related to your inquiry. This may include:
        </p>
        <ul>
          <li>Appointment confirmations and reminders</li>
          <li>Follow-up messages regarding your service request</li>
          <li>Responses to your questions</li>
        </ul>
        <p>
          <strong>Message frequency varies.</strong> Message and data rates may apply. You can opt out at
          any time by replying <strong>STOP</strong> to any text message. Reply <strong>HELP</strong> for
          assistance.
        </p>
        <p>
          We do not send marketing text messages without your prior express consent. Text messages are
          limited to the service inquiry you initiated.
        </p>

        <h2>Sharing Your Information</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Home Service Contractors:</strong> The contractor(s) relevant to your service request in your area</li>
          <li><strong>Service Providers:</strong> Third-party tools we use to facilitate communications (e.g., SMS platforms, CRM systems)</li>
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
          <li>Opt out of email communications by using the unsubscribe link</li>
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
