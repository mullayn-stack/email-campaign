# Overview

This is a full-stack email campaign web application designed for grassroots activism. The platform enables supporters to quickly send pre-written emails to government representatives through a public landing page, while providing campaign administrators with a password-protected dashboard to manage campaign content, messaging, and recipient lists. The application generates mailto links that open users' default email clients with pre-filled messages, making it easy for supporters to take action.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses a modern React-based single-page application (SPA) built with Vite and TypeScript. The UI is constructed using shadcn/ui components built on top of Radix UI primitives, styled with Tailwind CSS for consistent design. The application implements client-side routing using Wouter for navigation between the public landing page and admin dashboard.

## Backend Architecture
The server is an Express.js application using TypeScript and ESM modules. It follows a RESTful API design pattern with dedicated route handlers for configuration management and admin authentication. The server serves both the API endpoints and static frontend assets, with Vite integration for development hot reloading.

## Data Storage Solutions
Campaign configuration is stored in a JSON file (`campaign-config.json`) on the server filesystem using a simple file-based storage abstraction. This provides easy deployment without database dependencies while maintaining data persistence. The system includes Drizzle ORM configuration for PostgreSQL, indicating potential future database integration, but currently operates entirely on file-based storage.

## Authentication and Authorization
Admin access uses a simple credential-based authentication system without sessions or tokens. Admin credentials are stored as environment variables (ADMIN_USERNAME, ADMIN_PASSWORD) and validated through a dedicated API endpoint. This lightweight approach suits the application's simple admin requirements while maintaining security for configuration updates.

## Form Handling and Validation
Both client and server implement comprehensive form validation using Zod schemas. The shared schema definitions ensure type safety across the full stack. React Hook Form manages client-side form state with real-time validation feedback, while the server validates all incoming data before processing.

## Email Generation Strategy
Rather than sending emails directly, the application generates mailto links with pre-filled recipients, subjects, and message bodies. This approach leverages users' existing email clients while avoiding the complexity of SMTP configuration and email deliverability concerns. Template variables ({{name}}, {{postcode}}) are replaced with user-provided data before generating the mailto link.

# External Dependencies

## UI Component Libraries
- **Radix UI**: Provides accessible, unstyled UI primitives for all interactive components
- **shadcn/ui**: Pre-built component library offering styled versions of Radix components
- **Tailwind CSS**: Utility-first CSS framework for styling and responsive design
- **Lucide React**: Icon library providing consistent iconography throughout the application

## State Management and Data Fetching
- **TanStack React Query**: Handles server state management, caching, and API communication
- **React Hook Form**: Manages form state, validation, and user input handling
- **Wouter**: Lightweight client-side routing solution for navigation

## Development and Build Tools
- **Vite**: Fast build tool and development server with hot module replacement
- **TypeScript**: Provides static typing across the entire codebase
- **Drizzle ORM**: Database toolkit configured for potential PostgreSQL integration
- **Zod**: Schema validation library used for form validation and type safety

## Runtime Dependencies
- **Express.js**: Web server framework handling HTTP requests and API routes
- **Node.js**: JavaScript runtime environment for the server application
- **Neon Database Serverless**: PostgreSQL client configured for cloud database connectivity (future use)

## Development Environment
The application is optimized for Replit deployment with specific Vite plugins for error handling and development tools. Environment variables manage sensitive configuration including admin credentials and database connection strings.