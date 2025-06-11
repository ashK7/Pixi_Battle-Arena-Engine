# Pixi.js Space Battle Arena Engine With React + TypeScript + Vite

A high-performance, real-time 2D space battle game built with Pixi.js and a custom Entity-Component-System (ECS) architecture.

# How the Code Works

The game is structured using ECS (Entity-Component-System), similar to building with LEGO:

Entity: An empty object

Components: Data pieces like position, velocity, or health

Systems: Logic that acts on entities with specific components (like movement, AI, rendering)

# Code Structure Overview

Main App Files (src/)

game.ts: Starts the Pixi.js app and runs the main game loop

Logger.ts: Prints debug logs to the console

playerActions.ts: Connects UI buttons to gameplay logic

ParallaxBackground.ts: Scrolls background layers to add depth

UIOverlay.ts: Handles HUD elements like score and health

# Engine System Files (src/ecs/)

World.ts: Manages all entities and systems in the game

Entity.ts: Represents an individual game object with components

System.ts: Base class used by all systems

PlayerSystem.ts: Handles player input and controls the player ship

EnemySystem.ts: Updates and renders enemy ships

BehaviorSystem.ts: AI logic for enemies (seek, dodge, retreat)

MovementSystem.ts: Moves entities based on velocity

CollisionSystem.ts: Detects and responds to collisions

ProjectileSystem.ts: Manages bullets and rocket entities

BuffDebuffSystem.ts: Applies timed effects like poison or speed reduction

ParticleSystem.ts: Manages visual effects like explosions

TrailSystem.ts: Draws trails behind rockets

BoundarySystem.ts: Removes entities that go off-screen

CameraSystem.ts: Follows the player and adds screen shake on impact

DebugRenderSystem.ts: Renders FPS, hitboxes, and debug overlays

MultiplayerSystem.ts: Sends and receives data for online multiplayer (optional)

# How to Get It Running

Open the project folder in a terminal

Run: npm install

Run: npm run dev

Open your browser to the local URL (usually http://localhost:5173)

# Challenges Tackled

Implemented poison damage that ticks over time

Created endless rocket system with proper cleanup

Designed smooth screen-following camera

Built lightweight, modular ECS from scratch

Added particle trails, HUD, and AI behaviors