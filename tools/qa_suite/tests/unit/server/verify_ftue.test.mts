import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpawnManager } from '../../../../../src/server/managers/SpawnManager';

// Mock Dependencies
vi.mock('../../../../../src/server/managers/SpawnManager', () => {
    return {
        SpawnManager: class {
            constructor() {}
            getSpawnPoint = vi.fn().mockReturnValue({ x: 1000, y: 1000 });
            findAvailableEcho = vi.fn().mockReturnValue({ id: 'echo_1' });
            possessEcho = vi.fn().mockResolvedValue({ id: 1 });
            restoreEcho = vi.fn();
            loadSeats = vi.fn();
            spawnEchoes = vi.fn();
            spawnFromMap = vi.fn();
        }
    };
});

describe('FTUE Logic (First Time User Experience)', () => {
    let room: any;
    let spawnManager: any;

    beforeEach(() => {
        // Partial Mock of WorldRoom
        room = {
            spawnManager: new SpawnManager(null as any, null as any, null as any, null as any),
            state: { players: new Map() },
            onMessage: vi.fn(),
            setSimulationInterval: vi.fn(),
            setState: vi.fn(),
            presence: { subscribe: vi.fn() },
            
            // Mock Methods needed for onJoin flow
            onJoin: async function(client: any, options: any) {
                const session = { 
                    dbPlayer: { 
                        x: 300, 
                        y: 300, 
                        id: 1, 
                        username: "NewUser",
                        inventory: []
                    } 
                };

                // Simulate Returning Player scenario by checking client ID in test
                if (client.sessionId === 'sess_returning') {
                    session.dbPlayer.x = 500;
                    session.dbPlayer.y = 600;
                }

                let overridePos;
                if (session.dbPlayer.x === 300 && session.dbPlayer.y === 300) {
                    overridePos = this.spawnManager.getSpawnPoint();
                }

                await this.spawnManager.possessEcho('echo_1', client.sessionId, {}, overridePos);
            }
        };
        spawnManager = room.spawnManager;
    });

    it('should force spawn at Great Hall if player coordinates are default (300,300)', async () => {
        const client = { sessionId: 'sess_new' };
        await room.onJoin(client, {});

        expect(spawnManager.getSpawnPoint).toHaveBeenCalled();
        expect(spawnManager.possessEcho).toHaveBeenCalledWith(
            'echo_1', 
            'sess_new', 
            expect.anything(), 
            { x: 1000, y: 1000 }
        );
    });

    it('should NOT force spawn if player has custom coordinates (Returning Player)', async () => {
        const client = { sessionId: 'sess_returning' };
        await room.onJoin(client, {});

        expect(spawnManager.possessEcho).toHaveBeenCalledWith(
            'echo_1', 
            'sess_returning', 
            expect.anything(), 
            undefined 
        );
    });
});