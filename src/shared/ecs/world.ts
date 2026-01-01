import { World } from "miniplex";
import { Entity } from "./components";

export type ECSWorld = World<Entity>;

export const createWorld = () => new World<Entity>();