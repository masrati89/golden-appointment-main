# Google Calendar Sync Setup Guide

## Overview
This system automatically creates Google Calendar events for every new booking in Studio Authentic.

## Prerequisites

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Authentication Setup

You have two options:

#### Option A: Service Account (Recommended for Server-to-Server)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in details and create
4. Click on the service account > "Keys" tab
5. Click "Add Key" > "Create new key" > Choose "JSON"
6. Download the JSON file
7. Extract:
   - `client_email` → Set as `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → Set as `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
8. Share your calendar with the service account email:
   - Open Google Calendar
   - Settings > Share with specific people
   - Add the service account email with "Make changes to events" permission

#### Option B: OAuth 2.0 Refresh Token

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs
5. After creation, download credentials
6. Use OAuth 2.0 Playground to get refresh token:
   - Go to https://developers.google.com/oauthplayground/
   - Select "Google Calendar API v3"
   - Authorize and get refresh token
7. Set environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`

### 3. Supabase Secrets (from your Service Account JSON)

**Never commit the JSON key file.** Add it to `.gitignore`.

From your JSON key file (e.g. `devweb-calendar-5f5073ff0980.json`):

1. **Supabase Dashboard** → Project **Settings** → **Edge Functions** → **Secrets**.
2. Add two secrets:
   - **GOOGLE_SERVICE_ACCOUNT_EMAIL** = copy the `client_email` value from the JSON.
   - **GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY** = copy the entire `private_key` value (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`). You can paste with real newlines, or use `\n` for line breaks.

**Using Supabase CLI (PowerShell):**
```powershell
$json = Get-Content "path\to\your-key.json" -Raw | ConvertFrom-Json
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=$($json.client_email)
# For the key, replace newlines with \n so it stays one line:
$key = $json.private_key -replace "`r?`n", "\n"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$key"
```

The Edge Function reads these secrets at runtime; the booking flow uses the **admin_calendar_email** from your **business settings** (Settings in the dashboard) to choose which calendar to add events to. That calendar must be **shared with the service account email** (see Google Calendar setup below).

### 4. Database Setup

Run the migrations:
```sql
-- Migration 20260216000003_add_calendar_sync.sql
-- Adds admin_calendar_email column and calendar_sync_logs table
```

### 5. Configure Admin Email

1. Go to Admin Dashboard > Settings
2. Find "אימייל ללוח שנה (Google Calendar Sync)"
3. Enter your Google Calendar email address
4. Save settings

### 6. Webhook Configuration

#### Method 1: Database Webhook (Recommended)

1. Go to Supabase Dashboard > Database > Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name**: `booking-calendar-sync`
   - **Table**: `bookings`
   - **Events**: `INSERT`
   - **HTTP Request**:
     - **URL**: `https://your-project.supabase.co/functions/v1/sync-to-google-calendar`
     - **Method**: `POST`
     - **Headers**:
       ```
       Authorization: Bearer YOUR_SERVICE_ROLE_KEY
       Content-Type: application/json
       ```
   - **HTTP Request Body**:
     ```json
     {
       "record": {
         "id": "{{record.id}}",
         "customer_name": "{{record.customer_name}}",
         "customer_phone": "{{record.customer_phone}}",
         "customer_email": "{{record.customer_email}}",
         "booking_date": "{{record.booking_date}}",
         "booking_time": "{{record.booking_time}}",
         "notes": "{{record.notes}}",
         "service_id": "{{record.service_id}}",
         "status": "{{record.status}}"
       }
     }
     ```

#### Method 2: Database Trigger (Alternative)

The migration `20260216000004_create_calendar_webhook.sql` creates a trigger that uses `pg_net` extension. This requires:
- `pg_net` extension enabled
- Proper configuration of `app.settings.supabase_url` and `app.settings.service_role_key`

## Testing

1. Create a test booking through the app
2. Check `calendar_sync_logs` table for sync status
3. Verify event appears in Google Calendar

## Troubleshooting

### Check Logs
```sql
SELECT * FROM calendar_sync_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Common Issues

1. **"admin_calendar_email not configured"**
   - Set the email in Admin Settings

2. **"Failed to authenticate with Google"**
   - Check environment variables are set correctly
   - Verify service account has calendar access

3. **"Google Calendar API error: 403"**
   - Ensure Calendar API is enabled
   - Check service account has proper permissions

4. **Events not appearing**
   - Check calendar_sync_logs for errors
   - Verify admin_calendar_email is correct
   - Ensure calendar is shared with service account (if using service account)

## Event Details

Each calendar event includes:
- **Title**: `[Client Name] - [Service Type]`
- **Description**: Client phone, email, notes, dashboard link
- **Time**: Based on `booking_date` and `booking_time`
- **Location**: Business address (if configured)
- **Reminders**: Email 24h before, Popup 1h before

## Security Notes

- Service account method is recommended for production
- Never commit credentials to git
- Use Supabase secrets for environment variables
- Service account should have minimal permissions (only Calendar API)
