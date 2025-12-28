import { World } from "miniplex";
import { Entity } from "./components";

// The Global ECS World
export const world = new World<Entity>();

// Archetypes (Pre-filtered queries for performance)
export const movingEntities = world.with("body", "input");
