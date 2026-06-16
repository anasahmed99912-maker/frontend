# Cipherline Frontend

Next.js frontend for the Cipherline end-to-end encrypted messaging application.

## Features

- Username/password registration and login
- Google OAuth sign-up and sign-in
- SignalR real-time messaging
- Browser-based ECDH P-256 key agreement
- AES-256-GCM text and image encryption
- Responsive Tailwind CSS interface

## Local Development

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://backend-production-ff9f.up.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Then run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel Deployment

Import this repository into Vercel and add these environment variables for
Production, Preview, and Development:

```env
NEXT_PUBLIC_API_BASE_URL=https://backend-production-ff9f.up.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=700968532693-ha2bq7cmhad8er8cn8u1n921lmesas2o.apps.googleusercontent.com
```

After Vercel provides the frontend domain:

1. Add that exact URL to Railway as `AllowedOrigins__1` if you use a custom domain.
2. Add the URL to Google OAuth **Authorized JavaScript origins**.
3. Redeploy Railway after changing its variables.

Do not include a trailing slash in any origin or API URL.

The deployment uses the Next.js static export in `frontend/out`, so you do not
need to set a manual Output Directory such as `public` in the Vercel project.

The backend now accepts `localhost`, `127.0.0.1`, and `*.vercel.app` origins by
rule, so preview deployments and local development do not depend on a separate
`AllowedOrigins` entry for every Vercel URL.

## Build

```powershell
npm run build
```
