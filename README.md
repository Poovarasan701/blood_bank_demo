# LifeFlow — Blood Bank & Donor Network

LifeFlow is a real-time blood bank platform that connects donors, hospitals, and administrators. It provides a public-facing donor registry and emergency request board, plus an admin dashboard for managing blood inventory, donors, and urgent requests — all backed by a live Firebase Firestore database.

## publishing
published by — netlify 

web sites : lifeflow-01.netlify.app

## Features

- 🩸 **Live inventory tracker** — blood stock levels by type, updated in real time
- 📢 **Urgent request board** — hospitals can broadcast emergency blood requests to nearby donors
- 🧑‍🤝‍🧑 **Donor registry** — searchable, filterable donor directory with location and blood type
- 🛠️ **Admin dashboard** — manage inventory, log donations, resolve requests, and view metrics
- ⚡ **Real-time sync** — changes made by any user, on any device, appear instantly everywhere via Firestore listeners (no manual refresh needed)
- 🔐 **Anonymous auth** — every visitor gets a lightweight, credential-free Firebase identity so Firestore security rules can be enforced without a login flow

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, and JavaScript (ES modules) — no framework or build step required
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore) (real-time NoSQL database)
- **Auth:** Firebase Authentication (Anonymous provider)

## Project Structure

```
.
├── index.html          # Public donor site (registry, requests, inventory)
├── admin.html           # Admin dashboard (password-gated)
├── app.js               # Public site logic
├── admin.js              # Admin dashboard logic
├── db-service.js        # Shared Firestore data layer (reads/writes/subscriptions)
├── firebase-config.js   # Firebase project config + anonymous auth setup
├── firestore.rules       # Firestore security rules
├── styles.css            # Shared styling
└── README.md
```

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Poovarasan701/blood_bank_demo.git
cd blood_bank_demo
```

### 2. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and create a new project
2. Click the **`</>`** (Web) icon to register a web app and copy the config object it gives you
3. Paste those values into the `firebaseConfig` object in `firebase-config.js`

### 3. Set up Firestore

1. In the Firebase console: **Build → Firestore Database → Create database**
2. Note: creating a database now requires the project to be on the **Blaze** (pay-as-you-go) plan — usage stays free within Firestore's generous daily quota unless you exceed it
3. Go to the **Rules** tab and paste in the contents of [`firestore.rules`](./firestore.rules), then click **Publish**

### 4. Enable Anonymous authentication

1. **Build → Authentication → Sign-in method**
2. Enable the **Anonymous** provider (this lets every visitor get a Firebase identity without a login screen, which the security rules require)

### 5. Run locally

Because the app uses ES modules, it must be served over HTTP — opening the HTML files directly (`file://`) will not work.

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html) in your browser. The admin dashboard is at `/admin.html`.

On first load, the app automatically seeds the database with sample donors, requests, and inventory if it's empty.

## Security Notes

- The admin dashboard is protected by a simple client-side password gate, not a Firebase Auth role — anyone who queries Firestore directly could still read/write the `inventory`, `donors`, and `requests` collections, since the rules only check that a user is signed in (anonymously or otherwise)
- For production use with real personal data, consider adding proper role-based access control (e.g. Firebase custom claims or an `admins` collection checked in the security rules) rather than relying on the client-side gate alone

## License

Add a license of your choice (e.g. MIT) here.
