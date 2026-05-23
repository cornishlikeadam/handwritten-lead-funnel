# Mirror 5000 Funnel - Sandbox Test Environment

This project is a high-converting, handwritten-notebook styled lead and payment funnel. It features a sandbox environment (`/mirror5000-test`) designed to test the complete opt-in and ebook checkout flow safely on Vercel preview environments before deploying changes to your live production landing page.

---

## Vercel Sandbox Test Setup

To test everything safely without affecting the live production website `kendren.us`:

### 1. Branch Configuration
1. Create and checkout a new preview branch called `mirror5000-test`:
   ```bash
   git checkout -b mirror5000-test
   ```
2. Commit your sandbox changes and push the branch to your GitHub repository:
   ```bash
   git add .
   # (Avoid committing raw secure .env files directly)
   git commit -m "feat: introduce sandbox funnel for Trillion Dollar Miracle ebook"
   git push origin mirror5000-test
   ```

### 2. Vercel Preview Project Link
1. Go to your **Vercel Dashboard**.
2. Connect your Git repository.
3. Configure Vercel to automatically generate **Preview Deployments** when you push to the `mirror5000-test` branch.
4. **Do not** connect your main production domain (`kendren.us`) to this preview branch. Let Vercel issue a separate preview subdomain (e.g., `mirror5000-funnel-test.vercel.app`).

### 3. Environment Variables Configuration
In your **Vercel Project Settings > Environment Variables**, add the following settings for the **Preview** environment:

```env
# Price settings (crossed out value and active beta value)
TRILLION_ORIGINAL_PRICE=87
TRILLION_ACTIVE_PRICE=27
TRILLION_LAUNCH_LIMIT=100

# Payment Processor Selection
# Options: 'manual' (Cash App), 'external', 'stripe'
PAYMENT_MODE=manual

# Cash App config (For Mode: manual)
CASHAPP_CASHTAG=$kendren
MANUAL_PAYMENT_INSTRUCTIONS="Send $27 to $kendren with your email in the note. Once paid, the download link will unlock."

# External Checkout Link (For Mode: external)
TRILLION_CHECKOUT_URL=https://yourlink.gumroad.com/l/your-ebook-id

# Stripe Credentials (For Mode: stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_TRILLION=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://your-preview-domain.vercel.app/mirror5000-test/trillion-unlocked?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://your-preview-domain.vercel.app/mirror5000-test/confirmed

# Admin Credentials & Outbox Notifications
ADMIN_LEDGER_PASSWORD=9938
ADMIN_EMAIL=kendren@proton.me,tachyon@proton.me
SMTP_FROM="Mirror 5000" <your-email@domain.com>

# SMTP Credentials (optional, defaults to local file simulation in outbox/ folder if missing)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-smtp-password
```

---

## Funnel Sandbox QA Checklist

Once your Vercel preview domain is online, execute these tests:

### 1. Test Free Opt-in Form
- Navigate to `/mirror5000-test`.
- Fill out steps 1, 2, and 3. Submit the form.
- Verify you are redirected to `/mirror5000-test/confirmed?email=...&id=...`.
- If SMTP is configured, confirm you received the free manual PDF welcome email. If not configured, check your server's `/tmp/outbox` or local `outbox/` folder for the generated `.html` email mockup.

### 2. Test Ebook Payment Intent (Cash App Mode)
- On the confirmation page, review the crossed-out pricing ($87) and active beta price ($27).
- Click **Stamp + Unlock Miracle**.
- Verify you are redirected to `/mirror5000-test/payment-pending` showing the custom instructions and the `$kendren` Cashtag.

### 3. Test Admin Ledger & Verification
- Click the Teddy Bear `🧸` button in the footer of `/mirror5000-test` or `/mirror5000-test/confirmed`.
- Enter the Bear Code: `9938`.
- Enter the Admin Secret Password key.
- Verify the 4 tabs are present:
  - **Subscribers**: Check that your test email is logged as a lead.
  - **Sales Ledger**: Look for your pending ebook purchase. Click **Verify Paid** to simulate receiving the Cash App payment.
  - **Outbox Queue**: See the pending buyer email. If SMTP is active, click retry.
  - **Setup Checklist**: Verify all parameters are green/configured.
- Once you click **Verify Paid**, verify the buyer's status in the database switches to `buyer` and the system attempts to send the ebook link to their inbox.

### 4. Test Protected Download Link
- Grab the download link URL sent in the mock buyer email (`/mirror5000-test/trillion-unlocked?token=...`).
- Verify the download button appears and allows streaming `trillion-dollar-miracle.pdf`.
- Try opening the URL without a token or with a random token, and verify that the page correctly rejects access.

### 5. Production Merge
- Once you have tested the sandbox behavior, verify that the `/mirror5000` route remains completely unaffected.
- When satisfied, merge the `mirror5000-test` branch into your main production branch to update the live site.
