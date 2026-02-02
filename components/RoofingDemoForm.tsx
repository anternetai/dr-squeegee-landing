"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, ArrowLeft, Loader2, Phone, Home, User, CloudRain, Droplets, Clock, Shield, Building, Search } from "lucide-react"

const ROOFING_CONCERNS = [
  { value: "storm_damage", label: "Storm / Hail Damage", icon: CloudRain, description: "Recent weather damage" },
  { value: "leak", label: "Leak or Water Damage", icon: Droplets, description: "Water getting in" },
  { value: "age", label: "Roof Is Getting Old", icon: Clock, description: "Time for replacement" },
  { value: "insurance", label: "Insurance Claim Help", icon: Shield, description: "Need documentation" },
  { value: "selling", label: "Selling My Home", icon: Building, description: "Pre-sale inspection" },
  { value: "checkup", label: "Just Want It Checked", icon: Search, description: "Peace of mind" },
]

const formSchema = z.object({
  address: z.string().min(5, "Please enter your address"),
  name: z.string().min(2, "Please enter your name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  roofingConcern: z.string().min(1, "Please select what brought you here"),
})

type FormData = z.infer<typeof formSchema>

interface RoofingDemoFormProps {
  onSubmitSuccess?: (data: FormData) => void
}

export function RoofingDemoForm({ onSubmitSuccess }: RoofingDemoFormProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
      name: "",
      phone: "",
      email: "",
      roofingConcern: "",
    },
  })

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const watchedConcern = watch("roofingConcern")

  const stepTitles = [
    "Property Address",
    "Contact Info",
    "Roof Concern"
  ]

  const nextStep = async () => {
    let fieldsToValidate: (keyof FormData)[] = []

    if (step === 1) fieldsToValidate = ["address"]
    if (step === 2) fieldsToValidate = ["name", "phone"]
    if (step === 3) fieldsToValidate = ["roofingConcern"]

    const isValid = await trigger(fieldsToValidate)
    if (isValid && step < totalSteps) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      // Save to Supabase
      const { error } = await supabase.from("roofing_demo_leads").insert({
        address: data.address,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        roofing_concern: data.roofingConcern,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Supabase error:", error)
        // Continue anyway for demo purposes
      }

      // Trigger VAPI call for roofing
      try {
        const vapiResponse = await fetch('/api/trigger-roofing-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: data.phone,
            name: data.name,
            address: data.address,
            roofingConcern: data.roofingConcern,
          })
        })

        if (!vapiResponse.ok) {
          console.log("VAPI trigger pending setup")
        }
      } catch (vapiError) {
        console.log("VAPI call will be configured")
      }

      setIsSuccess(true)
      onSubmitSuccess?.(data)
    } catch (error) {
      console.error("Error submitting:", error)
      // Still show success for demo
      setIsSuccess(true)
      onSubmitSuccess?.(getValues())
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 mb-6 shadow-lg shadow-sky-500/30">
          <Phone className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-3">
          Calling You Now!
        </h3>
        <p className="text-gray-400 text-lg mb-6">
          Pick up your phone - Sarah from Hill Country Premier Roofing is calling to schedule your free inspection.
        </p>
        <div className="inline-flex items-center gap-2 text-sky-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting...
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Step {step} of {totalSteps}</span>
          <span className="text-sky-400 font-medium">{stepTitles[step - 1]}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex justify-between px-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i + 1 <= step
                  ? 'bg-sky-500 scale-110'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <div className="min-h-[280px]">

        {/* Step 1: Address */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <Home className="w-8 h-8 text-sky-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white mb-2">Property Address</h2>
              <p className="text-gray-400 text-sm">Where is the roof you need inspected?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-2">
                  Street Address
                </label>
                <Input
                  id="address"
                  placeholder="123 Main Street, Kerrville, TX 78028"
                  {...register("address")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-sky-500 focus:ring-sky-500/20"
                  autoComplete="street-address"
                />
                {errors.address && (
                  <p className="text-sm text-red-400 mt-2">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <User className="w-8 h-8 text-sky-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-white mb-2">Contact Info</h2>
              <p className="text-gray-400 text-sm">How can we reach you?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">
                  Your Name
                </label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  {...register("name")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-sky-500"
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-sm text-red-400 mt-2">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(830) 555-1234"
                  {...register("phone")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-sky-500"
                  autoComplete="tel"
                />
                {errors.phone && (
                  <p className="text-sm text-red-400 mt-2">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
                  Email <span className="text-gray-500">(optional)</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                  className="h-14 text-base bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-sky-500"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-400 mt-2">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Roofing Concern */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">What brings you to us?</h2>
              <p className="text-gray-400 text-sm">Select the main reason for your inspection</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ROOFING_CONCERNS.map((concern) => {
                const IconComponent = concern.icon
                return (
                  <button
                    key={concern.value}
                    type="button"
                    onClick={() => setValue("roofingConcern", concern.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      watchedConcern === concern.value
                        ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 mb-2 ${
                      watchedConcern === concern.value ? 'text-sky-400' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium block ${
                      watchedConcern === concern.value ? 'text-sky-400' : 'text-gray-300'
                    }`}>
                      {concern.label}
                    </span>
                    <span className="text-xs text-gray-500 block mt-1">
                      {concern.description}
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.roofingConcern && (
              <p className="text-sm text-red-400 text-center">{errors.roofingConcern.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            className="flex-1 h-14 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            type="button"
            onClick={nextStep}
            className="flex-1 h-14 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold shadow-lg shadow-sky-500/25"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-14 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold shadow-lg shadow-sky-500/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5 mr-2" />
                Schedule Free Inspection
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-gray-500">
        We&apos;ll call you within 60 seconds to schedule your free roof inspection.
      </p>
    </form>
  )
}
