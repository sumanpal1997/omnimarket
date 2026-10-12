# OmniMarket — Multi-Vendor E-Commerce Platform

**OmniMarket** is a production-grade, full-stack multi-vendor e-commerce marketplace platform engineered with a modular Node.js/TypeScript backend and a high-density Next.js App Router storefront and dashboard suite.

---

## Repository Structure

```text
omnimarket/
├── backend/                  # Express + TypeScript + MongoDB Modular Monolith API
│   ├── src/
│   │   ├── core/             # Config, DB, Redis, Auth & Error Middlewares
│   │   ├── modules/          # Domain Modules (Auth, Users, Sellers, Products, Inventory, Cart, Orders, Payments, Reviews, Admin)
│   │   └── scripts/          # Database Seeder (seed.ts)
│   └── package.json
├── frontend/                 # Next.js (App Router) + TypeScript + Tailwind CSS + Zustand
│   ├── src/
│   │   ├── app/              # Storefront, Auth, Checkout, Customer Profile, Seller & Admin Dashboards
│   │   ├── components/       # Multi-Tier Navbar, Enterprise Footer, CartDrawer, ProductCard, UI Primitives
│   │   ├── services/         # Typed API Client Services
│   │   └── stores/           # Zustand State Stores (Auth, Cart, UI)
│   └── package.json
└── package.json              # Root Monorepo Helper Scripts
```

---

## Key Platform Capabilities

- **Commercial Multi-Tier Storefront UI:**
  - Split Bento Hero showcase, department-scoped search bar, visual category bento cards, authorized brand pavilion, and instant "Add to Cart" product cards with live `% OFF` discount badges.
  - 2-Column Catalog filtering by department, keyword/brand, INR price ranges, and sort order (`newest`, `price_asc`, `price_desc`, `rating`).
- **Multi-Vendor Order Splitting & Atomic Inventory Reservations:**
  - Single customer checkout automatically splits into per-merchant `SubOrder` records while atomically reserving SKU stock with TTL expiration.
- **Role-Based Access Control (RBAC) & KYB Merchant Onboarding:**
  - Supports `CUSTOMER`, `SELLER`, and `ADMIN` roles, complete with a 3-step Seller KYB Application workflow (`/seller/apply`), Seller Hub (`/dashboard/seller`), and Admin Moderation Portal (`/dashboard/admin`).
- **Integer Minor Currency Precision:**
  - All financial calculations, taxes (18% GST), commissions, and payouts are stored and computed in integer minor units (paise/cents) to eliminate floating-point rounding errors.

---

## Quick Start Guide

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure Environment Variables

- **Backend (`backend/.env`):** Copy `backend/.env.example` to `backend/.env` and configure `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `CORS_ORIGIN=http://localhost:3000`.
- **Frontend (`frontend/.env.local`):** Set `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`.

### 3. Seed Flagship Catalog & Demo Accounts

```bash
npm run seed
```

### 4. Start Development Servers

In separate terminals:

```bash
# Terminal 1 — Backend API (http://localhost:5000)
npm run dev:backend

# Terminal 2 — Frontend Storefront (http://localhost:3000)
npm run dev:frontend
```
