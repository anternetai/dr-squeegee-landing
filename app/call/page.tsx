"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type FormData = {
  hasScheduled: boolean | null;
  // For already scheduled
  name: string;
  email: string;
  // For new leads
  businessName: string;
  serviceType: string;
  serviceArea: string;
  currentLeads: string;
  phone: string;
};

function PreCallContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0); // 0 = initial choice, 1-4 = form steps
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    hasScheduled: null,
    name: "",
    email: "",
    businessName: "",
    serviceType: "",
    serviceArea: "",
    currentLeads: "",
    phone: "",
  });

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduledYes = () => {
    updateForm("hasScheduled", true);
    setStep(1);
  };

  const handleScheduledNo = () => {
    updateForm("hasScheduled", false);
    setStep(1);
  };

  const submitConfirmation = async () => {
    setLoading(true);
    // Send to Supabase or webhook
    try {
      await fetch("/api/vsl-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "watched_vsl",
          name: formData.name,
          email: formData.email,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setSubmitted(true);
  };

  const submitNewLead = async () => {
    setLoading(true);
    try {
      await fetch("/api/vsl-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_lead",
          ...formData,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setSubmitted(true);
  };

  const serviceTypes = [
    "Roofing",
    "Remodeling",
    "HVAC",
    "Plumbing",
    "Electrical",
    "Landscaping",
    "Painting",
    "Other",
  ];

  const leadOptions = [
    "0-5 per month",
    "5-15 per month",
    "15-30 per month",
    "30+ per month",
  ];

  // Progress bar for multi-step form
  const totalSteps = formData.hasScheduled ? 1 : 4;
  const progress = formData.hasScheduled === null ? 0 : (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="py-6 px-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-orange-500">HomeField</span> Hub
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Pre-headline */}
        <p className="text-orange-500 font-medium text-center mb-2">
          WATCH BEFORE YOUR CALL
        </p>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          How We Fill Your Calendar With <br className="hidden md:block" />
          <span className="text-orange-500">Qualified Appointments</span>
        </h2>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Pay-Per-Appointment</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No Risk Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Home Service Specialists</span>
          </div>
        </div>

        {/* Video */}
        <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden mb-8 border border-zinc-800">
          <video
            controls
            className="w-full h-full"
            poster=""
            preload="metadata"
          >
            <source src="/vsl.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Action Section */}
        <div className="bg-zinc-900 rounded-xl p-6 md:p-8 border border-zinc-800">
          {/* Progress Bar */}
          {step > 0 && !submitted && (
            <div className="mb-6">
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Step {step} of {totalSteps}
              </p>
            </div>
          )}

          {submitted ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {formData.hasScheduled ? "See You Soon!" : "We'll Be In Touch!"}
              </h3>
              <p className="text-zinc-400">
                {formData.hasScheduled
                  ? "Thanks for watching. Looking forward to our call."
                  : "We'll reach out within 24 hours to schedule your strategy call."}
              </p>
            </div>
          ) : step === 0 ? (
            /* Initial Choice */
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3">
                Have you already scheduled a call with us?
              </h3>
              <p className="text-zinc-400 mb-6">
                Watch the video above, then let us know where you're at.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleScheduledYes}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Yes, I have a call scheduled
                </button>
                <button
                  onClick={handleScheduledNo}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors border border-zinc-700"
                >
                  No, I'd like to book one
                </button>
              </div>
            </div>
          ) : formData.hasScheduled ? (
            /* Already Scheduled - Just confirm they watched */
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2 text-center">
                Confirm You Watched
              </h3>
              <p className="text-zinc-400 mb-6 text-center text-sm">
                Drop your info so we know you're ready for the call.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                    placeholder="john@company.com"
                  />
                </div>
                <button
                  onClick={submitConfirmation}
                  disabled={!formData.name || !formData.email || loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  {loading ? "Sending..." : "I'm Ready for My Call"}
                </button>
              </div>
            </div>
          ) : (
            /* New Lead Multi-Step Form */
            <div className="max-w-md mx-auto">
              {step === 1 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    What type of business do you run?
                  </h3>
                  <p className="text-zinc-400 mb-6 text-center text-sm">
                    We specialize in home service contractors.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {serviceTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          updateForm("serviceType", type);
                          setStep(2);
                        }}
                        className={`py-3 px-4 rounded-lg border transition-colors text-left ${
                          formData.serviceType === type
                            ? "bg-orange-500 border-orange-500"
                            : "bg-zinc-800 border-zinc-700 hover:border-orange-500"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    How many leads are you getting now?
                  </h3>
                  <p className="text-zinc-400 mb-6 text-center text-sm">
                    Helps us understand where you're starting from.
                  </p>
                  <div className="space-y-3">
                    {leadOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          updateForm("currentLeads", option);
                          setStep(3);
                        }}
                        className={`w-full py-3 px-4 rounded-lg border transition-colors text-left ${
                          formData.currentLeads === option
                            ? "bg-orange-500 border-orange-500"
                            : "bg-zinc-800 border-zinc-700 hover:border-orange-500"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="mt-4 text-zinc-500 hover:text-white text-sm"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    Where do you service?
                  </h3>
                  <p className="text-zinc-400 mb-6 text-center text-sm">
                    City, metro area, or state.
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={formData.serviceArea}
                      onChange={(e) => updateForm("serviceArea", e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="e.g. Charlotte, NC metro"
                    />
                    <button
                      onClick={() => formData.serviceArea && setStep(4)}
                      disabled={!formData.serviceArea}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="mt-4 text-zinc-500 hover:text-white text-sm"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    How can we reach you?
                  </h3>
                  <p className="text-zinc-400 mb-6 text-center text-sm">
                    We'll reach out to schedule your strategy call.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Business Name</label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => updateForm("businessName", e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="ABC Roofing"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Your Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateForm("phone", e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="john@abcroofing.com"
                      />
                    </div>
                    <button
                      onClick={submitNewLead}
                      disabled={!formData.name || !formData.phone || !formData.email || loading}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
                    >
                      {loading ? "Sending..." : "Request My Strategy Call"}
                    </button>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="mt-4 text-zinc-500 hover:text-white text-sm"
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* What We'll Cover */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <div className="text-orange-500 text-2xl mb-3">1</div>
            <h4 className="font-semibold mb-2">Your Current Situation</h4>
            <p className="text-zinc-400 text-sm">We'll look at your market, current lead flow, and goals.</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <div className="text-orange-500 text-2xl mb-3">2</div>
            <h4 className="font-semibold mb-2">The System</h4>
            <p className="text-zinc-400 text-sm">How we generate and qualify leads specifically for your service area.</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg p-5 border border-zinc-800">
            <div className="text-orange-500 text-2xl mb-3">3</div>
            <h4 className="font-semibold mb-2">Next Steps</h4>
            <p className="text-zinc-400 text-sm">If it's a fit, we'll map out exactly how to get started.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-zinc-800 mt-12">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-sm">
          HomeField Hub
        </div>
      </footer>
    </div>
  );
}

export default function PreCallPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <PreCallContent />
    </Suspense>
  );
}
