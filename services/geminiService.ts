import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { StoryStep, NarrativeResponse, Choice } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const textModel = 'gemini-2.5-flash';
const imageGenerationModel = 'gemini-2.5-flash-image-preview';
const ttsModel = 'gemini-2.5-flash-preview-tts';

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

// --- Audio Helper Functions ---
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcmData: ArrayBuffer, sampleRate: number): Blob {
    const pcm16 = new Int16Array(pcmData);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);

    // WAV header
    view.setUint32(0, 0x46464952, true); // "RIFF"
    view.setUint32(4, 36 + pcm16.length * 2, true); // file size
    view.setUint32(8, 0x45564157, true); // "WAVE"
    view.setUint32(12, 0x20746d66, true); // "fmt "
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // num channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, byteRate, true); // byte rate
    view.setUint16(32, blockAlign, true); // block align
    view.setUint16(34, bitsPerSample, true); // bits per sample
    view.setUint32(36, 0x61746164, true); // "data"
    view.setUint32(40, pcm16.length * 2, true); // data chunk size

    // PCM data
    let offset = 44;
    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(offset, pcm16[i], true);
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
}


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
    
    if (parsedResponse && Array.isArray(parsedResponse.choices) && parsedResponse.choices.length > 0) {
       return parsedResponse;
    } else {
       console.error("Invalid structure in parsed JSON:", parsedResponse);
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

export const generateImage = async (prompt: string, previousImageUrl?: string): Promise<string> => {
  try {
    const parts: ({ inlineData: { mimeType: string; data: string } } | { text: string })[] = [];

    // Always add the text prompt
    parts.push({ text: prompt });

    // If there's a previous image, add it as the first part for image-to-image generation
    if (previousImageUrl) {
        const mimeType = previousImageUrl.substring(previousImageUrl.indexOf(":") + 1, previousImageUrl.indexOf(";"));
        const base64Data = previousImageUrl.split(',')[1];
        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            },
        };
        parts.unshift(imagePart);
    }

    const response = await ai.models.generateContent({
        model: imageGenerationModel,
        contents: { parts: parts },
        config:{
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        }
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const imageMimeType = part.inlineData.mimeType;
            return `data:${imageMimeType};base64,${base64ImageBytes}`;
        }
    }
    
    throw new Error("No image data received from image generation API.");

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

export const generateTtsAudio = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: ttsModel,
            contents: {
                parts: [{ text }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Iapetus" }
                    }
                }
            }
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData && audioPart.inlineData.mimeType.startsWith("audio/L16")) {
            const base64Data = audioPart.inlineData.data;
            const sampleRateMatch = audioPart.inlineData.mimeType.match(/rate=(\d+)/);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
            
            const pcmData = base64ToArrayBuffer(base64Data);
            const wavBlob = pcmToWav(pcmData, sampleRate);
            return URL.createObjectURL(wavBlob);
        }
        throw new Error("No valid audio data received.");
    } catch (error) {
        console.error('Error generating TTS audio:', error);
        throw new Error('Failed to generate TTS audio from Gemini API.');
    }
};