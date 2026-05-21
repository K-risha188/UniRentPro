# UniRent 🎓🚗📚

UniRent is a premium, campus-exclusive peer-to-peer rental marketplace built for university students. The platform allows students to list items—such as textbooks, scientific calculators, bicycles, and sporting gear—for rent by the day, enabling students to save money, earn extra income, and share resources within a trusted local campus environment.

---

## 🚀 Key Features

*   **Firebase SMS OTP Authentication**: Secure, passwordless registration and login utilizing Firebase Phone verification.
*   **Student Profile Verification**: Users verify enrollment during sign-up by providing their university name, campus email, and student registration number.
*   **Dynamic Catalog & Categorization**: Browse items categorized by Calculators, Textbooks, Transport, Electronics, and Sports. Search items instantly by name or keyword.
*   **Rent Requests & Decision Workflows**:
    *   **Student Tenants**: Request items for rent with a single click. Track status states (`Pending`, `Approved`, `Declined`) directly from the detail modal. Once approved, the owner's phone number is revealed as a click-to-call link (`tel:`) for pickup coordination.
    *   **Listing Owners**: See how many people have requested their items, view requester profiles (names and phone numbers), and approve or decline queries with real-time database updates.
*   **Responsive Dark & Light Mode Theme**: Beautiful Apple-inspired design leveraging a curated White, Light Green, and Medium Yellow color system that supports system settings.
*   **Local Indian Currency (INR)**: Displays listing prices and calculations in `₹`.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose](https://mongoosejs.com/) schemas
*   **Authentication**: [Firebase Web Auth SDK](https://firebase.google.com/docs/auth) (SMS OTP Verification)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4 layout with custom CSS variable color mappings)
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Repository Structure

```
unirent/
├── app/
│   ├── api/
│   │   ├── listings/    # API handler to create and fetch rent listings
│   │   ├── login/       # Local session setup
│   │   ├── register/    # Local MongoDB student profile registration
│   │   └── requests/    # Rent requests workflow endpoints (GET, POST, PATCH)
│   ├── login/           # Login screen (OTP interface)
│   ├── signup/          # Registration screen (Name, University info, OTP check)
│   ├── globals.css      # Core theme colors and CSS declarations
│   ├── layout.tsx       # Main page HTML structures
│   └── page.tsx         # Dashboard main catalog and details modal
├── lib/
│   └── mongodb.ts       # Cached MongoDB connection management client
├── models/
│   ├── Listing.ts       # Mongoose model schema for listing items
│   ├── Request.ts       # Mongoose model schema for rental requests
│   └── User.ts          # Mongoose model schema for students
└── package.json         # Build pipelines and dependencies
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory of the project and populate it with the following configuration details:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://krisharathod1645_db_user:krisha_rathod@unirent.zsi13on.mongodb.net/?appName=UniRent

# Firebase Client configuration keys
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBxMl20bYwn6hNXYqvER7m1fQPDk_G24ZY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=unirent-487c0.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=unirent-487c0
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=unirent-487c0.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1010886282985
NEXT_PUBLIC_FIREBASE_APP_ID=1:1010886282985:web:9c35089c97b8ab96146a78
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-76QXP5VJYE
```

---

## 📦 Local Setup Instructions

### 1. Install Dependencies
Navigate to the root directory and install dependencies:
```bash
npm install
```

### 2. Run the Development Server
Launch the local development environment:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to access the application.

### 3. Build for Production
Verify typescript compliance and compile the build bundle:
```bash
npm run build
```

---

## 🛡️ Trust & Verification Workflows

*   **Campus Network Binding**: Users are verified as students by capturing their official email domains (e.g., `.edu` or university domains).
*   **Ownership Safety**: Product lists show student owner verification banners. Rental status changes are validated securely on the backend (only the verified listing owner can approve/decline requests).
