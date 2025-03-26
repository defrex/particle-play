# Particle Play

A WebGL-based particle simulation with gravitational interactions. This project demonstrates how to create GPU-accelerated particle effects using WebGL in a Next.js environment.

## Features

- Real-time particle simulation with gravitational physics
- Each particle interacts with others based on mass and distance
- Interactive controls to adjust simulation parameters
- GPU-accelerated rendering with WebGL
- Fully responsive design that fills the viewport

## Getting Started

This project uses [Bun](https://bun.sh) as its package manager and runtime.

```bash
# Install dependencies
bun install

# Run development server with Turbopack
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the simulation.

## Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Runtime**: [Bun](https://bun.sh)
- **Graphics**: WebGL with custom GLSL shaders
- **Styling**: Tailwind CSS

## Simulation Controls

When running the simulation, you can adjust various parameters using the control panel:

- **Gravity Strength**: Controls how strongly particles attract each other
- **Gravity Radius**: Sets the maximum distance at which particles influence each other
- **Repulsion Distance**: Sets how close particles need to be before they start repelling

## Physics Model

The simulation implements a simplified version of gravitational physics where:

- Each particle has its own mass and velocity
- Gravity follows an inverse square law (F = G _ m1 _ m2 / r²)
- Particles wrap around screen edges to create an infinite space effect
