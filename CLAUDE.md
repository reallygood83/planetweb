# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack for faster builds
- `npm run build` - Create production build  
- `npm run lint` - Run ESLint checks
- `npm start` - Start production server

## Architecture Overview

This is a Next.js 15 application using the App Router pattern for a Korean educational platform called "Planet" (생기부 AI 도우미 - Student Record AI Helper) that helps teachers generate student evaluation records using AI. The name "Planet" derives from combining the Korean words for behavioral development (행동발달) and academic records (성적), symbolizing a comprehensive educational ecosystem.

### Core Technology Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Radix UI components
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
- AI generates educational content following Korean NEIS standards:
  - 교과학습발달상황: 500 character limit, single paragraph format
  - 창의적 체험활동: 200 character limit, integrated format
  - Formal tone required for all content
- Supports batch generation for entire classes with rate limiting (6s delay between requests)

**Survey System**
- Teachers create surveys linked to evaluation plans
- Students submit self-assessments via class codes
- Responses feed into AI content generation

**Keyword-based Observation System**
- Systematic teacher observation recording using predefined keywords
- 6 categories: learning attitude, social skills, cognitive abilities, participation level, character traits, special talents
- Real-time keyword selection for immediate record generation (memory-only, not persisted)
- Observation data integrates with AI prompts for enhanced student record quality

**Creative Activities System**
- Teachers input semester activities in table format (order/date/activity name/area)
- 4 activity areas: 자율활동, 동아리활동, 봉사활동, 진로활동
- Multiple activities can be selected for record generation per student
- Generated records are limited to 200 characters

**Student Survey Access Flow**
- Students access surveys via school_code (4-10 character alphanumeric codes)
- API endpoint `/api/student/surveys` uses service role key to bypass RLS
- School codes are stored in classes table and must be unique
- Survey responses are collected anonymously through dedicated endpoints

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
- `classes` - Student rosters organized by teacher (includes school_code for student access)
- `generated_contents` - AI-generated student evaluation text
- `school_groups` + `group_memberships` - Collaboration system
- `surveys` + `survey_responses` - Student self-assessment system
- `creative_activities` - Semester activity records by class
- `creative_activity_records` - Generated creative experience records
- `observation_sessions` + `daily_observations` - Keyword-based teacher observation data

All tables use UUIDs and include Row Level Security policies.

## Important Implementation Details

### Student Data Structure
Classes table stores students as JSONB array that can contain either:
- Simple strings: `["홍길동", "김철수"]`
- Objects with number/name: `[{"number": 1, "name": "홍길동"}]`

Always handle both formats when processing student data.

### API Key Management
1. Users input their Gemini API key in dashboard
2. Key is encrypted client-side using AES
3. Encrypted key stored in localStorage
4. Decrypted only when making API calls
5. Key hint (last 4 chars) stored in database

### Rate Limiting
- Gemini free tier: 10 requests/minute
- Batch generation includes 6s delay between requests
- Error handling for rate limit responses

### Character Limits
- 교과학습발달상황: 500 characters (single paragraph)
- 창의적 체험활동: 200 characters (integrated format)
- 행동특성 및 종합의견: 500 characters

### School Code System
- Simple 4-10 character alphanumeric codes stored in classes.school_code
- Used for student survey access via `/api/student/surveys?classCode=`
- Generated using `lib/simple-code-generator.ts` functions
- Codes must be unique across all classes
- Student APIs use service role key to bypass RLS for anonymous access

### Database Migrations
- Schema files in `/supabase/` directory
- Run `fix_school_code.sql` if school_code column is missing from classes table
- Use `debug_school_code.sql` to troubleshoot school code issues
- Migration files may conflict - check execution order in production

### Record Generation System
The application supports three main approaches to student record generation:
1. **Simple Generation** (`/dashboard/generate-simple`): Single-page workflow with real-time keyword selection
2. **Individual Generation** (`/dashboard/generate-record`): Multi-step guided process with comprehensive data collection
3. **Batch Generation** (`/dashboard/generate-batch`): Class-wide generation with rate limiting

Each approach integrates:
- Evaluation plans with achievement standards and assessment criteria
- Student self-assessment responses
- Teacher observation records (keyword-based or free-text)
- Real-time keyword selection (memory-only for immediate use)

### Enhanced AI Prompt System
The AI generation process uses sophisticated prompt engineering:
- Multi-layered data integration (evaluation results + self-assessments + observations)
- Positive reframing of assessment levels ("노력요함" → growth potential language)
- NEIS compliance validation (character limits, formal tone, prohibited words)
- Subject-specific formatting (single paragraph for 교과학습발달상황)

### Observation System Architecture
- `KeywordCheckboxSystem` component provides structured observation recording
- Real-time selection creates synthetic observation records for immediate AI use
- Persistent observation data stored in dedicated tables with category organization
- Integration with generation APIs supports both approaches seamlessly

### Branding and UI Consistency
- "Planet" brand identity with gradient logo (P icon) represents educational ecosystem
- Consistent header styling across main page and dashboard
- Navigation dropdowns with proper positioning and click-outside behavior
- SVG-based favicon system supporting multiple resolutions

### Common Troubleshooting
- Student survey 404 errors: Check if school_code column exists and has data
- RLS access issues: Student APIs should use service role key, teacher APIs use regular auth
- API key errors: Verify encryption/decryption and localStorage persistence
- Rate limiting: Implement proper delays for batch operations
- Observation system: Real-time keyword data is memory-only and not persisted to database
- Generation failures: Ensure either teacherNotes OR observation data is present