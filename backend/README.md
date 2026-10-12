# OmniMarket Backend — Production-Grade Multi-Vendor E-Commerce Platform

A scalable, production-grade multi-vendor e-commerce platform backend built with a **Modular Monolith** and **Domain-Driven Design (DDD)** structure in Node.js, Express, TypeScript, and MongoDB.

---

## 🏗️ Architecture Highlights

- **Modular Monolith Architecture**: Built around distinct business domains (`auth`, `users`, `sellers`, `products`, `orders`, `inventory`, `payments`, etc.) with strict 4-tier layering:
  ```
  Controller ──> Service ──> Repository ──> Model
  ```
- **Enterprise Security**:
  - Dual-token authentication with short-lived JWT access tokens (15m) and secure `httpOnly`, `SameSite=Strict` cookie refresh tokens (7d).
  - Cryptographic token family rotation with automatic reuse/theft detection.
  - Constant-time bcrypt password hashing (12 salt rounds).
  - Granular IP-based rate limiting on sensitive authentication and checkout routes.
  - Helmet security headers and CORS protection.
- **Fail-Fast Environment Validation**: Zod schema validation runs at server startup to enforce strictly typed, production-ready configuration.
- **Observability & Logging**: Structured JSON logging with Pino, automatic PII/credential redaction, and end-to-end request tracing via `X-Request-Id`.
- **Decoupled Module Eventing**: In-process `DomainEventBus` for cross-domain side-effects, ready for migration to BullMQ/Kafka without business logic rewrites.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 20.x
- MongoDB >= 7.0

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy the `.env.example` file to `.env` and configure your credentials:
```bash
cp .env.example .env
```

### 4. Running the Server
```bash
# Start development server with live reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 5. Running Tests
```bash
npm test
```

---

## 📡 API Endpoints (v1)

### System Observability
- `GET /health` — Service liveness and uptime check
- `GET /readiness` — MongoDB database connectivity verification
- `GET /api/v1` — API v1 status and version

### Authentication & Sessions
- `POST /api/v1/auth/register` — Register a customer or seller account
- `POST /api/v1/auth/login` — Sign in and receive short-lived access token + HTTP-only refresh cookie
- `POST /api/v1/auth/refresh` — Rotate refresh token and issue new session tokens
- `POST /api/v1/auth/logout` — Revoke active refresh token and clear session cookies
- `GET /api/v1/auth/me` — Retrieve authenticated user profile (Requires Bearer token)

---

## 📄 License
ISC
