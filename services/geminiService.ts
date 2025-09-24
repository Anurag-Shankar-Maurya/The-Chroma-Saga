
import { GoogleGenAI, Type } from "@google/genai";
import type { StoryStep, NarrativeResponse, Choice } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const textModel = 'gemini-2.5-flash';
const imageModel = 'imagen-4.0-generate-001';

const narrativeSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "A short, engaging paragraph to continue the story."
    },
    choices: {
      type: Type.ARRAY,
      description: "Two distinct choices for the user to make.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The text for the choice button."
          }
        },
        required: ["text"]
      }
    }
  },
  required: ["narrative", "choices"]
};

export const generateNarrativeAndChoices = async (previousPrompt: string, choiceText: string): Promise<NarrativeResponse> => {
  const prompt = choiceText 
    ? `The story so far: "${previousPrompt}". The user chose to "${choiceText}". Continue the story with a new narrative and two new choices. The narrative should be a single, concise paragraph.`
    : `Create a brief, engaging fantasy story narrative based on this prompt: "${previousPrompt}". Provide two choices for the user to continue the story. The narrative should be a single, concise paragraph.`;
  
  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: narrativeSchema,
      }
    });

    const jsonString = response.text.trim();
    const parsedResponse = JSON.parse(jsonString);
    
    // Validate response structure
    if (parsedResponse && Array.isArray(parsedResponse.choices) && parsedResponse.choices.length > 0) {
       return parsedResponse;
    } else {
       console.error("Invalid structure in parsed JSON:", parsedResponse);
       // Fallback: generate a generic continuation
       return {
          narrative: "The path ahead is shrouded in mystery, yet you must press on.",
          choices: [{text: "Continue cautiously"}, {text: "Forge ahead boldly"}]
       };
    }

  } catch (error) {
    console.error('Error generating narrative:', error);
    throw new Error('Failed to generate narrative and choices from Gemini API.');
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error("No image data received from API.");
  } catch (error) {
    console.error('Error generating image:', error);
    throw new Error('Failed to generate image from Gemini API.');
  }
};

export const generateLore = async (currentNarrative: string): Promise<string> => {
  const prompt = `Based on the following fantasy narrative, generate a short, one-paragraph piece of hidden lore, a description of a mythical artifact, or a historical detail. Do not use the phrase "hidden lore" or "mythical artifact". Just provide the text. Narrative: "${currentNarrative}"`;
  
  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error generating lore:', error);
    throw new Error('Failed to generate lore from Gemini API.');
  }
};

export const generateEpilogue = async (storyHistory: StoryStep[]): Promise<string> => {
  const fullNarrative = storyHistory.map(step => step.narrative).join(' ');
  const prompt = `Based on the following fantasy saga, write a concise, one-paragraph epilogue that concludes the story. Focus on the main character's journey and provide a sense of closure or a hint of a new adventure. The saga's story so far: "${fullNarrative}"`;

  try {
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error generating epilogue:', error);
    throw new Error('Failed to generate epilogue from Gemini API.');
  }
};
