# Police Management System

## Overview

This is a full-stack police management system built with React, Express, and PostgreSQL. The application enables police officers to register detainees with photo capture capabilities, search records by ID number (cedula), and view comprehensive dashboard statistics. The system uses modern technologies including TypeScript, Drizzle ORM, and shadcn/ui components.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom police theme colors
- **State Management**: TanStack Query for server state management
- **Routing**: wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth integration with session management
- **File Handling**: Multer for photo and document uploads
- **Session Storage**: PostgreSQL-based session store

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon serverless PostgreSQL
- **Migrations**: Drizzle Kit for schema management
- **Connection Pooling**: Neon serverless connection pooling

## Key Components

### Authentication System
- Replit Auth integration for secure user authentication
- Session-based authentication with PostgreSQL session storage
- User profile management with automatic user creation/updates
- Route protection middleware for authenticated endpoints

### Detainee Management
- Complete CRUD operations for detainee records
- Photo capture using device camera or file upload
- ID document upload functionality
- Form validation using Zod schemas
- Support for Venezuelan states and address information

### Search Functionality
- Real-time search by cedula (ID number)
- Search logging for audit trails
- Paginated results display
- Activity tracking for user actions

### Dashboard Analytics
- Real-time statistics (total records, active users, daily metrics)
- Recent activity feed
- Weekly activity trends
- Responsive charts and data visualization

### File Upload System
- Camera capture component for photos
- File upload with size limits (10MB)
- Support for both photo and document uploads
- Base64 encoding for image storage

## Data Flow

1. **Authentication Flow**: Users authenticate through Replit Auth, sessions are stored in PostgreSQL
2. **Registration Flow**: Officers capture photos, fill forms, submit to API with validation
3. **Search Flow**: Officers search by cedula, results fetched from database with logging
4. **Dashboard Flow**: Real-time statistics aggregated from database queries

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight routing
- **zod**: Runtime type validation
- **multer**: File upload handling

### UI Dependencies
- **@radix-ui/**: Complete set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for managing CSS classes
- **lucide-react**: Icon library

### Authentication Dependencies
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite dev server with HMR for frontend
- **Backend**: tsx for TypeScript execution with live reload
- **Database**: Neon serverless PostgreSQL instance
- **Environment**: Replit-optimized with cartographer integration

### Production Build
- **Frontend**: Vite build process generating optimized static assets
- **Backend**: esbuild bundling for Node.js deployment
- **Assets**: Static files served from Express with Vite middleware
- **Database**: Production Neon PostgreSQL with connection pooling

### Environment Configuration
- Database URL from environment variables
- Replit Auth configuration with OIDC
- Session secrets and security configuration
- File upload limits and storage configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 30, 2025: Initial setup with Replit Auth system
- June 30, 2025: Major authentication system overhaul - replaced Replit Auth with local authentication system
- June 30, 2025: Added responsive navigation with theme toggle (light/dark mode)
- June 30, 2025: Enhanced database schema with municipality and parish fields for detainees
- June 30, 2025: Improved mobile responsiveness with collapsible menu
- June 30, 2025: Fixed camera capture functionality with better error handling
- June 30, 2025: Added municipality and parish fields to detainee registration form
- June 30, 2025: Corrected dark theme implementation across all pages
- June 30, 2025: Added "registro" field to detainee registration form and database schema
- June 30, 2025: Implemented advanced search functionality with multiple criteria (name, state, municipality, parish)
- June 30, 2025: Restricted dashboard access to administrators only with role-based navigation

## Changelog

- June 30, 2025: Initial setup
- June 30, 2025: Replaced Replit Auth with local authentication (username/password)
- June 30, 2025: Added dark/light theme support
- June 30, 2025: Enhanced mobile navigation with hamburger menu
- June 30, 2025: Extended detainee schema with municipality and parish fields