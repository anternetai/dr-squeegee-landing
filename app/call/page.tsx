"use client";

import { useState } from "react";

export default function PreCallPage() {
  const [calendarAdded, setCalendarAdded] = useState(false);

  // Replace with your actual Loom video ID
  const LOOM_VIDEO_ID = "YOUR_LOOM_VIDEO_ID_HERE";

  // Replace with actual meeting details
  const MEETING_TITLE = "HomeField Hub Strategy Call";
  const MEETING_DURATION_MINUTES = 15;

  const handleAddToCalendar = () => {
    // This will be populated with actual meeting details
    // For now, show confirmation
    setCalendarAdded(true);
  };

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

        {/* Video Embed */}
        <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden mb-8 border border-zinc-800">
          {LOOM_VIDEO_ID === "YOUR_LOOM_VIDEO_ID_HERE" ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-lg mb-2">Video Placeholder</p>
                <p className="text-sm">Replace LOOM_VIDEO_ID in code with your actual Loom video ID</p>
              </div>
            </div>
          ) : (
            <iframe
              src={`https://www.loom.com/embed/${LOOM_VIDEO_ID}`}
              frameBorder="0"
              allowFullScreen
              className="w-full h-full"
            />
          )}
        </div>

        {/* Action Section */}
        <div className="bg-zinc-900 rounded-xl p-6 md:p-8 border border-zinc-800 text-center">
          <h3 className="text-xl font-semibold mb-3">
            Your Call is Confirmed
          </h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Watch the video above so we can hit the ground running. Add this call to your calendar so you don't miss it.
          </p>

          {!calendarAdded ? (
            <button
              onClick={handleAddToCalendar}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add to Calendar
            </button>
          ) : (
            <div className="bg-green-500/20 text-green-400 py-3 px-6 rounded-lg inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Added to Calendar
            </div>
          )}

          {/* Meeting Details */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 mb-1">Duration</p>
                <p className="font-medium">15 Minutes</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">Platform</p>
                <p className="font-medium">Google Meet</p>
              </div>
              <div>
                <p className="text-zinc-500 mb-1">What to Expect</p>
                <p className="font-medium">Strategy Discussion</p>
              </div>
            </div>
          </div>
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
