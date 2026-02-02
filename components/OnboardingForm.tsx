"use client"

import { useState, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload, X } from "lucide-react"

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Mexico",
] as const

const TIME_ZONES = [
  "Eastern Time (ET)",
  "Central Time (CT)",
  "Mountain Time (MT)",
  "Pacific Time (PT)",
  "Alaska Time (AKT)",
  "Hawaii Time (HT)",
] as const

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  legalBusinessName: z.string().min(1, "Legal business name is required"),
  businessEin: z.string().optional(),
  workingHours: z.string().min(1, "Working hours is required"),
  businessPhone: z.string().min(1, "Business phone is required"),
  streetAddress: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  websiteUrl: z.string().min(1, "Website address is required"),
  cellPhoneForNotifications: z.string().min(1, "Cell phone is required"),
  emailForNotifications: z.string().email("Valid email is required"),
  businessEmailForLeads: z.string().email("Valid email is required"),
  advertisingArea: z.string().min(1, "Advertising area is required"),
  timeZone: z.string().min(1, "Time zone is required"),
  imageSharingUrl: z.string().optional(),
  onboardingCallBooked: z.enum(["Yes", "No"], { message: "Please select an option" }),
  questions: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export function OnboardingForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState("")

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "United States",
      onboardingCallBooked: undefined,
    },
  })

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setImageUrl("")
    }
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadedFile(file)
      setImageUrl("")
    }
  }, [])

  const removeFile = useCallback(() => {
    setUploadedFile(null)
  }, [])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      // If we have an uploaded file, we'd upload to Supabase Storage here
      // For now, just use the URL field or uploaded file name
      const imageSharingValue = imageUrl || (uploadedFile ? `uploaded:${uploadedFile.name}` : "")

      const response = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          imageSharingUrl: imageSharingValue,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit form")
      }

      router.push("/onboard/thank-you")
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("There was an error submitting the form. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"
  const requiredClass = "text-red-500 ml-0.5"
  const inputClass = "h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
  const errorClass = "text-sm text-red-500 mt-1"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Row 1: First Name, Last Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First Name<span className={requiredClass}>*</span>
          </label>
          <Input
            id="firstName"
            placeholder="Enter text"
            {...register("firstName")}
            className={inputClass}
          />
          {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last Name<span className={requiredClass}>*</span>
          </label>
          <Input
            id="lastName"
            placeholder="Enter text"
            {...register("lastName")}
            className={inputClass}
          />
          {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Row 2: Legal Business Name, Business EIN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="legalBusinessName" className={labelClass}>
            Legal Business Name<span className={requiredClass}>*</span>
          </label>
          <Input
            id="legalBusinessName"
            placeholder="Enter text"
            {...register("legalBusinessName")}
            className={inputClass}
          />
          {errors.legalBusinessName && <p className={errorClass}>{errors.legalBusinessName.message}</p>}
        </div>

        <div>
          <label htmlFor="businessEin" className={labelClass}>
            Business EIN / Tax ID <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Input
            id="businessEin"
            placeholder="XX-XXXXXXX"
            {...register("businessEin")}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 3: Working Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="workingHours" className={labelClass}>
            Working Hours<span className={requiredClass}>*</span>
          </label>
          <Input
            id="workingHours"
            placeholder="Enter text"
            {...register("workingHours")}
            className={inputClass}
          />
          {errors.workingHours && <p className={errorClass}>{errors.workingHours.message}</p>}
        </div>
      </div>

      {/* Row 3: Business Phone, Street Address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="businessPhone" className={labelClass}>
            Business Phone #<span className={requiredClass}>*</span>
          </label>
          <Controller
            name="businessPhone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                defaultCountry="US"
                international
                countryCallingCodeEditable={false}
                placeholder="Enter phone"
                className="phone-input-light"
              />
            )}
          />
          {errors.businessPhone && <p className={errorClass}>{errors.businessPhone.message}</p>}
        </div>

        <div>
          <label htmlFor="streetAddress" className={labelClass}>
            Street Address<span className={requiredClass}>*</span>
          </label>
          <Input
            id="streetAddress"
            placeholder="Enter text"
            {...register("streetAddress")}
            className={inputClass}
          />
          {errors.streetAddress && <p className={errorClass}>{errors.streetAddress.message}</p>}
        </div>
      </div>

      {/* Row 4: City, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="city" className={labelClass}>
            City Name<span className={requiredClass}>*</span>
          </label>
          <Input
            id="city"
            placeholder="Enter text"
            {...register("city")}
            className={inputClass}
          />
          {errors.city && <p className={errorClass}>{errors.city.message}</p>}
        </div>

        <div>
          <label htmlFor="postalCode" className={labelClass}>
            Postal code<span className={requiredClass}>*</span>
          </label>
          <Input
            id="postalCode"
            placeholder="Enter text"
            {...register("postalCode")}
            className={inputClass}
          />
          {errors.postalCode && <p className={errorClass}>{errors.postalCode.message}</p>}
        </div>
      </div>

      {/* Row 5: State, Country */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="state" className={labelClass}>
            State<span className={requiredClass}>*</span>
          </label>
          <Input
            id="state"
            placeholder="Enter text"
            {...register("state")}
            className={inputClass}
          />
          {errors.state && <p className={errorClass}>{errors.state.message}</p>}
        </div>

        <div>
          <label htmlFor="country" className={labelClass}>
            Country<span className={requiredClass}>*</span>
          </label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-11 w-full bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.country && <p className={errorClass}>{errors.country.message}</p>}
        </div>
      </div>

      {/* Row 6: Website, Cell Phone for Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="websiteUrl" className={labelClass}>
            Website Address (Put NA.com if you do not have a website)<span className={requiredClass}>*</span>
          </label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="Enter URL"
            {...register("websiteUrl")}
            className={inputClass}
          />
          {errors.websiteUrl && <p className={errorClass}>{errors.websiteUrl.message}</p>}
        </div>

        <div>
          <label htmlFor="cellPhoneForNotifications" className={labelClass}>
            Preferred Cell Phone # to receive Lead Notifications from us<span className={requiredClass}>*</span>
          </label>
          <Controller
            name="cellPhoneForNotifications"
            control={control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                defaultCountry="US"
                international
                countryCallingCodeEditable={false}
                placeholder="Enter phone"
                className="phone-input-light"
              />
            )}
          />
          {errors.cellPhoneForNotifications && <p className={errorClass}>{errors.cellPhoneForNotifications.message}</p>}
        </div>
      </div>

      {/* Row 7: Email for Notifications, Business Email for Leads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="emailForNotifications" className={labelClass}>
            Preferred Email Address to receive Lead Notifications from us<span className={requiredClass}>*</span>
          </label>
          <Input
            id="emailForNotifications"
            type="email"
            placeholder="Enter email"
            {...register("emailForNotifications")}
            className={inputClass}
          />
          {errors.emailForNotifications && <p className={errorClass}>{errors.emailForNotifications.message}</p>}
        </div>

        <div>
          <label htmlFor="businessEmailForLeads" className={labelClass}>
            Business Email you want to use to Communicate with Prospects (Leads)<span className={requiredClass}>*</span>
          </label>
          <Input
            id="businessEmailForLeads"
            type="email"
            placeholder="Enter email"
            {...register("businessEmailForLeads")}
            className={inputClass}
          />
          {errors.businessEmailForLeads && <p className={errorClass}>{errors.businessEmailForLeads.message}</p>}
        </div>
      </div>

      {/* Row 8: Advertising Area, Time Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="advertisingArea" className={labelClass}>
            What area do you want us to advertise in? (Provide location &amp; mile radius or a list of zip codes).<span className={requiredClass}>*</span>
          </label>
          <Input
            id="advertisingArea"
            placeholder="Enter text"
            {...register("advertisingArea")}
            className={inputClass}
          />
          {errors.advertisingArea && <p className={errorClass}>{errors.advertisingArea.message}</p>}
        </div>

        <div>
          <label htmlFor="timeZone" className={labelClass}>
            Time Zone<span className={requiredClass}>*</span>
          </label>
          <Controller
            name="timeZone"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-11 w-full bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {TIME_ZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.timeZone && <p className={errorClass}>{errors.timeZone.message}</p>}
        </div>
      </div>

      {/* Row 9: Onboarding Call Booked, Image Sharing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="onboardingCallBooked" className={labelClass}>
            Have you booked your onboarding call with us?<span className={requiredClass}>*</span>
          </label>
          <Controller
            name="onboardingCallBooked"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-11 w-full bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.onboardingCallBooked && <p className={errorClass}>{errors.onboardingCallBooked.message}</p>}
        </div>

        <div>
          <label className={labelClass}>
            IMAGE SHARING *IMPORTANT* - Upload pictures/google form of you smiling on the job or with clients, logos, etc.<span className={requiredClass}>*</span>
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            {uploadedFile ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700 truncate">{uploadedFile.name}</span>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Drop your files here to{" "}
                  <label className="text-purple-600 cursor-pointer hover:underline">
                    upload
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </p>
              </>
            )}
          </div>
          <div className="mt-2">
            <Input
              placeholder="Or paste a Google Drive / Dropbox link"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                if (e.target.value) setUploadedFile(null)
              }}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Row 10: Questions */}
      <div>
        <label htmlFor="questions" className={labelClass}>
          Any questions?
        </label>
        <textarea
          id="questions"
          placeholder="Enter text"
          {...register("questions")}
          className="w-full h-24 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20 focus:outline-none focus:ring-2 resize-none"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-lg shadow-lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  )
}
