# 🤝 Local HelpLink

### Hyperlocal Emergency & Skill Exchange Platform for College Campuses

[![Next.js](https://img.shields.io/badge/Next.js-15.5.9-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.9.0-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Latest-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Database Structure](#-database-structure)
- [User Roles](#-user-roles)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Future Scope](#-future-scope)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 🎯 About The Project

**Local HelpLink** is a real-time hyperlocal emergency and skill exchange web application built for college campuses and small cities. It connects people who need help with volunteers and service providers in their immediate vicinity — instantly.

Built as a full-stack Firebase-powered web app using **Next.js 15**, **TypeScript**, **Firestore**, and **Tailwind CSS**, this project demonstrates real-world problem solving with a scalable, production-ready architecture.

> 💡 Built around MMMUT (Madan Mohan Malaviya University of Technology), Gorakhpur — but designed to scale to any campus or city.

---

## 🚨 Problem Statement

In small cities and college campuses, people struggle with:

- 🩸 Finding **urgent blood donors** in real-time
- 🔧 Getting quick **local repair services** (bike, laptop)
- 📚 Finding **verified student tutors** on short notice
- 🚑 Getting help during **emergencies**
- 💬 WhatsApp groups are **messy and unstructured**

There is no organized, real-time platform for hyperlocal help exchange.

---

## 💡 Solution

A Firebase-powered web app where:

- Users **register with location and role**
- People can **post requests** like:
  - *"Need Blood O+ urgent"*
  - *"Need bike mechanic near hostel"*
  - *"Need DSA tutor for 2 hours"*
- **Nearby users get notified instantly**
- **Verified responders can accept** requests in real-time
- Built-in **chat, ratings, and reputation system**

---

## ✨ Features

### 👤 User Portal
- Post help requests with urgency levels (Critical/Medium/Normal)
- Real-time request feed from community
- Track active and completed requests
- Rate helpers after completion
- In-app chat with helpers
- Activity feed and notifications

### 🙋 Volunteer Portal
- Browse and filter open missions
- Skill-matched request highlighting
- Accept/complete mission flow
- Impact dashboard (rank, stats, rating)
- Mission history with timeline
- Real-time chat with requesters

### 🔧 Service Provider Portal
- Browse available jobs by category
- Set custom service charges (₹/hr, fixed, negotiable)
- Availability toggle (Available/Busy)
- Earnings tracker
- Job history and reviews
- Profile with verification badge

### 👑 Admin Portal
- Overview analytics dashboard with charts
- Citizen directory with role management
- Provider verification system
- All requests moderation
- Community announcements broadcast
- Provider activity & earnings monitor
- Real-time platform impact stats

### 🔔 Real-Time Features
- Live request feed (onSnapshot)
- Instant notifications on acceptance
- In-app chat with typing indicators
- Unread message badge counter
- Critical request popup alerts

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 15** | React framework, file-based routing |
| **React 18** | UI components, hooks |
| **TypeScript** | Type safety throughout |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Analytics charts |

### Backend (Firebase)
| Service | Purpose |
|---|---|
| **Firebase Auth** | Email/Password + Google Sign-in |
| **Cloud Firestore** | Real-time NoSQL database |
| **Firebase Hosting** | Web deployment (free tier) |

### Key Patterns
- React Context API for global auth/user state
- `onSnapshot` listeners for real-time updates
- Centralized listener manager to prevent memory leaks
- JavaScript-side filtering to minimize Firestore indexes
- `useMemo` + `useCallback` for performance optimization
- Dynamic imports for lazy loading heavy components

---

## 🗄️ Database Structure

```
📁 users/{userId}
   ├── name, email, phone
   ├── role: "user" | "volunteer" | "provider" | "admin"
   ├── skills: string[]
   ├── rating, totalHelped, verified
   ├── isAvailable, hourlyRate
   ├── area, serviceCategory, experience
   └── createdAt

📁 requests/{requestId}
   ├── title, description
   ├── category: "blood" | "tutor" | "repair" | "emergency" | "other"
   ├── urgency: "critical" | "medium" | "normal"
   ├── status: "open" | "accepted" | "completed" | "expired"
   ├── createdBy, acceptedBy
   ├── serviceCharge, chargeType, isFreeService
   ├── responseTime, completedAt
   └── timestamp, expiresAt

📁 chats/{chatId}
   ├── participants: [userId1, userId2]
   ├── requestId, requestTitle
   ├── lastMessage, lastMessageTime
   ├── status: "active" | "closed"
   │
   📁 messages/{messageId}
   │  ├── text, senderId, senderName
   │  ├── timestamp, read
   │  └── type: "text" | "system"
   │
   └── 📁 typing/{userId}
          ├── isTyping, name
          └── timestamp

📁 notifications/{userId}/items/{itemId}
   ├── type, message, read
   ├── requestId, chatId
   └── timestamp

📁 ratings/{ratingId}
   ├── fromUser, toUser
   ├── requestId, score, comment
   └── timestamp

📁 announcements/{announcementId}
   ├── title, message
   ├── urgency, active
   └── createdAt
```

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| 👤 **User** | Post requests, chat with helpers, rate helpers |
| 🙋 **Volunteer** | Browse & accept missions, chat, build reputation |
| 🔧 **Provider** | Accept jobs, set charges, track earnings |
| 👑 **Admin** | Full platform management, analytics, moderation |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/shikhar/local-helplink.git

# Navigate to project directory
cd local-helplink

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your Firebase config to .env.local
# (see Environment Variables section)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> ⚠️ Never commit `.env.local` to GitHub. It's already in `.gitignore`.

---

## 🔥 Firebase Setup

### 1. Create Firebase Project
- Go to [console.firebase.google.com](https://console.firebase.google.com)
- Create a new project named `local-helplink`
- Register a web app and copy the config

### 2. Enable Authentication
- Firebase Console → Authentication → Sign-in method
- Enable **Email/Password**
- Enable **Google** (optional)

### 3. Create Firestore Database
- Firebase Console → Firestore Database
- Start in **production mode**
- Choose your region

### 4. Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

### 5. Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

### 6. Set Admin User
After registering, manually set your role in Firestore:
```
users/{your-uid} → role: "admin"
```

---

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Firebase Deployment
npm run deploy              # Build + deploy all
npm run deploy:hosting      # Deploy to hosting only
npm run deploy:rules        # Deploy Firestore rules
npm run deploy:indexes      # Deploy Firestore indexes
```

---

## 🌐 Deployment

### Deploy to Firebase Hosting (Free)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the app
npm run build

# Deploy
firebase deploy --only hosting
```

**Live URL:** `https://local-helplink.web.app`

---

## 📸 Screenshots

### User Dashboard
> Real-time community feed with urgency-coded request cards

### Volunteer Impact Hub
> Personal stats, mission feed, and rank system

### Service Provider Portal
> Job management with custom pricing and earnings tracker

### Admin Oversight
> Full platform analytics, user management, and moderation

### In-App Chat
> Real-time messaging with typing indicators

---

## 🔐 Security

- ✅ Firestore Security Rules (role-based)
- ✅ Auth-gated routes (redirect if not logged in)
- ✅ Admin-only page protection
- ✅ Environment variables for all secrets
- ✅ Input validation on all forms
- ✅ Abuse reporting on requests

---

## 💰 Cost

This entire app runs on **Firebase Spark (Free) Plan**:

| Service | Free Tier | Usage |
|---|---|---|
| Firestore reads | 50,000/day | ✅ Well within |
| Firestore writes | 20,000/day | ✅ Well within |
| Auth users | Unlimited | ✅ Free |
| Hosting bandwidth | 10GB/month | ✅ Free |
| **Total cost** | **₹0/month** | 🎉 |

---

## 🔭 Future Scope

- 📱 **Android App** — React Native version
- 💳 **Razorpay Integration** — In-app payments for providers
- 🗺️ **Live Location Tracking** — Real-time GPS for helpers
- 🤖 **AI Matching** — Suggest best volunteer by skill + distance
- 📊 **Impact Reports** — Weekly community impact emails
- 🏪 **Local Shop Partner** — Verified shop listings
- 🌆 **City Expansion** — Multi-city support
- 📲 **PWA** — Installable on mobile as app
- 🔔 **FCM Push Notifications** — Native push on mobile

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

```bash
# Fork the repository
# Create your feature branch
git checkout -b feature/AmazingFeature

# Commit your changes
git commit -m 'Add some AmazingFeature'

# Push to the branch
git push origin feature/AmazingFeature

# Open a Pull Request
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Shikhar Kesarwani**
- 📧 Email: shikharkesarwani2006@gmail.com
- 🎓 MMMUT, Gorakhpur
- 💼 GitHub: [@your-username](https://github.com/your-username)

---

## 🏆 Project Highlights

```
✅ Full-stack Firebase web app
✅ 4 distinct role-based portals
✅ Real-time chat with typing indicators
✅ Production-ready security rules
✅ Mobile responsive design
✅ Zero monthly cost (free tier)
✅ Scalable architecture
✅ 1500+ lines of Firestore queries
```

---

## 📊 Platform Stats (Demo)

```
👥 Users registered    : 5+
📋 Requests posted     : 10+
✅ Requests resolved   : 5+
💬 Chat messages sent  : 50+
⭐ Average rating      : 4.9/5
```

---

<div align="center">

**Built with ❤️ for the MMMUT community**

*Connecting students, one request at a time*

⭐ **Star this repo if you found it helpful!** ⭐

</div>

