# google-auth-callback

Google OAuth 2.0 callback handler. Receives the redirect from Google after the user authorizes access.

## Deploy with --no-verify-jwt

Google redirects to this URL **without** an `Authorization` header. Deploy with:

```bash
npx supabase functions deploy google-auth-callback --no-verify-jwt
```

Otherwise you will get **401 Unauthorized** when Google tries to return the user.

## State parameter

The OAuth `state` parameter carries:
- `origin`: App URL for redirect back (e.g. `https://myapp.com`)
- `business_id`: `settings.id` to update in `business_settings`

Format: `base64(JSON.stringify({ origin, business_id }))`

## Required Supabase Secrets

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
