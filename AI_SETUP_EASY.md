# Easy AI Setup

## Why AI works local but not after Git upload

`index.html` is only frontend code.

The Gemini API key must run inside `server/server.js`.

If you upload only to GitHub Pages, GitHub Pages cannot run Node.js server code, so `/ai` will not work.

## Local setup

Open PowerShell in the project folder:

```powershell
cd D:\Year4\Web\Anzo
cd server
copy .env.example .env
notepad .env
npm install
npm start
```

Put your new key inside `server/.env`:

```env
GEMINI_API_KEY=your_new_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

Then open `index.html`.

## Online setup

You need 2 parts:

1. Host `index.html` on GitHub Pages, Netlify, or Vercel.
2. Host the `server` folder on Render, Railway, Vercel serverless, or another Node.js host.

On the server host, add this environment variable:

```env
GEMINI_API_KEY=your_new_key_here
```

After deploy, your backend URL will look like:

```text
https://your-backend-name.onrender.com
```

In `index.html`, add this before the main script if your frontend and backend are not on the same domain:

```html
<script>
  window.ANZO_AI_API_URL = 'https://your-backend-name.onrender.com/ai';
</script>
```

## Important

Do not put your Gemini API key in `index.html`.

If the key was shown in a screenshot or pushed to GitHub, delete it and create a new key.
