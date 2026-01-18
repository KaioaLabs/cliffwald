import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UIManager } from '../UIManager';

// Mock DOM
const mockElement = () => ({
    classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
        toggle: vi.fn()
    },
    style: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
});

describe('UIManager State Transitions', () => {
    let uiManager: UIManager;
    let mockScene: any;
    let mockNetwork: any;
    
    // DOM Elements
    let loginScreen: any;
    let introScreen: any;
    let gameUI: any;

    beforeEach(() => {
        loginScreen = mockElement();
        introScreen = mockElement();
        gameUI = mockElement();

        vi.stubGlobal('document', {
            getElementById: (id: string) => {
                if (id === 'login-screen') return loginScreen;
                if (id === 'intro-screen') return introScreen;
                if (id === 'game-ui') return gameUI;
                return mockElement();
            },
            querySelectorAll: () => [],
            createElement: () => mockElement(),
            body: { appendChild: vi.fn() }
        });

        mockScene = {
            add: { text: vi.fn().mockReturnValue({ setScrollFactor: vi.fn(), setDepth: vi.fn() }) },
            sound: { add: vi.fn(), mute: false },
            scale: { on: vi.fn() },
            input: { keyboard: { on: vi.fn() } }
        };
        mockNetwork = {};

        uiManager = new UIManager(mockScene, mockNetwork);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should set INTRO state correctly', () => {
        uiManager.setGameState('INTRO');
        
        expect(introScreen.classList.remove).toHaveBeenCalledWith('hidden'); // Visible
        expect(loginScreen.classList.remove).toHaveBeenCalledWith('hidden'); // Visible behind
        expect(gameUI.classList.add).toHaveBeenCalledWith('hidden'); // Hidden
    });

    it('should set LOGIN state correctly', () => {
        uiManager.setGameState('LOGIN');
        
        expect(introScreen.classList.add).toHaveBeenCalledWith('hidden'); // Hidden
        expect(loginScreen.classList.remove).toHaveBeenCalledWith('hidden'); // Visible
        expect(gameUI.classList.add).toHaveBeenCalledWith('hidden'); // Hidden
    });

    it('should set PLAYING state correctly', () => {
        uiManager.setGameState('PLAYING');
        
        expect(introScreen.classList.add).toHaveBeenCalledWith('hidden'); // Hidden
        expect(loginScreen.classList.add).toHaveBeenCalledWith('hidden'); // Hidden
        expect(gameUI.classList.remove).toHaveBeenCalledWith('hidden'); // Visible
    });
});
