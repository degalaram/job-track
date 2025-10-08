# Daily Tracker Application

## Overview

Daily Tracker is a Progressive Web Application (PWA) designed to help users manage job searches, pending tasks, and notes in a single, mobile-first interface. The application features a clean, minimal design inspired by modern productivity tools like Notion and Linear, with support for both light and dark themes. The application uses PostgreSQL for data persistence with real-time synchronization across devices via WebSocket.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates

- **✅ Full Authentication System**: User registration, login, logout, and password change functionality
- **✅ PostgreSQL Integration**: Drizzle ORM with Neon serverless database
- **✅ Real-Time Sync**: WebSocket implementation for instant updates across mobile and desktop
- **✅ 30-Day Persistent Sessions**: FileStore-based session management
- **✅ Production Ready**: Fully configured for Render deployment

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- **React 18+** with TypeScript for type-safe component development
- **Vite** as the build tool and development server with HMR (Hot Module Replacement)
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and real-time data synchronization

**UI Component System**
- **shadcn/ui** component library using Radix UI primitives with custom styling
- **Tailwind CSS** for utility-first styling with custom design tokens
- Component variants using `class-variance-authority` for consistent styling patterns
- Custom theme system supporting light/dark modes with CSS variables

**State Management**
- React Context API for authentication state (`AuthProvider`)
- TanStack Query for server state with 30-day cache retention
- WebSocket integration for real-time cache invalidation
- Theme preferences managed via Context API (`ThemeProvider`)

**Mobile-First PWA Features**
- Responsive design optimized for mobile devices first
- PWA-ready with proper meta tags and theme colors
- Bottom tab navigation pattern for mobile UX
- Touch-friendly interface with appropriate spacing and sizing

### Backend Architecture

**Server Framework**
- **Express.js** server with TypeScript
- Development mode integrates Vite middleware for HMR
- Production mode serves static built files
- Custom logging middleware for API requests

**Authentication & Sessions**
- SHA-256 password hashing
- **FileStore** for persistent session storage (30-day TTL)
- Session-based authentication with secure cookies
- Protected route middleware

**Data Layer**
- **Drizzle ORM** for type-safe database queries
- **Neon Database** serverless PostgreSQL adapter
- Full schema definition in `shared/schema.ts` (users, jobs, tasks, notes)
- Migration system configured via `drizzle-kit`

**Real-Time Communication**
- **WebSocket Server** (ws library) for bidirectional communication
- Event broadcasting system for data changes
- Automatic reconnection with retry logic
- Integration with React Query for cache invalidation

**API Structure**
- RESTful API routes in `server/routes.ts`
- Storage interface in `server/storage.ts` with CRUD operations
- `/api` prefix for all endpoints
- Zod schema validation for all requests

### Design System

**Typography**
- Primary font: Inter (via Google Fonts) for readability
- Font weights: 400 (normal), 500 (medium), 600 (semibold)
- Responsive text sizing: `text-sm` for mobile, `text-base` for desktop

**Color System**
Semantic color tokens defined in CSS variables:
- Light mode: Professional blue primary (219 85% 35%), near-white backgrounds
- Dark mode: Lighter blue primary (219 85% 55%), dark gray backgrounds
- Separate color definitions for cards, popovers, and sidebar components
- Border colors and elevation states for interactive elements

**Component Patterns**
- Cards for content grouping with consistent border and shadow styles
- Buttons with multiple variants: default, destructive, outline, secondary, ghost
- Form inputs with consistent height (h-9) and styling
- Badge components for status indicators
- Dialog/modal patterns for user interactions

**Layout System**
- Tailwind spacing units (2, 4, 6, 8) for consistent spacing
- Responsive breakpoints following Tailwind defaults
- Flexbox and Grid for layout patterns
- Mobile-first responsive design approach

### Key Features

**User Authentication**
- Secure user registration with username, email, phone, password
- Login with username/password
- 30-day persistent sessions (FileStore)
- Password change functionality
- Automatic session extension on activity
- Secure logout

**Job Search Management**
- URL-based job posting analysis and storage
- Job listing cards with company, title, location, type
- Date-based filtering and organization
- Edit and delete functionality for saved jobs
- Quick actions to convert jobs to tasks
- Real-time sync across devices

**Task Management**
- Task creation with categorization (job-application, follow-up, interview, other)
- Completion tracking with visual checkboxes
- Filter views: all, pending, completed
- Task statistics display
- Association with job URLs
- Real-time updates via WebSocket

**Notes System**
- Rich text editor with basic formatting (bold, italic, headings)
- Auto-save functionality (2-second debounce)
- Manual save option
- Search functionality within notes
- Image attachment support
- Real-time synchronization across devices

**Real-Time Synchronization**
- WebSocket-based instant updates
- Changes on mobile reflect immediately on desktop
- Event broadcasting for all data changes
- Automatic cache invalidation via React Query
- Reconnection logic with 10 retry attempts

## External Dependencies

### Core UI Libraries
- **@radix-ui/** components (accordion, dialog, dropdown, popover, etc.) - Unstyled, accessible UI primitives
- **shadcn/ui** - Pre-built component system built on Radix UI
- **lucide-react** - Icon library for UI elements

### Styling & Theming
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - Type-safe component variant management
- **clsx** & **tailwind-merge** - Conditional className utilities

### Database & ORM
- **drizzle-orm** - TypeScript ORM for PostgreSQL
- **drizzle-zod** - Zod schema integration for validation
- **@neondatabase/serverless** - Serverless PostgreSQL client
- **PostgreSQL** database (Neon hosted)

### State Management & Data Fetching
- **@tanstack/react-query** - Server state management with real-time sync
- **WebSocket (ws)** - Real-time bidirectional communication

### Form Handling
- **react-hook-form** - Form state management
- **@hookform/resolvers** - Validation resolver library
- **zod** - Schema validation

### Session & Authentication
- **express-session** - Session management middleware
- **session-file-store** - File-based session persistence
- **crypto** - SHA-256 password hashing

### Date Utilities
- **date-fns** - Date manipulation and formatting

### Development Tools
- **TypeScript** - Type safety across frontend and backend
- **Vite** - Fast development server and build tool
- **tsx** - TypeScript execution for server
- **esbuild** - Fast JavaScript bundler for production builds
- **cross-env** - Cross-platform environment variables

### Web APIs
- **Web Speech API** (browser native) - Voice recognition and synthesis
- **WebSocket API** (browser native) - Real-time communication

### Font Resources
- **Google Fonts** - Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono

## Production Deployment

The application is configured for deployment on **Render** with:

- **PostgreSQL Database**: Neon serverless adapter
- **Web Service**: Node.js Express server
- **Session Storage**: FileStore with persistent disk mount
- **WebSocket Support**: Native support on Render
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, NODE_ENV
- **Build Process**: `npm run build` (Vite + ESBuild)
- **Start Command**: `npm start`

See **RENDER_DEPLOYMENT_GUIDE.md** for complete deployment instructions.

## Project Documentation

- **RENDER_DEPLOYMENT_GUIDE.md** - Step-by-step Render deployment guide
- **Daily_Tracker_Project_Analysis.pptx** - Comprehensive project presentation (21 slides)
- **PROJECT_SUMMARY.md** - Complete project overview and technical summary
- **design_guidelines.md** - UI/UX design principles
