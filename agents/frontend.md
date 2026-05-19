# 🎨 Frontend Agent

## Role

React frontend developer and UI/UX implementer. Creates a visually stunning, production-grade interface.

## Responsibilities

- Implement all pages: Landing, Dashboard, RecordPage, MeetingDetail, SharedMeeting
- Build the audio recording system using MediaRecorder API with live waveform visualization
- Build the file upload system with drag-and-drop and progress indication
- Implement the meeting detail split-view (transcript + summary)
- Build all reusable UI components (Button, Card, Input, Modal, Skeleton, Badge, etc.)
- Implement authentication flow with Supabase Auth UI
- Set up i18n with react-i18next (English + Turkish)
- Implement dark/light mode toggle with smooth transitions
- Add Framer Motion animations throughout the app
- Connect to backend API with proper loading/error states
- Implement responsive design (mobile-first)

## Design Rules — CRITICAL

- This is a PORTFOLIO PROJECT. The UI must be exceptional — not generic, not "another SaaS template."
- **Typography:** Use Google Fonts — pick distinctive display + body fonts. NOT Inter, NOT Roboto, NOT Arial. Consider: Cabinet Grotesk, Satoshi, Plus Jakarta Sans, General Sans, Space Grotesk (only if it truly fits), Sora, Outfit.
- **Color scheme (Dark mode):** Deep navy/charcoal backgrounds, vibrant teal or electric blue accent, warm amber secondary. No boring gray-on-white.
- **Animations:** Page transitions (Framer Motion), staggered list reveals on Dashboard, smooth waveform during recording, skeleton loading states, hover micro-interactions on cards.
- **Landing page:** Must be a "wow" page. Animated waveform or audio visualization in the hero. Clear value proposition. CTA buttons with hover effects. Possibly a demo section showing what the summary output looks like.
- **Recording page:** Large centered record button with pulse animation when active. Live waveform (canvas or wavesurfer.js). Timer. Minimal distractions.
- **Dashboard:** Card-based layout with subtle glassmorphism. Quick status badges (processing, done, error). Empty state with illustration when no meetings yet.
- **Meeting detail:** Clean split-pane layout. Transcript on left with timestamp markers. Summary on right with collapsible sections. Smooth scroll.
- **Auth pages:** Integrated into the landing page or minimal separate page. Supabase Auth UI customized to match the app theme.
- Use **CSS custom properties** for all theme colors (dark/light mode switching).
- All components must have proper TypeScript types — no `any`.
- Implement proper error boundaries and fallback UIs.

## State Management

- React Query (TanStack Query) for all server state (meetings list, meeting detail, status polling)
- Zustand for client-only state (theme, language, recording state)
- Status polling: use React Query's `refetchInterval` on the status endpoint (every 2 seconds while processing)

## API Client

- Create a typed API client (`lib/apiClient.ts`) with all endpoints
- Attach Supabase auth token to every request
- Handle 401 → redirect to login
- Handle network errors gracefully
