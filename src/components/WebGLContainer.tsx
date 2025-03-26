"use client";

import { useEffect, useRef } from "react";

// Constants for particle simulation
const NUM_PARTICLES = 2000; // Reduced for better performance with n^2 calculations
const PARTICLE_SPEED = 0.9;
// Using let for gravity so we can adjust it with UI controls
let GRAVITY_STRENGTH = 0.0001; // Particle-to-particle gravity strength
let GRAVITY_RADIUS = 150; // How far gravity reaches
let REPULSION_THRESHOLD = 20; // Distance at which particles start to repel

// Vertex shader with dynamic positions
const vertexShaderSource = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;

  void main() {
    // Convert from pixel space to clip space
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = 3.0;
  }
`;

// Fragment shader for particle color
const fragmentShaderSource = `
  precision mediump float;

  void main() {
    // Light yellow color with some transparency
    gl_FragColor = vec4(1.0, 1.0, 0.8, 0.7);
  }
`;

// Particle system types
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

// WebGL helper functions
class WebGLUtils {
  static createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  static createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }
}

// Particle system class to manage simulation state
class ParticleSystem {
  particles: Particle[];
  positions: Float32Array;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.particles = [];
    this.positions = new Float32Array(NUM_PARTICLES * 2);
    this.initialize();
  }

  initialize() {
    // Create particles with random positions and velocities
    this.particles = [];

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const particle: Particle = {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() * 2 - 1) * PARTICLE_SPEED,
        vy: (Math.random() * 2 - 1) * PARTICLE_SPEED,
        mass: Math.random() * 2 + 0.5, // Random mass between 0.5 and 2.5
      };

      this.particles.push(particle);
    }

    // Initial position update
    this.updatePositionBuffer();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initialize();
  }

  calculateDistance(p1: Particle, p2: Particle): [number, number, number] {
    // Calculate distance vector and magnitude between two particles
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Use Euclidean distance
    const distance = Math.sqrt(dx * dx + dy * dy);

    return [dx, dy, distance];
  }

  update() {
    // Calculate gravitational forces between particles
    // This is a simplified gravitational model

    // For each particle
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];

      // Reset acceleration for this frame
      let totalAccelX = 0;
      let totalAccelY = 0;

      // Calculate forces from all other particles
      for (let j = 0; j < this.particles.length; j++) {
        if (i === j) continue; // Skip self

        const p2 = this.particles[j];

        // Calculate distance and direction
        const [dx, dy, distance] = this.calculateDistance(p1, p2);

        // Only apply gravity within a certain radius for performance
        if (distance < GRAVITY_RADIUS && distance > 0) {
          // Calculate gravitational force
          // F = G * (m1 * m2) / r^2
          // Direction is normalized (dx/distance, dy/distance)

          // Calculate force magnitude with inverse square law
          let forceMagnitude =
            (GRAVITY_STRENGTH * (p1.mass * p2.mass)) / (distance * distance);

          // Add repulsion at very close distances to prevent particles from sticking
          if (distance < REPULSION_THRESHOLD) {
            forceMagnitude = -forceMagnitude * 2; // Repel instead of attract
          }

          // Convert force to acceleration (F = ma, so a = F/m)
          const accelX = (forceMagnitude * dx) / distance / p1.mass;
          const accelY = (forceMagnitude * dy) / distance / p1.mass;

          // Accumulate accelerations
          totalAccelX += accelX;
          totalAccelY += accelY;
        }
      }

      // Apply accumulated acceleration to velocity
      p1.vx += totalAccelX;
      p1.vy += totalAccelY;

      // Add small friction to prevent infinite acceleration
      p1.vx *= 0.995;
      p1.vy *= 0.995;

      // Update position
      p1.x += p1.vx;
      p1.y += p1.vy;

      // Handle boundary collisions - wrap around edges
      if (p1.x < 0) p1.x = this.width;
      if (p1.x > this.width) p1.x = 0;
      if (p1.y < 0) p1.y = this.height;
      if (p1.y > this.height) p1.y = 0;
    }

    // Update position buffer for rendering
    this.updatePositionBuffer();
  }

  updatePositionBuffer() {
    // Copy particle positions to the Float32Array for WebGL
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const bufferIndex = i * 2;

      this.positions[bufferIndex] = p.x;
      this.positions[bufferIndex + 1] = p.y;
    }
  }

  getPositions(): Float32Array {
    return this.positions;
  }
}

export const WebGLContainer = () => {
  // Element refs
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // WebGL refs
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);

  // Animation refs
  const animationRef = useRef<number | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Create controls for simulation parameters
  const createSimulationControls = () => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "20px";
    container.style.left = "20px";
    container.style.padding = "15px";
    container.style.backgroundColor = "rgba(0,0,0,0.6)";
    container.style.borderRadius = "8px";
    container.style.color = "white";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.zIndex = "1000";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";

    // Gravity Strength Control
    const strengthContainer = document.createElement("div");
    const strengthLabel = document.createElement("label");
    strengthLabel.textContent = "Gravity Strength ";
    strengthLabel.style.display = "block";
    strengthLabel.style.marginBottom = "5px";

    const strengthInput = document.createElement("input");
    strengthInput.type = "range";
    strengthInput.min = "0";
    strengthInput.max = "0.0001";
    strengthInput.step = "0.000001";
    strengthInput.value = GRAVITY_STRENGTH.toString();
    strengthInput.style.width = "100%";

    const strengthValue = document.createElement("span");
    strengthValue.textContent = GRAVITY_STRENGTH.toString();
    strengthValue.style.marginLeft = "10px";

    strengthInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const newValue = parseFloat(target.value);
      GRAVITY_STRENGTH = newValue;
      strengthValue.textContent = newValue.toFixed(7);
    });

    strengthContainer.appendChild(strengthLabel);
    strengthContainer.appendChild(strengthInput);
    strengthContainer.appendChild(strengthValue);

    // Gravity Radius Control
    const radiusContainer = document.createElement("div");
    const radiusLabel = document.createElement("label");
    radiusLabel.textContent = "Gravity Radius ";
    radiusLabel.style.display = "block";
    radiusLabel.style.marginBottom = "5px";

    const radiusInput = document.createElement("input");
    radiusInput.type = "range";
    radiusInput.min = "50";
    radiusInput.max = "300";
    radiusInput.step = "10";
    radiusInput.value = GRAVITY_RADIUS.toString();
    radiusInput.style.width = "100%";

    const radiusValue = document.createElement("span");
    radiusValue.textContent = GRAVITY_RADIUS.toString();
    radiusValue.style.marginLeft = "10px";

    radiusInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const newValue = parseFloat(target.value);
      GRAVITY_RADIUS = newValue;
      radiusValue.textContent = newValue.toString();
    });

    radiusContainer.appendChild(radiusLabel);
    radiusContainer.appendChild(radiusInput);
    radiusContainer.appendChild(radiusValue);

    // Repulsion Threshold Control
    const repulsionContainer = document.createElement("div");
    const repulsionLabel = document.createElement("label");
    repulsionLabel.textContent = "Repulsion Distance ";
    repulsionLabel.style.display = "block";
    repulsionLabel.style.marginBottom = "5px";

    const repulsionInput = document.createElement("input");
    repulsionInput.type = "range";
    repulsionInput.min = "5";
    repulsionInput.max = "50";
    repulsionInput.step = "1";
    repulsionInput.value = REPULSION_THRESHOLD.toString();
    repulsionInput.style.width = "100%";

    const repulsionValue = document.createElement("span");
    repulsionValue.textContent = REPULSION_THRESHOLD.toString();
    repulsionValue.style.marginLeft = "10px";

    repulsionInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const newValue = parseFloat(target.value);
      REPULSION_THRESHOLD = newValue;
      repulsionValue.textContent = newValue.toString();
    });

    repulsionContainer.appendChild(repulsionLabel);
    repulsionContainer.appendChild(repulsionInput);
    repulsionContainer.appendChild(repulsionValue);

    // Add all controls to container
    container.appendChild(strengthContainer);
    container.appendChild(radiusContainer);
    container.appendChild(repulsionContainer);

    document.body.appendChild(container);
  };

  // Set up shader program
  const setupShaders = (gl: WebGLRenderingContext) => {
    // Create vertex and fragment shaders
    const vertexShader = WebGLUtils.createShader(
      gl,
      gl.VERTEX_SHADER,
      vertexShaderSource,
    );
    const fragmentShader = WebGLUtils.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );

    if (!vertexShader || !fragmentShader) {
      throw new Error("Failed to create shaders");
    }

    // Create shader program
    const program = WebGLUtils.createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error("Failed to create shader program");
    }

    return program;
  };

  // Animation loop
  const animate = (timestamp: number) => {
    const gl = glRef.current;
    const particleSystem = particleSystemRef.current;

    if (
      !gl ||
      !programRef.current ||
      !particleSystem ||
      !positionBufferRef.current
    )
      return;

    // Update time reference for animation
    lastTimeRef.current = timestamp;

    // Update particle positions
    particleSystem.update();

    // Clear the canvas
    gl.clearColor(0.1, 0.0, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use our shader program
    gl.useProgram(programRef.current);

    // Set resolution uniform
    const resolutionUniformLocation = gl.getUniformLocation(
      programRef.current,
      "u_resolution",
    );
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // Update position buffer with new particle positions
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      particleSystem.getPositions(),
      gl.DYNAMIC_DRAW,
    );

    // Set up attribute for particle positions
    const positionAttributeLocation = gl.getAttribLocation(
      programRef.current,
      "a_position",
    );
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Enable blending for nicer particle rendering
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw particles
    gl.drawArrays(gl.POINTS, 0, NUM_PARTICLES);

    // Request next frame
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize WebGL context
    const gl = canvasRef.current.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }
    glRef.current = gl;

    // Setup initial canvas size
    const updateCanvasSize = () => {
      if (!canvasRef.current || !gl) return;

      // Set canvas dimensions
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      // Initialize or resize particle system
      if (!particleSystemRef.current) {
        particleSystemRef.current = new ParticleSystem(
          gl.canvas.width,
          gl.canvas.height,
        );
      } else {
        particleSystemRef.current.resize(gl.canvas.width, gl.canvas.height);
      }
    };

    // Initialize shaders and buffers
    try {
      // Create shader program
      programRef.current = setupShaders(gl);

      // Create position buffer
      positionBufferRef.current = gl.createBuffer();

      // Initialize canvas and particle system
      updateCanvasSize();

      // Add UI controls for simulation parameters
      createSimulationControls();

      // Start animation loop
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);

      // Add resize listener
      window.addEventListener("resize", updateCanvasSize);
    } catch (error) {
      console.error("Error initializing WebGL:", error);
    }

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Clean up WebGL resources
      if (gl) {
        if (positionBufferRef.current)
          gl.deleteBuffer(positionBufferRef.current);
        if (programRef.current) gl.deleteProgram(programRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
};
