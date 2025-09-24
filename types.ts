
export interface StoryStep {
  prompt: string;
  narrative: string;
  imageUrl: string;
  choiceMade: string;
}

export interface Choice {
  text: string;
}

export interface NarrativeResponse {
  narrative: string;
  choices: Choice[];
}

export type TtsEngine = 'gemini' | 'browser';