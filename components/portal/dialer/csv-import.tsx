"use client"

import { useState, useCallback, useRef } from "react"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import type { ImportResult } from "@/lib/dialer/types"

// Common CSV column name mappings
const COLUMN_MAPS: Record<string, string> = {
  // State
  state: "state",
  st: "state",
  "state code": "state",
  // Business Name
  "business name": "business_name",
  business: "business_name",
  company: "business_name",
  "company name": "business_name",
  // Phone
  phone: "phone_number",
  "phone number": "phone_number",
  "phone #": "phone_number",
  telephone: "phone_number",
  mobile: "phone_number",
  cell: "phone_number",
  // Owner Name
  "owner name": "owner_name",
  owner: "owner_name",
  contact: "owner_name",
  "contact name": "owner_name",
  name: "owner_name",
  // First Name
  "first name": "first_name",
  first: "first_name",
  firstname: "first_name",
  fname: "first_name",
  // Website
  website: "website",
  url: "website",
  "profile link": "website",
  link: "website",
  site: "website",
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  // Parse header
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every((v) => !v.trim())) continue
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || ""
    }
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function mapColumns(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLowerCase().trim()
    const mappedKey = COLUMN_MAPS[normalized]
    if (mappedKey && value) {
      mapped[mappedKey] = value
    }
  }
  return mapped
}

export function CSVImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    const text = await selectedFile.text()
    const rows = parseCSV(text)
    const mapped = rows.map(mapColumns).filter((r) => r.phone_number)
    setPreview(mapped.slice(0, 5))
  }, [])

  const handleImport = useCallback(async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const rows = parseCSV(text)
      const leads = rows.map(mapColumns).filter((r) => r.phone_number)

      const res = await fetch("/api/portal/dialer/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads,
          batchName: file.name,
        }),
      })

      if (!res.ok) throw new Error("Import failed")

      const data: ImportResult = await res.json()
      setResult(data)
      onImportComplete?.()
    } catch (e) {
      console.error("Import error:", e)
      setResult({ imported: 0, duplicates: 0, updated: 0, errors: ["Import failed. Please try again."] })
    } finally {
      setImporting(false)
    }
  }, [file, onImportComplete])

  const resetDialog = useCallback(() => {
    setFile(null)
    setPreview([])
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="size-4" />
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-orange-500" />
            Import Leads from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-orange-500/50 hover:bg-orange-500/5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {file ? file.name : "Click to upload CSV file"}
            </p>
            <p className="text-xs text-muted-foreground">
              Columns: State, Business Name, Phone Number, Owner Name, First Name, Website
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Preview (first {preview.length} leads with phone numbers):
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {preview.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50"
                  >
                    <span className="w-6 text-center text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">
                      {row.business_name || "—"}
                    </span>
                    <span className="text-muted-foreground">{row.owner_name || row.first_name || "—"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {row.state || "—"}
                    </Badge>
                    <span className="tabular-nums text-muted-foreground">
                      {row.phone_number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <Card className={result.imported > 0 ? "border-emerald-500/40" : "border-amber-500/40"}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  {result.imported > 0 ? (
                    <CheckCircle2 className="mt-0.5 size-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="mt-0.5 size-5 text-amber-500" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">Import Complete</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-emerald-500">
                        {result.imported} new leads
                      </Badge>
                      <Badge variant="outline" className="text-muted-foreground">
                        {result.duplicates} duplicates skipped
                      </Badge>
                      {result.updated > 0 && (
                        <Badge variant="outline" className="text-blue-500">
                          {result.updated} updated
                        </Badge>
                      )}
                    </div>
                    {result.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {result.errors.slice(0, 3).map((err, i) => (
                          <p key={i} className="text-xs text-red-500">
                            {err}
                          </p>
                        ))}
                        {result.errors.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            ...and {result.errors.length - 3} more errors
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              {result ? "Done" : "Cancel"}
            </Button>
          </DialogClose>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Import Leads
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
