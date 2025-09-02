# Email Campaign Web Application

## Overview

This is a grassroots email campaign platform designed for Northern Ireland community engagement. The application allows supporters to quickly contact their representatives through a public landing page, while administrators can manage campaign content through a secure dashboard. The system generates pre-written emails with customizable content and automatically opens the user's default mail client with recipient details populated.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Mobile-first responsive design** using pure HTML5, CSS3, and vanilla JavaScript
- **Progressive Web App features** with iOS-specific optimizations and app-like behavior
- **Single-page application approach** with two main views: public campaign page and admin dashboard
- **Client-side email generation** using mailto links to leverage native email clients
- **Real-time form validation** with accessibility considerations and user feedback

### Backend Architecture
- **Vanilla Node.js HTTP server** without external frameworks for simplicity and performance
- **File-based configuration storage** using JSON for campaign settings persistence
- **RESTful API design** with endpoints for configuration retrieval and updates
- **Basic HTTP authentication** for admin access using environment variables
- **Static file serving** with automatic MIME type detection and caching headers

### Data Storage Solutions
- **JSON configuration files** for campaign settings, email templates, and recipient lists
- **Environment variable configuration** for sensitive admin credentials
- **No database dependency** - lightweight file-based approach suitable for small-scale campaigns
- **Automatic backup and versioning** through file system operations

### Authentication and Authorization
- **HTTP Basic Authentication** for admin dashboard access
- **Environment-based credential management** using .env files
- **Role-based access control** with public and admin user types
- **Session-less authentication** for stateless server operations

### Email System Design
- **Client-side email composition** using browser mailto protocol
- **Template-based email generation** with placeholder substitution ({{name}}, {{postcode}})
- **Bulk recipient handling** through comma-separated email lists
- **Customizable email subjects and bodies** managed through admin interface

## External Dependencies

### Core Runtime
- **Node.js HTTP module** for server functionality
- **Node.js File System module** for configuration management
- **Node.js Path and URL modules** for routing and file handling

### Frontend Libraries
- **Inter font family** from Google Fonts for typography
- **Native browser APIs** for form validation, localStorage, and mailto handling
- **CSS3 Grid and Flexbox** for responsive layout without external frameworks

### Development and Deployment
- **Replit hosting platform** configured for port 5000 with 0.0.0.0 binding
- **Environment variable support** through .env file parsing
- **Static asset serving** with proper MIME types and caching strategies

### Browser Compatibility
- **Modern ES6+ JavaScript** with async/await and fetch API
- **CSS Custom Properties** for theming and responsive design
- **Progressive enhancement** ensuring functionality across different devices and browsers
- **iOS Safari optimizations** with specific meta tags and touch handling