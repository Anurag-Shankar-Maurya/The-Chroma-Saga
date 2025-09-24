

export interface StoryStep {
  id: string;
  parentId: string | null;
  narrative: string;
  imageUrl: string;
  choiceMade: string; // The choice from parent that led to this step
  promptForStep: string; // The narrative from parent used to generate this
  choices: Choice[];
  childrenIds: { [choiceText: string]: string };
}

export interface Choice {
  text: string;
}

export interface NarrativeResponse {
  narrative: string;
  choices: Choice[];
}

export type TtsEngine = 'gemini' | 'browser';