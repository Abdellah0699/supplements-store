SUPABASE UPGRADE — APPLY INSTRUCTIONS
========================================

What this is: product image uploads now go to Supabase Storage
(persistent) when configured, instead of only local disk (which gets
wiped on free hosting). Your local dev keeps working exactly as before
— nothing changes until you add the Supabase keys.

HOW TO APPLY (2 minutes):

1. Extract this ZIP *into* your project folder:
     C:\Users\lenovo\Desktop\supplements-store-phase4
   Let it overwrite the 4 files (same folder structure inside).

2. In PowerShell, inside the backend folder, install the new package:
     cd "C:\Users\lenovo\Desktop\supplements-store-phase4\backend"
     npm install

3. Restart the backend (npm run dev). Done — local behavior unchanged.

WHAT CHANGED (for your reference):
- backend/src/controllers/admin-uploads.controller.js
    → uses Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
      are set; otherwise local disk as before.
- backend/src/config/env.js
    → reads the 3 new SUPABASE_* variables.
- backend/.env.example
    → documents the new variables.
- backend/package.json
    → adds @supabase/supabase-js dependency.

NOTHING ELSE TOUCHED: your phone number, NUTRIFORGE branding, portfolio
credit, and all fixes are untouched (those live in frontend files, which
are not in this package).

FOR DEPLOYMENT (later, per the deployment checklist):
- Create the Supabase project + public "product-images" bucket.
- On Render, set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET=product-images, and AUTH_COOKIE_SAMESITE=none.
