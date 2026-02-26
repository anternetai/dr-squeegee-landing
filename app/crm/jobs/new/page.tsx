import { NewJobForm } from "@/components/squeegee/new-job-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewJobPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/crm/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold">New Job</h1>
        <p className="text-sm text-muted-foreground">Add a new client and service job.</p>
      </div>
      <NewJobForm />
    </div>
  )
}
