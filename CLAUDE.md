# Claude Development Guide for Particle Play

## Build and Development Commands
- `bun run dev` - Start development server with Turbopack
- `bun run build` - Build production-ready application
- `bun run start` - Start production server
- `bun run lint` - Run ESLint on codebase

## Code Style Guidelines
- **TypeScript**: Use strict type checking, avoid `any` types
- **Components**: Function components with explicit return types
- **Imports**: Use absolute imports with `@/` path alias
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Errors**: Use try/catch blocks and explicit error handling
- **Formatting**: Follow Next.js/ESLint core-web-vitals recommendations
- **CSS**: Use Tailwind CSS utility classes
- **Framework**: Next.js 15+ with React 19

## File Organization
- Keep page components in `src/app/` directory
- Place reusable components in `src/components/`
- Extract business logic into dedicated hooks/utilities
- Group related files by feature when appropriate

## Particle Simulation Details

### Overview
This project implements a WebGL-based particle simulation with gravitational interactions between particles. The simulation uses the GPU for rendering and calculates particle physics on the CPU.

### Key Components
- `WebGLContainer.tsx`: Main component that sets up WebGL context and manages the animation loop
- `ParticleSystem` class: Handles particle state, updates physics, and manages interaction between particles
- `WebGLUtils` class: Helper functions for WebGL shader creation and program setup

### Simulation Parameters
- **Particles**: 2,000 particles with random mass values (0.5-2.5)
- **Gravity**: Each particle attracts others based on an inverse square law (F = G * m1 * m2 / r²)
- **Repulsion**: Particles repel each other at very close distances to prevent clumping
- **Boundaries**: Particles wrap around screen edges

### UI Controls
The simulation provides interactive sliders to adjust:
- **Gravity Strength**: Controls the strength of gravitational attraction (G constant)
- **Gravity Radius**: Sets maximum distance for gravitational influence (performance optimization)
- **Repulsion Distance**: Sets the threshold where particles begin to repel each other

### Technical Implementation
- WebGL for hardware-accelerated rendering
- GLSL shaders for particle drawing
- TypeScript for type safety
- React hooks for component lifecycle management
- Next.js for application framework