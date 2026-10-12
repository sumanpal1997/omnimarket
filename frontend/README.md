# OmniMarket Frontend — Next-Gen Multi-Vendor Marketplace

The official web frontend for the **OmniMarket** multi-vendor e-commerce platform, built with Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS, TanStack Query, and Zustand.

---

## ✨ Features

- **Next.js 15 App Router Architecture**:
  - Server Components (RSC) by default for low TTFB and optimal SEO.
  - Granular Suspense boundaries for streaming.
  - Server-side data fetching and URL-driven search/filter state.
- **State Management Strategy**:
  - **Server State**: TanStack Query v5 for caching, background revalidation, and mutation states.
  - **Ephemeral UI State**: Lightweight Zustand store for drawers, modals, and navigation toggles. Zero duplicated server state.
- **Resilient API Layer**:
  - Abstracted HTTP client built on Axios with transparent 401 token refresh queue.
  - Seamless background rotation of short-lived JWT access tokens without interrupting active user workflows.
- **Form Validation & Accessibility**:
  - React Hook Form + Zod resolvers matching backend schemas.
  - Modern, accessible UI primitives styled with Tailwind CSS.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 20.x

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Configure `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_CURRENCY=INR
```

### 4. Running the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📂 Project Structure
```text
src/
├── app/                  # Next.js App Router (Storefront, Auth, Dashboards)
├── components/           # UI primitives, layout headers/footers, and shared widgets
├── features/             # Domain-specific UI features (auth, cart, catalog, checkout)
├── hooks/                # Custom React hooks
├── lib/                  # API client, query client, formatting utilities
├── schemas/              # Zod validation schemas
├── services/             # Frontend API service layer
├── stores/               # Zustand UI stores
└── types/                # Shared TypeScript interfaces
```
