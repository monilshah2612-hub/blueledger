# BlueLedger

A blue, offline-first budgeting and expense tracker for Android. Built with plain HTML/CSS/JS inside a Capacitor Android shell. All data stays on your phone.

## What's in it

- **Setup wizard**: name, currency, your accounts and opening balances, your own categories, optional envelope limits, backup preferences
- **Multiple accounts** (cash, bank, credit card, UPI/wallet, savings, investment) with income, expenses and **inter-account transfers**
- **Records tab**: Daily list grouped by date, **Calendar** (monthly grid with income/expense/net per day; tap a date to see and add that day's transactions), **Monthly** yearly summary, search, account filter
- **Envelope budgeting**: monthly limit per envelope, each envelope draws from the categories you choose, resets every month, progress bars turn amber at 80% and red when over
- **Your own categories** for income and expenses (name, icon, colour)
- **Reports**: donut by category, 6-month income vs expenses, savings rate, average daily spend, biggest expense
- **Bills & subscriptions**: weekly/monthly/yearly, optional auto-add, local reminders
- **Savings goals** with a "save X per month" hint
- **Loans**: money lent and borrowed with repayments, optionally recorded in an account
- **Backups**: automatic file backups (daily/weekly/monthly, last 10 kept), one-tap manual backup, share to Google Drive/WhatsApp, restore from file, CSV export, backup reminders
- **App lock** with a 4-digit PIN, dark mode, undo on delete, arithmetic in amount fields (e.g. `350+150`)

## Try it in a browser (no build needed)

```
node tools/make-preview.js     # writes preview.html
```

Open `preview.html` in Chrome. Native features (file backups to Documents, notifications, share sheet) only work in the Android build.

## Get the APK

### Option A: GitHub builds it for you (no installs)

1. Create a new GitHub repository and push this folder to it.
2. Open the repo's **Actions** tab, choose **Build Android APK**, click **Run workflow**.
3. When it finishes, download the **BlueLedger-apk** artifact, unzip it, and copy `app-debug.apk` to your phone.
4. On the phone, open the file and allow "Install unknown apps" for your file manager or browser when asked.

### Option B: Android Studio

1. Install Node 18+ and Android Studio.
2. In this folder run:
   ```
   npm install
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio wait for Gradle to sync, plug in your phone (USB debugging on) and press **Run**, or use **Build > Build APK(s)** and copy the APK to the phone.

## Editing the app

All app code is in `www/` (`js/core.js` data and backup logic, `views.js` main screens, `forms.js` add/edit sheets, `more.js` bills, goals, loans, backup, settings and the wizard, `css/styles.css` theme). After any change run `npx cap sync android` and rebuild.

## Notes

- Automatic backups are written to `Documents/BlueLedger` where Android allows it, otherwise to the app's own storage. App-private copies are deleted if you uninstall, so use **Share backup** to keep a copy in Google Drive.
- The debug APK is fine for personal use. A signed release build is only needed for the Play Store.
- Google Drive background sync is not included; it needs a Google Cloud OAuth client and could be added later.
