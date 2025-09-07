# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based serial port terminal application with test case management capabilities, built with TypeScript, Vite, and Tauri. The application provides dual-channel serial communication, data terminal functionality, and comprehensive test case management for hardware testing scenarios.

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Desktop Framework**: Tauri (Rust-based)
- **State Management**: React Context + TanStack Query
- **Routing**: React Router DOM
- **Internationalization**: i18next

### Core Directory Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── serial/         # Serial communication components
│   │   ├── components/ # Test case management sub-components
│   │   ├── hooks/      # Serial-specific hooks
│   │   ├── editors/    # Code/script editors
│   │   ├── styles/     # Component-specific styles
│   │   ├── types/      # TypeScript type definitions
│   │   └── utils/      # Serial utilities
│   └── StatusFooter.tsx
├── contexts/           # React contexts (SettingsContext)
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── lib/                # Utility libraries
├── i18n/               # Internationalization setup
└── locales/            # Translation files
```

### Key Components and Their Roles

1. **App.tsx**: Main application wrapper with routing, query client, and providers
2. **Index.tsx**: Primary layout component managing the dual-panel interface
3. **SerialConnection**: Handles Web Serial API connections and port management
4. **DataTerminal**: Real-time data display and interaction terminal
5. **TestCaseManager**: Comprehensive test case creation, execution, and management
6. **SettingsPanel**: Application configuration and preferences

### State Management Pattern

The application uses a hybrid approach:
- **React Context** for global settings and serial connection state
- **TanStack Query** for server state and caching
- **Local component state** for UI-specific concerns
- **Custom hooks** for complex state logic (useSerialManager, useGlobalMessages)

### Serial Communication Architecture

The serial communication system is built around:
- **Web Serial API** for browser-based serial communication
- **Dual-channel support** (P1 and P2 ports)
- **Connection strategies** for different communication patterns
- **Real-time data streaming** with configurable display options
- **Command execution** with response handling

### Test Case System

The test case management system includes:
- **Hierarchical test structure** (cases → sub-cases → commands)
- **Script editor** with syntax highlighting for complex test scenarios
- **Drag-and-drop** functionality for test organization
- **Execution engine** with real-time feedback
- **Result logging** and export capabilities

### Build Configuration

- **Vite**: Modern build tool with hot module replacement
- **TypeScript**: Strict type checking with path aliases (`@/*` → `src/*`)
- **Tauri**: Desktop application wrapper with native system access
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint**: Code linting with React and TypeScript rules

### Important Implementation Notes

1. **Web Serial API**: Only available in secure contexts (HTTPS/localhost)
2. **Tauri Integration**: Desktop builds include native file system access
3. **Internationalization**: Full i18n support with English and Chinese translations
4. **Responsive Design**: Mobile-first approach with desktop optimization
5. **Error Handling**: Comprehensive error boundaries and user feedback
6. **Performance**: Virtual scrolling for large data sets, memoization for expensive operations

### Development Guidelines

- Use existing shadcn/ui components for consistency
- Follow established patterns in serial communication code
- Maintain TypeScript strict mode compliance
- Use the @ path alias for imports from src/
- Follow the established component structure and naming conventions
- Ensure all serial operations handle disconnections gracefully