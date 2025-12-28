export interface QuestStep {
    description: string;
    targetId?: string;
    count?: number;
}

export interface Quest {
    id: string;
    title: string;
    steps: QuestStep[];
    reward: { itemId: string; count: number }[];
}

export const QuestRegistry: Record<string, Quest> = {
    "q_intro": {
        id: "q_intro",
        title: "Welcome to Cliffwald",
        steps: [
            { description: "Talk to the Village Elder", targetId: "NPC_1" }
        ],
        reward: [ { itemId: "potion_hp", count: 1 } ]
    }
};
