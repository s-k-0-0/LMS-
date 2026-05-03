# Vidya - Project Roadmap & Delegation
**SVYASA Deemed to be University**

**Timeline:** 30 Days
**Team:** 6 personnel (Lead BE, Lead FE, 4 Junior Devs)

## 4-Week Sprint Plan

### Week 1: Foundation & Architecture
- **Lead BE:** Set up Supabase project, execute `supabase-schema.sql`, configure Row Level Security (RLS) rules. Implement Auth triggers for custom roles.
- **Lead FE:** Scaffold Vite + React app, setup React Router (`Layout`, `ProtectedRoute`), implement `useAuth` hook tied to Supabase.
- **Junior 1 (Dashboards):** Build the universal `Layout` sidebar, responsive shells, and the `Dashboard.tsx` view using mock data.
- **Junior 2 (Styling):** Initialize Tailwind CSS, shadcn/ui with Dark Mode Tech configuration (Slate-900 / Emerald-500). Build shared UI components (Cards, Buttons).
- **Junior 3 (Aptitude):** Flesh out the schema requirements for `aptitude_questions` with Lead BE. Learn Supabase queries.
- **Junior 4 (Guides):** Research Cloudflare Stream implementation and tus-js-client API requirements.

### Week 2: Core Module Implementation
- **Lead BE:** Build serverless endpoints or edge functions to securely call Judge0 API. Setup Cloudflare Stream webhook configs.
- **Lead FE:** Implement global state (Zustand/Context) if needed. Wire up `Compiler.tsx` to Lead BE's Judge0 endpoints.
- **Junior 1 (Dashboards):** Connect `Dashboard.tsx` to actual Postgres tables (Courses, Lessons). Implement the `StreakWidget` logic.
- **Junior 2 (Styling):** Refine responsive behaviors. Ensure shadcn forms on `FacultyStudio.tsx` match the design system.
- **Junior 3 (Aptitude):** Develop `AptitudeEngine.tsx`. Implement 60-second timer, randomized questions, and write scores to `profiles` table.
- **Junior 4 (Guides):** Develop `VideoPlayer.tsx` and integrate Cloudflare Stream's web player API.

### Week 3: Faculty & Admin Tools
- **Lead BE:** Finalize storage bucket permissions. Write policies allowing Faculty to upload thumbnails and Admins to manage all users.
- **Lead FE:** Build out `SuperAdminPanel.tsx` logic. Wire up role modification mutations.
- **Junior 1 (Dashboards):** Link courses on the dashboard to the respective video lessons.
- **Junior 2 (Styling):** Standardize all success/error states using `sonner` toasts across forms.
- **Junior 3 (Aptitude):** Add admin interface to create/edit aptitude questions.
- **Junior 4 (Guides):** Build the `FacultyStudio.tsx` using `tus-js-client` for direct-to-Cloudflare video uploads.

### Week 4: Polish, QA, & Deployment
- **Lead BE:** Conduct security audit on all Supabase RLS policies. Optimize SQL queries and indexing.
- **Lead FE:** Performance audit. Code splitting routes. Ensure Monaco editor lazy loads properly.
- **All Juniors:** E2E manual testing, bug squashing, cross-browser CSS fixes, and final presentation prep.

---

## Instructions for Junior Devs
- **Shadcn UI:** Do not build primitive elements from scratch. Need a dropdown? Run `npx shadcn-ui@latest add select`. Always check the component registry.
- **Backend Hooks:** Import and use `supabase` from `src/lib/supabase.ts`. Use the `useAuth()` hook to conditionally render UI. Do not store sensitive state locally if it needs persistence—fetch/write it to the DB!
- **CSS:** Adhere rigidly to the Tailwind theme presets. Use `bg-slate-900`, `bg-slate-950` for surfaces, and `emerald-500` for primary actions. No random hex colors.
