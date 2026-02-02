"use client"

import { RoofingDemoForm } from "@/components/RoofingDemoForm"
import { Shield, Clock, Star, Award } from "lucide-react"

export default function RoofingDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs - sky/blue theme for roofing */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <span className="text-white font-semibold text-lg block leading-tight">Hill Country Premier Roofing</span>
              <span className="text-sky-400 text-xs">Veteran-Owned</span>
            </div>
          </div>
          <a
            href="tel:8306887250"
            className="text-gray-400 text-sm hidden sm:flex items-center gap-2 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            (830) 688-7250
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">

          {/* Left Column - Copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Free Inspection
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Protect Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-500">
                  Texas Hill Country
                </span>
                Home
              </h1>
              <p className="text-xl text-gray-400 max-w-lg">
                Get a free, no-obligation roof inspection from the Hill Country&apos;s trusted
                veteran-owned roofing experts. We&apos;ll call you within 60 seconds.
              </p>
            </div>

            {/* Value Props */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Veteran-Owned & Operated</h3>
                  <p className="text-gray-400 text-sm">Marcus and Chelsea bring military-grade integrity to every job. Honest assessments, no surprises.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Metal Roofing Specialists</h3>
                  <p className="text-gray-400 text-sm">Built for Texas weather. Metal roofs last 50+ years, handle storms better, and save on energy.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">13+ Years Local Experience</h3>
                  <p className="text-gray-400 text-sm">Serving Kerrville, San Antonio, and the surrounding Hill Country since day one.</p>
                </div>
              </div>
            </div>

            {/* Trust Section */}
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-400">
                  Trusted by homeowners across the Hill Country
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-sky-500/20 to-sky-600/20 rounded-3xl blur-2xl opacity-50" />

            {/* Form Card */}
            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Free Roof Inspection</h2>
                <p className="text-gray-400 text-sm">
                  We&apos;ll call you in under 60 seconds to schedule
                </p>
              </div>

              <RoofingDemoForm />
            </div>

            {/* Trust badges below form */}
            <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 text-xs">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Licensed & Insured
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Same-Week Service
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Hill Country Premier Roofing. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>Pipe Creek, TX</span>
            <span>&bull;</span>
            <a href="mailto:admin@hillcountrypremierroofing.com" className="hover:text-white transition-colors">
              admin@hillcountrypremierroofing.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
