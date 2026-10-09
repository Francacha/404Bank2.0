# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: bank clients.** Young Argentines handling their everyday money: checking their balance, sending transfers, taking out and paying back loans, saving in "frascos", managing cards, downloading receipts (comprobantes), and asking Ban for help. The client app is the main surface and gets the most care.
- **Secondary: bank staff.** Internal back-office roles: `empleado` (look up a client by DNI/CBU, review movements, block or activate accounts), `gerente`, and `admin` (all users, the latest system-wide transfers, account status). Staff can switch between a work view and a client view (`ViewModeContext`). These are internal tools and rank below the client experience.
- **Who judges success:** the professors and classmates of Práctica Profesionalizante I, who see the product in demos and reviews.

## Product Purpose

404Bank is an academic project: a simulated 100% digital Argentine bank built for Práctica Profesionalizante I by Franco and Mateo. No real customers and no real money. It succeeds when it is approved and the demo shows a complete, believable banking product that works from end to end: sign-up and onboarding, accounts, transfers, loans with installments and late-payment penalties, savings frascos, cards, investments, receipts, an AI assistant, and the staff panels.

## Positioning

A student-built bank that behaves like a real Argentine fintech. It registers people and opens accounts through a "banco central" API with CBU and alias. It quotes real dollar exchange rates (dolarapi.com) and follows real Argentine conventions: TNA, CFTEA, 21% IVA on interest, punitive interest on late debt, and peso formatting in `es-AR`. Its mascot and assistant, Ban, is backed by Gemini. The name's "404" joke is part of who it is.

## Operating Context

- Clients sign in with Clerk, then complete onboarding (`OnboardingGuard`) before they can reach the app.
- Recurring jobs (`node-cron`) collect loan installments and settle frascos. For demos, the intervals can be shortened with env vars (`CUOTAS_INTERVALO`, `FRASCOS_DIA`), so time-based states such as overdue loans or matured frascos can show up within minutes.
- Receipts are generated as PDFs (pdfkit).
- The interface language is Spanish (Argentina, voseo): "Abrí tu cuenta", "Enviá y recibí".

## Capabilities and Constraints

- **Stack:** React 19 + Vite + TypeScript, react-router, CSS Modules per page, lucide-react icons, and Clerk for auth. The backend is Express 5 with PostgreSQL/Supabase, a Gemini chatbot, the banco central API, and dolarapi.
- **Client routes:** `/home`, `/transferir`, `/historial`, `/prestamos`, `/tarjetas`, `/perfil`, `/chat`, `/inversiones`, `/comprobantes`. Frascos is on the client side as well.
- **Staff routes:** `/empleado`, `/gerente`, `/admin`, behind `RoleGuard`.
- **Loans:** 1/3/6/12/24/36 installments, with TNA, the punitive surcharge, and IVA configurable through env.
- **Frascos:** terms of 7 to 365 days with TNA from 28% to 35% and a minimum of $1000.
- **Landing-only features:** the landing page lists offerings with no implementation behind them yet (préstamos prendarios, promociones, cuenta sueldo, seguros). Treat them as marketing copy only, not as working features.

## Brand Commitments

- The name **404Bank**, as written.
- **Ban**, the mascot and virtual assistant (`src/assets/Ban.png`, `banS.png`, `banEsp.gif`). It greets visitors on the landing page and is the chat persona.
- The logos in `frontend/clerk-react/src/assets` (`404log.png`, `logoF.png`).
- Burgundy **#4F0919** as the brand color.
- Voice: friendly, plain, rioplatense Spanish with voseo.

## Evidence on Hand

- Live dollar exchange rates (oficial, blue, MEP, tarjeta) from dolarapi.com.
- Real loan and frasco parameters in `backend/src/config/`.
- Seed data and a database dump: `database/init.sql`, `backup_404bank.sql`.
- **Absent:** real customers, testimonials, user numbers, press, or regulatory licensing. This is a simulated bank, so none of these may be invented. Security claims must not go beyond what is actually implemented (Clerk authentication).

## Product Principles

1. **Believable over decorative.** Every number, rate, and state should read like a real Argentine bank, because the demo is graded on whether the system is credible and complete.
2. **Client flows come first.** The client journey gets the most polish. Staff panels have to be clear and work, but they can stay plainer.
3. **Money must be unambiguous.** Amounts, currency (ARS/USD), dates, installments, and status (active, overdue, blocked) must never be hard to read.
4. **Ban is the warm face, not the whole interface.** Personality lives in Ban and the copy, and banking tasks stay direct.
5. **Honest scope.** Features that exist only on paper must not look like they work.
