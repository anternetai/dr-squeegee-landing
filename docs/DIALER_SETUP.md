# Power Dialer Setup Guide

## Overview
The Power Dialer at `/portal/admin/calls` enables browser-based cold calling with:
- Twilio Voice SDK (in-browser calls)
- Timezone-aware queue (ET → CT → MT → PT cascade)
- AI-powered call transcript analysis
- Phone number rotation pool
- CSV lead import

## Required Environment Variables (Vercel + .env.local)

### Twilio (Required)
```
TWILIO_ACCOUNT_SID=<from Twilio console>
TWILIO_AUTH_TOKEN=<current auth token from Twilio console>
TWILIO_PHONE_NUMBER=<your Twilio phone number>
TWILIO_TWIML_APP_SID=<auto-created on first token request, or create manually>
```

### Twilio API Key (Recommended for production)
Create at: https://console.twilio.com/us1/account/keys
```
TWILIO_API_KEY=SK...
TWILIO_API_SECRET=...
```
If not set, falls back to ACCOUNT_SID + AUTH_TOKEN.

### App URL (Required)
```
NEXT_PUBLIC_APP_URL=https://homefieldhub.com
```
Used to construct the TwiML webhook URL.

### AI (Optional — for call transcript analysis)
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Vercel Environment Variables Checklist

Add these to Vercel project settings → Environment Variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | ✅ | **Must be current** — rotated tokens will 401 |
| `TWILIO_PHONE_NUMBER` | ✅ | +19806896919 |
| `TWILIO_TWIML_APP_SID` | ⚡ | Auto-created if missing, but set for reliability |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://homefieldhub.com` |
| `TWILIO_API_KEY` | 💡 | Recommended for production |
| `TWILIO_API_SECRET` | 💡 | Recommended for production |
| `ANTHROPIC_API_KEY` | 💡 | For AI call analysis |

## TwiML App Setup

### Automatic (Preferred)
The token route auto-creates a TwiML app if `TWILIO_TWIML_APP_SID` is not set.
It will log the SID to console — save it to env vars.

### Manual (via Twilio Console)
1. Go to https://console.twilio.com → Voice → TwiML Apps
2. Create new app:
   - Name: "HomeField Hub Power Dialer"
   - Voice URL: `https://homefieldhub.com/api/portal/dialer/twiml`
   - Method: POST
3. Copy the SID → set as `TWILIO_TWIML_APP_SID`

### Manual (via API)
```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/<ACCOUNT_SID>/Applications.json" \
  -u "<ACCOUNT_SID>:<AUTH_TOKEN>" \
  --data-urlencode "FriendlyName=HomeField Hub Power Dialer" \
  --data-urlencode "VoiceUrl=https://homefieldhub.com/api/portal/dialer/twiml" \
  --data-urlencode "VoiceMethod=POST"
```

## Database Tables
All tables are created via migration `20260218_power_dialer.sql`:
- `dialer_leads` — Lead queue (7,288 leads imported)
- `dialer_call_history` — Per-attempt history
- `dialer_phone_numbers` — Number rotation pool
- `call_transcripts` — AI transcript analysis

## Lead Import
Use the CSV Import button in the dialer UI, or the API:
```
POST /api/portal/dialer/import
Body: { "leads": [...], "batchName": "..." }
```

Expected CSV columns: State, Business Name, Phone Number, Owner Name, First Name, Website

## Troubleshooting

### "Twilio not configured" banner
- Check that `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
- The auth token may have been rotated — get current one from Twilio console

### No leads showing
- Verify `dialer_leads` table has data with status='queued'
- Check timezone — the queue filters by current ET hour timezone

### Calls not connecting
- Verify TwiML app SID is set and points to correct webhook URL
- Check Twilio console for error logs
- Ensure the Twilio phone number has Voice capability
