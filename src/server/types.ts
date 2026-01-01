import { Client } from "colyseus";

// Fix: Simplified to just what we need, or use any if we want to bypass strict inheritance check
// for internal properties.
export interface ExtendedClient extends Client {
    userData?: any;
}