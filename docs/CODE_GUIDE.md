# Code Guide for Beginners

Welcome! This guide explains your review application in very simple English. It avoids deep technical jargon so you can understand exactly how your shop's app works behind the scenes.

---

## 1. THE APP IN 5 SENTENCES

1. **What it does:** This application gives local businesses a safe way to collect private feedback from unhappy customers and direct happy customers to leave public Google Reviews. 
2. **The customer:** A person visiting a local shop who scans a printed QR code on their phone.
3. **The business owner:** The person who runs the shop and manages their feedback.
4. **What the customer can do:** They can either click a button to go straight to Google to leave a review, or they can fill out a private form to send a message directly to the business.
5. **What the owner can do:** They can log into a private dashboard to read private messages, reply to customers, write private notes, and mark issues as resolved.

---

## 2. A PICTURE OF THE WHOLE SYSTEM

Here is a simple map of how the different pieces connect:

```text
  Customer Phone (Scans QR code)
          ↓
  Customer Website Pages (app/r/[slug]/page.tsx)
          ↓
  Server-Side Code (app/actions/feedback.ts)
          ↓
  Supabase Database (Stores the feedback)
          ↓
  Resend Email (Sends an alert to the owner)
          ↓
  Business Owner (Reads email, logs into app/admin/dashboard/page.tsx)
```

---

## 3. THE 4 JOURNEYS, STEP BY STEP

### a) Customer scans the QR and sees the page
1. The customer scans the QR code and their phone opens a web address like `/r/test-coffee-house`.
2. The server looks up the business name and logo in the database to build the page (**CODE-VERIFIED**: `app/r/[slug]/page.tsx`).
3. The server safely logs that a visitor viewed the page without identifying who they are.
4. The page appears on the customer's phone showing two equal buttons: one for Google, one for a private message.

### b) Customer taps "Leave a Google review"
1. The customer taps the button and goes to a special tracking link (`/r/[slug]/go`).
2. The server silently notes that a "Google Click" happened in the database (**CODE-VERIFIED**: `app/r/[slug]/go/route.ts`).
3. The server immediately forwards the customer to the shop's real Google Review page.

### c) Customer sends a private message
1. The customer types a message on the form and solves an invisible security challenge to prove they are human (**CODE-VERIFIED**: `components/FeedbackForm.tsx`).
2. The form is sent to the "back office" of the server (**CODE-VERIFIED**: `app/actions/feedback.ts`).
3. The server double-checks the security challenge with Cloudflare Turnstile.
4. The server creates a secret, unreadable fingerprint of the customer's IP address to ensure they don't send too many messages at once.
5. The server securely saves the feedback into the database.
6. The server sends an email alert to the business owner using Resend.

### d) Owner logs in and marks a message resolved
1. The owner goes to `/admin/login` and enters their email and password (**CODE-VERIFIED**: `app/admin/login/actions.ts`).
2. They are let into the dashboard where the database only shows them messages for their specific shop (**CODE-VERIFIED**: `app/admin/dashboard/page.tsx`).
3. The owner clicks a dropdown to change a message status to "Resolved".
4. The dashboard tells the database to save the new status so it is remembered for next time.

---

## 4. EVERY FILE IN ONE LINE

| File | What it does | Can I ignore this for now? |
|---|---|---|
| `app/actions/feedback.ts` | The back-office code that safely handles private messages. | no |
| `app/admin/dashboard/page.tsx` | The private owner dashboard where messages are read. | no |
| `app/admin/layout.tsx` | The shared wrapper for the admin pages. | yes |
| `app/admin/login/actions.ts` | The security code that checks owner passwords. | no |
| `app/admin/login/page.tsx` | The visual login screen. | yes |
| `app/favicon.ico` | The tiny icon in the browser tab. | yes |
| `app/globals.css` | The global styling rules (colors, fonts). | yes |
| `app/layout.tsx` | The main wrapper for the entire website. | yes |
| `app/page.tsx` | The homepage (currently unused/default). | yes |
| `app/privacy/page.tsx` | The legal privacy notice for customers. | yes |
| `app/r/[slug]/feedback/page.tsx` | The page containing the private message form. | no |
| `app/r/[slug]/go/route.ts` | The invisible page that counts Google clicks and redirects. | no |
| `app/r/[slug]/page.tsx` | The main landing page the customer sees after scanning. | no |
| `components/FeedbackForm.tsx` | The visual form where customers type their message. | no |
| `docs/QR_CARD_SPEC.md` | Instructions for printing the physical QR cards. | yes |
| `lib/client-status.ts` | Checks if a business is active or their trial expired. | no |
| `lib/site-config.ts` | Contains the global owner name and contact email. | no |
| `lib/supabase-server.ts` | The highly secure "master key" connection to the database. | no |
| `lib/supabase/client.ts` | The normal connection to the database from the browser. | yes |
| `lib/supabase/middleware.ts` | Helps keep the owner logged in as they click around. | no |
| `lib/supabase/server.ts` | The normal connection to the database from the server. | no |
| `scripts/create-user.js` | A helper script to create new owner accounts. | yes |
| `scripts/make-dump.mjs` | A helper script to backup data. | yes |
| `scripts/make-qr.mjs` | A helper script to generate the QR code images. | yes |
| `supabase/schema.sql` | The master blueprint for the database tables and security. | no |
| `supabase/migrations/*.sql` | Files that updated the database blueprint over time. | no |
| `__tests__/*.ts` | Automated robots that test the code to ensure it works. | yes |

---

## 5. WHY DOES THE CODE HAVE SO MANY CHECKS?

### Cloudflare Turnstile
1. **What it does:** Verifies that a human is submitting the form, not an automated spam robot.
2. **Analogy:** A security guard checking IDs at the door of your shop.
3. **Without it:** Robots could send you thousands of fake messages a minute, crashing your app and filling your inbox with junk.
4. **Where it is:** `app/actions/feedback.ts`

### Server Action
1. **What it does:** Runs sensitive code entirely on the server so the browser never sees the secrets.
2. **Analogy:** Doing the accounting in the back office with the door locked, rather than at the front counter.
3. **Without it:** Hackers could inspect the website code, steal your API keys, and hijack your email service.
4. **Where it is:** `app/actions/feedback.ts`

### Supabase Service-Role Key
1. **What it does:** Acts as a master password that can bypass all normal database rules.
2. **Analogy:** A master key that opens every door in the building.
3. **Without it:** The server wouldn't be able to securely insert rate-limited data or check business status behind the scenes.
4. **Where it is:** `lib/supabase-server.ts`

### Row Level Security (RLS)
1. **What it does:** Ensures that a logged-in owner can only read messages belonging to their specific shop.
2. **Analogy:** A filing cabinet where your key only opens your specific drawer, and no one else's.
3. **Without it:** A rival coffee shop owner could log in and read all of your private customer complaints.
4. **Where it is:** `supabase/schema.sql`

### Rate Limiting & IP Hashing
1. **What it does:** Counts how many times a specific internet connection submits a form, blocking them if they submit too fast. It uses a "hash" so we don't store their actual IP address.
2. **Analogy:** A bouncer who remembers faces and tells someone to "take a walk and cool off" if they keep coming in and out too fast.
3. **Without it:** A malicious person could manually submit 100 messages in a row, bypassing Turnstile because they are a real human.
4. **Where it is:** `app/actions/feedback.ts` and `supabase/migrations/002_rate_limit.sql`

### Client Status Checks
1. **What it does:** Checks if the shop has paid their bill or if their trial is over.
2. **Analogy:** Checking if a membership card is expired before letting someone into the gym.
3. **Without it:** Shops could stop paying but continue using the QR codes forever for free.
4. **Where it is:** `lib/client-status.ts`

### Retention/Deletion (pg_cron)
1. **What it does:** Automatically deletes customer messages after 18 months.
2. **Analogy:** A shredder that automatically destroys old paperwork so you don't hoard dangerous amounts of customer data.
3. **Without it:** You would hold customer data forever, increasing your legal risk if you are ever hacked.
4. **Where it is:** `supabase/schema.sql` (Note: Currently NOT VERIFIED as enabled in production).

---

## 6. THE 10 LINES THAT MATTER MOST

**1. Verifying the Business is Active**
- **File:** `app/r/[slug]/page.tsx` (Lines 19-20)
- **Code:**
  ```typescript
  if (error || !isClientActive(client)) {
    return (
  ```
- **Why it matters:** This ensures the landing page completely shuts down if the business owner hasn't paid their bill. It stops unauthorized use immediately.

**2. Turnstile Spam Protection**
- **File:** `app/actions/feedback.ts` (Lines 48-49)
- **Code:**
  ```typescript
  const verifyRes = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  ```
- **Why it matters:** This is the exact moment the server asks Cloudflare "Is this a real human?". It blocks automated bots from submitting fake feedback.

**3. IP Hashing for Privacy**
- **File:** `app/actions/feedback.ts` (Line 101)
- **Code:**
  ```typescript
  const ipHash = crypto.createHmac("sha256", rateLimitSecret).update(ip).digest("hex");
  ```
- **Why it matters:** It disguises the customer's IP address into an unrecognizable string of characters. This protects their privacy while still letting us stop them from spamming.

**4. The Rate Limit Database Call**
- **File:** `app/actions/feedback.ts` (Line 104)
- **Code:**
  ```typescript
  const { data: rpcData, error: rpcErr } = await supabase.rpc("submit_private_feedback_with_rate_limit", {
  ```
- **Why it matters:** This asks the database to perform two actions simultaneously: check the rate limit, and insert the feedback. If the customer is spamming, the database rejects it instantly.

**5. Sending the Email Alert**
- **File:** `app/actions/feedback.ts` (Lines 144-145)
- **Code:**
  ```typescript
  const emailRes = await resend.emails.send({
    from: process.env.EMAIL_FROM,
  ```
- **Why it matters:** This triggers the actual email notification to the business owner. It ensures they know immediately when an unhappy customer writes to them.

**6. Authenticating the Owner**
- **File:** `app/admin/login/actions.ts` (Line 13)
- **Code:**
  ```typescript
  const { error } = await supabase.auth.signInWithPassword({
  ```
- **Why it matters:** This is the lock on the front door of the dashboard. It verifies the owner's email and password against the secure database.

**7. Protecting the Dashboard**
- **File:** `app/admin/dashboard/page.tsx` (Lines 11-12)
- **Code:**
  ```typescript
  if (!user) {
    redirect('/admin/login')
  ```
- **Why it matters:** This acts like a bouncer checking tickets inside the dashboard. If someone tries to view the dashboard without being logged in, they are kicked out.

**8. Tenant Isolation (Scoping)**
- **File:** `app/admin/dashboard/page.tsx` (Line 19)
- **Code:**
  ```typescript
  .eq('owner_user_id', user.id)
  ```
- **Why it matters:** This ensures that when the database fetches the business details, it only returns the business owned by the currently logged-in user. 

**9. Row Level Security**
- **File:** `supabase/schema.sql` (Lines 35-36)
- **Code:**
  ```sql
  create policy "Owners can view their own clients" on clients
    for select using (auth.uid() = owner_user_id);
  ```
- **Why it matters:** This is the ultimate safety net. Even if a programmer makes a mistake, the database physically refuses to hand over data to the wrong owner.

**10. Automated Data Deletion**
- **File:** `supabase/schema.sql` (Lines 107-108)
- **Code:**
  ```sql
  -- select cron.schedule('purge-feedback', '0 3 * * *',
  --   $$ delete from private_feedback where created_at < now() - interval '18 months' $$);
  ```
- **Why it matters:** This command (when fully enabled) tells the database to automatically delete very old customer data every night at 3 AM. It keeps the business legally compliant and safe.

---

## 7. WHAT I CAN SAFELY CHANGE MYSELF

### SAFE FOR BEGINNER
You can safely modify text, colors, and layouts in these files without breaking the application:
- **Button text:** (e.g., changing "Leave a Google review" to "Review us on Google" in `app/r/[slug]/page.tsx`).
- **Labels:** (e.g., changing "Your Name" to "Full Name" in `components/FeedbackForm.tsx`).
- **Colors:** (e.g., changing `bg-blue-600` to `bg-red-600` for buttons).
- **Privacy Notice:** (e.g., modifying the text in `app/privacy/page.tsx` to match your legal requirements).
- **Site Config:** Changing `operatorName` and `contactEmail` in `lib/site-config.ts`.

### ASK BEFORE CHANGING
Do not touch these areas without consulting a developer, as a mistake could break the app or expose private data:
- **Authentication:** Anything in `app/admin/login/actions.ts`.
- **Authorization & RLS:** Anything in `supabase/schema.sql`.
- **Supabase queries:** Changing the `.select()` or `.eq()` lines could accidentally show the wrong data.
- **Service-role usage:** `getServiceRoleClient()` is a master key and must only be used carefully on the server.
- **Rate limiting & IP hashing:** Security features in `app/actions/feedback.ts` and `supabase/migrations/002_rate_limit.sql`.
- **Environment variables/secrets:** Never hardcode passwords or API keys directly into the code.

---

## 8. GLOSSARY

- **Server Action:** A special block of code that runs invisibly on the server, keeping secrets safe from the customer's web browser.
- **Supabase:** The third-party service that acts as the secure database (filing cabinet) and authentication provider (security guard) for the app.
- **RLS (Row Level Security):** A database feature that acts like a lock on individual rows of data, ensuring owners only see their own information.
- **Turnstile:** A service by Cloudflare that invisibly proves a customer is a human and not a spam robot.
- **RPC (Remote Procedure Call):** A way for the server to ask the database to run a complex, multi-step instruction all at once safely.
- **Vercel:** The company that hosts the website code on the internet.
- **Resend:** The company that handles delivering the email notifications to the business owners.
- **Environment Variable:** A secret sticky note on the server (like `.env.local`) that holds passwords so they don't have to be written in the code.

---

## 9. READING ORDER

If you want to read through the code to learn how it works, follow this 15-minutes-per-file order:

1. `lib/site-config.ts` (Start easy: see where global variables are stored).
2. `app/r/[slug]/page.tsx` (See how the landing page greets the customer).
3. `components/FeedbackForm.tsx` (Look at the visual form the customer fills out).
4. `app/actions/feedback.ts` (Read the heavy logic: Turnstile, IP hashing, Database Insert, Email).
5. `app/admin/login/actions.ts` (See how an owner logs in).
6. `app/admin/dashboard/page.tsx` (See how the dashboard securely fetches the owner's data).
7. `supabase/schema.sql` (Look at the blueprint of the database and the RLS security rules).

*You can skip files like `app/layout.tsx` or `globals.css` initially, as they are just visual wrappers and styling.*

---

## 10. QUIZ

Test your understanding of your application!

1. If a spam robot tries to submit 1,000 feedbacks, which two features stop them?
2. Why is the customer's IP address "hashed" before it is saved?
3. What guarantees that Owner A can never see Owner B's messages, even if a programmer writes a bad query?
4. If a business stops paying for their subscription, what happens when a customer scans their QR code?
5. Why are emails sent from `app/actions/feedback.ts` instead of directly from the browser?
6. Does the public landing page (`/r/[slug]/page.tsx`) load the business owner's email address from the database?
7. What happens to private messages after 18 months?
8. Where do you go to change the name of the company displayed on the Privacy Notice?
9. Is it safe to change the color of the "Send a private message" button?
10. Does the Turnstile security check require the customer to solve a puzzle?

---
answers
---

1. Cloudflare Turnstile (blocks robots) and Rate Limiting (blocks too many requests from the same connection).
2. To protect the customer's privacy. A hash allows the system to count visits without storing a readable IP address.
3. Row Level Security (RLS) in the Supabase database.
4. The `isClientActive` check will fail, and the customer will see a "temporarily unavailable" message.
5. So that the secret `RESEND_API_KEY` is not exposed to the public internet.
6. No. It strictly asks the database only for public information (like the logo and business name).
7. They are (or will be) automatically permanently deleted by a database scheduled job (`pg_cron`) to minimize legal risk.
8. `lib/site-config.ts`.
9. Yes, visual changes to CSS classes (like `bg-blue-600`) are perfectly safe.
10. No, Turnstile works invisibly in the background.

---

## 11. POSSIBLE SIMPLIFICATIONS

No significant simplifications identified during this documentation pass. The code correctly balances security, rate limiting, and simplicity.
