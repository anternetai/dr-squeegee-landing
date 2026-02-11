const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const currencyFormatterCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
})

export function formatDate(date: string | Date) {
  return dateFormatter.format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return dateTimeFormatter.format(new Date(date))
}

export function formatCurrency(amount: number, showCents = false) {
  return showCents
    ? currencyFormatterCents.format(amount)
    : currencyFormatter.format(amount)
}

export function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const area = cleaned.slice(1, 4)
    const mid = cleaned.slice(4, 7)
    const last = cleaned.slice(7)
    return `(${area}) ${mid}-${last}`
  }
  if (cleaned.length === 10) {
    const area = cleaned.slice(0, 3)
    const mid = cleaned.slice(3, 6)
    const last = cleaned.slice(6)
    return `(${area}) ${mid}-${last}`
  }
  return phone
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function getRelativeTime(date: string | Date) {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = then - now
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHr = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHr / 24)

  if (Math.abs(diffMin) < 1) return "just now"
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute")
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour")
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day")
  return formatDate(date)
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

export function googleVoiceUrl(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^1/, "")
  return `https://voice.google.com/u/0/calls?a=nc,%2B1${digits}`
}

function isMobileDevice() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(pointer: coarse)").matches
}

export function handleCall(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^1/, "")
  if (isMobileDevice()) {
    window.location.href = `tel:+1${digits}`
  } else {
    window.open(
      googleVoiceUrl(phone),
      "gv-call",
      "width=420,height=640,menubar=no,toolbar=no"
    )
  }
}
