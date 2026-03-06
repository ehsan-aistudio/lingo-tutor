import { GoogleGenAI, Type, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getUsefulIdioms = async () => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Provide a list of 5 useful English idioms for an intermediate learner. Return JSON with an array of objects, each containing "idiom", "meaning", and "example".',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            idiom: { type: Type.STRING },
            meaning: { type: Type.STRING },
            example: { type: Type.STRING },
          },
          required: ['idiom', 'meaning', 'example'],
        }
      },
    },
  });
  return JSON.parse(response.text || '[]');
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
      { text: 'Transcribe this audio accurately. Only return the transcription. Do not add any extra text.' },
    ],
  });
  return response.text;
};

export const checkGrammar = async (text: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following text for grammar mistakes. If there are mistakes, explain them simply and provide the corrected version. If it's correct, say so. Text: "${text}"`,
  });
  return response.text;
};

export const createChatSession = (systemInstruction: string) => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
    },
  });
};

export const connectLiveTutor = (scenario: string, onAudio: (base64: string) => void, onInterrupted: () => void) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onmessage: (message: any) => {
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
          onAudio(base64Audio);
        }
        if (message.serverContent?.interrupted) {
          onInterrupted();
        }
      }
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: `You are a patient, encouraging English tutor. We are doing a roleplay: ${scenario}. You start the conversation. Respond naturally to keep the conversation going. If I make a grammar mistake, highlight it and explain why it was wrong in simple terms. Suggest one 'Level Up' word in every response (a more advanced synonym for a word I used). Keep your language level at B2 (Upper Intermediate) unless I ask to go higher.`,
    },
  });
};

export const getUsefulSentences = async () => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Provide a list of 5 useful English sentences for everyday conversation for an intermediate learner. Return JSON with an array of objects, each containing "sentence", "context" (when to use it), and "meaning".',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sentence: { type: Type.STRING },
            context: { type: Type.STRING },
            meaning: { type: Type.STRING },
          },
          required: ['sentence', 'context', 'meaning'],
        }
      },
    },
  });
  return JSON.parse(response.text || '[]');
};

export const getUsefulGrammar = async () => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Provide a list of 5 useful English grammar rules or tips for an intermediate learner. Return JSON with an array of objects, each containing "rule" (the name of the rule), "explanation" (simple explanation), and "example" (a sentence demonstrating it).',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rule: { type: Type.STRING },
            explanation: { type: Type.STRING },
            example: { type: Type.STRING },
          },
          required: ['rule', 'explanation', 'example'],
        }
      },
    },
  });
  return JSON.parse(response.text || '[]');
};

export const getNewRoleplays = async () => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Provide a list of 3 unique, everyday English roleplay scenarios for an intermediate learner. Return JSON with an array of objects, each containing "title" (short name), "emoji" (a fitting emoji), and "category" (e.g., "Travel", "Professional", "Everyday Life", "Socializing").',
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            emoji: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ['title', 'emoji', 'category'],
        }
      },
    },
  });
  return JSON.parse(response.text || '[]');
};

export const generateSpeech = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
