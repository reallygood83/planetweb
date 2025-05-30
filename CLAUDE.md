# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack for faster builds
- `npm run build` - Create production build  
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

## Architecture Overview

This is a Next.js 14 application using the App Router pattern for a Korean educational platform called "Planet" (Student Record AI Helper) that helps teachers generate student evaluation records using AI.

### Core Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **AI Integration**: Google Gemini API via @google/generative-ai
- **State Management**: Zustand, React Context for auth
- **Forms**: React Hook Form with Zod validation

### Key Architectural Patterns

**Authentication Flow**
- Supabase Auth with Google OAuth support
- AuthContext (`contexts/auth-context.tsx`) manages user state globally
- Middleware (`middleware.ts`) protects routes starting with `/dashboard` and `/generate`
- Auth callback handled at `/auth/callback/route.ts`

**Data Layer**
- Supabase client/server patterns using `@supabase/ssr`
- Type-safe database schema in `types/supabase.ts`
- Row Level Security (RLS) for data isolation by user
- All database operations go through Supabase clients in `lib/supabase/`

**API Structure**
- Server actions and API routes for external integrations (Gemini AI)
- Client-side encrypted API key storage using crypto-js
- API keys stored encrypted in localStorage, hints in user profiles

**Component Architecture**
- Feature-based component organization (`components/class/`, `components/evaluation/`, etc.)
- Shared UI components in `components/ui/` using Radix primitives
- Form components heavily use React Hook Form + Zod schemas

### Critical Business Logic

**Multi-tenant Data Model**
- All data is scoped by `user_id` for privacy
- School groups allow collaboration via 6-digit codes
- Classes contain student lists and link to evaluation plans
- Generated content tracks what AI has created for each student

**AI Integration Pattern**
- User provides their own Gemini API key (cost management)
- Keys encrypted client-side before storage
- AI generates educational content following Korean NEIS standards (500 char limit, formal tone)
- Supports batch generation for entire classes

**Survey System**
- Teachers create surveys linked to evaluation plans
- Students submit self-assessments
- Responses feed into AI content generation

## Environment Setup

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key
- `NEXT_PUBLIC_ENCRYPT_KEY` - Client encryption key for API keys
- `NEXT_PUBLIC_APP_URL` - Application base URL

## Database Schema Notes

Core tables:
- `profiles` - User metadata and encrypted API key hints
- `evaluation_plans` - Curriculum plans for generating student records
- `classes` - Student rosters organized by teacher
- `generated_contents` - AI-generated student evaluation text
- `school_groups` + `group_memberships` - Collaboration system
- `surveys` + `survey_responses` - Student self-assessment system

All tables use UUIDs and include Row Level Security policies.