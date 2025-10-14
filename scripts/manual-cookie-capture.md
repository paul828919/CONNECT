# Manual Cookie Capture Instructions

Since automated approaches are failing due to OAuth being disabled, let's manually capture your session:

## Step 1: Open Chrome DevTools
1. Open Chrome browser
2. Go to https://connectplt.kr (make sure you're logged in)
3. Press `Cmd + Option + I` to open DevTools
4. Click the "Application" tab
5. In the left sidebar, expand "Cookies"
6. Click on "https://connectplt.kr"

## Step 2: Find NextAuth Session Cookie
Look for a cookie named one of these:
- `next-auth.session-token`
- `__Secure-next-auth.session-token`
- `next-auth.csrf-token`

## Step 3: Copy Cookie Values
For EACH cookie you find related to `next-auth`, note:
- Name
- Value
- Domain
- Path
- Expires / Max-Age
- Secure
- HttpOnly
- SameSite

## Step 4: Share Cookie Info
Once you have the cookies, I'll create the `.playwright/paul-auth.json` file manually with the correct format.

The file format looks like:
```json
{
  "cookies": [
    {
      "name": "next-auth.session-token",
      "value": "YOUR_TOKEN_VALUE_HERE",
      "domain": ".connectplt.kr",
      "path": "/",
      "expires": 1234567890,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": []
}
```

Please share a screenshot of your DevTools Cookies panel (blur sensitive values if needed, I just need the structure).
