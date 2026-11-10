# অনলাইন পরীক্ষা — React (Vite) + Vercel

## Local run
1. `npm install`
2. `.env.local` ফাইলে দিন: KV_REST_API_URL, KV_REST_API_TOKEN, SECRET (এবং ঐচ্ছিক WA_TOKEN, WA_PHONE_ID)
3. `npm i -g vercel` তারপর `vercel dev` → http://localhost:3000
   (শুধু `npm run dev` চালালে frontend আসবে, কিন্তু /api কাজ করবে না)

## Vercel deploy
GitHub-এ push → Vercel Import (Vite নিজে detect হবে) → Storage এ Upstash Redis Connect →
Environment Variables: SECRET, WA_TOKEN, WA_PHONE_ID, WA_TO → Redeploy

লগইন: admin → antor1010 / antor1010 | student → student09 / 123
