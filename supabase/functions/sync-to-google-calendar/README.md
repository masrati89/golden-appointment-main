# sync-to-google-calendar

Creates a Google Calendar event for every new booking. Uses **Google Service Account** credentials stored in Supabase Secrets.

## 1. Supabase Secrets (from your JSON key file)

From your Service Account JSON (e.g. `devweb-calendar-5f5073ff0980.json`):

- `client_email` → set as **GOOGLE_SERVICE_ACCOUNT_EMAIL**
- `private_key` → set as **GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY** (keep the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`; newlines can be stored as `\n` or real newlines)

### Option A: Supabase Dashboard

1. Open your project → **Project Settings** → **Edge Functions** → **Secrets**.
2. Add:
   - **GOOGLE_SERVICE_ACCOUNT_EMAIL** = value of `client_email` from the JSON.
   - **GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY** = value of `private_key` from the JSON (paste the whole key; if you paste multi-line, it will work; otherwise use `\n` for newlines).

### Option B: Supabase CLI (from JSON file)

From the project root, run (replace the path with your JSON key path):

**PowerShell (Windows):**
```powershell
$json = Get-Content "C:\Users\10\Downloads\devweb-calendar-5f5073ff0980.json" -Raw | ConvertFrom-Json
$email = $json.client_email
$key = $json.private_key -replace "`n", "\n"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=$email
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=$key
```

**Bash (Mac/Linux):**
```bash
EMAIL=$(jq -r '.client_email' /path/to/your-key.json)
KEY=$(jq -r '.private_key' /path/to/your-key.json)
supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="$EMAIL"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$KEY"
```

**Important:** Do not commit the JSON file to git. Add it to `.gitignore`.

## 2. Google Calendar setup

1. **Share your calendar with the Service Account**
   - Open [Google Calendar](https://calendar.google.com).
   - Find the calendar you want events to appear in (or use your primary).
   - **Settings** → that calendar → **Share with specific people**.
   - Add the **Service Account email** (same as `client_email` from the JSON).
   - Give it **“Make changes to events”**.
   - Save.

2. **Admin email in app**
   - In **Admin Dashboard** → **Settings**, set **“אימייל ללוח שנה (Google Calendar Sync)”** to the **same Google account email** that owns the calendar you shared (e.g. `you@gmail.com`).

## 3. Database webhook

Trigger the function on every new booking:

1. **Supabase Dashboard** → **Database** → **Webhooks** → **Create**.
2. **Table:** `bookings`
3. **Events:** `INSERT`
4. **URL:** `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/sync-to-google-calendar`
5. **HTTP method:** POST  
6. **Headers:**
   - `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`
   - `Content-Type`: `application/json`
7. **Body (optional, for custom payload):**  
   You can leave default (sends the new row as `record`) or use a body that includes `record` with the new booking so the function receives `payload.record.id` and other fields.

After this, every new row in `bookings` will call the Edge Function and create an event in the admin’s Google Calendar using the Service Account credentials stored in Supabase Secrets.
