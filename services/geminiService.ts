
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MovieScene, GenerationConfig } from "../types";

export const analyzeScript = async (fileBase64: string, config: GenerationConfig): Promise<MovieScene> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this movie script and extract a cinematic scene that fits the following parameters:
    - Target Genre: ${config.genre}
    - Target Mood: ${config.mood}
    - Camera Movement Style: ${config.camera}
    - Required Character Archetypes to feature: ${config.archetypes.join(', ')}

    Your task:
    1. Identify or adapt a scene from the PDF that best matches these parameters.
    2. Provide a compelling movie title.
    3. Write a short cinematic description of the scene's emotional core.
    4. Create a highly detailed visual prompt for an AI video generator. 
       CRITICAL: Start the prompt by describing the camera movement: "${config.camera}". 
       Include details about lighting (e.g., volumetric, high-contrast), texture, 
       and specific details about the environment and character actions that reflect the ${config.mood} mood.
    5. List which characters/archetypes are featured.
    ${config.includeSubtitles ? `6. Generate exactly 2-4 lines of cinematic dialogue (subtitles) that match the visual prompt. Each subtitle must have a startTime and endTime (in seconds, between 0 and 6).` : ''}
  `;

  const responseSchema: any = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      visualPrompt: { type: Type.STRING },
      genre: { type: Type.STRING },
      mood: { type: Type.STRING },
      characters: { 
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["title", "description", "visualPrompt", "genre", "mood", "characters"]
  };

  if (config.includeSubtitles) {
    responseSchema.properties.subtitles = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          startTime: { type: Type.NUMBER },
          endTime: { type: Type.NUMBER },
          text: { type: Type.STRING }
        },
        required: ["startTime", "endTime", "text"]
      }
    };
    responseSchema.required.push("subtitles");
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: 'application/pdf'
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to analyze script");
  return JSON.parse(text) as MovieScene;
};

export const generateStoryboard = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Nano Banana (gemini-2.5-flash-image) for fast storyboard generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: prompt + " --aspect-ratio 16:9 --style cinematic --high-quality" }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to generate storyboard image");
};

export const generateVideo = async (prompt: string, onProgress: (msg: string) => void): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onProgress("Initializing cinematic engine...");
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  });

  const progressMessages = [
    "Drafting storyboards...",
    "Setting up virtual lighting...",
    "Capturing initial frames...",
    "Refining textures...",
    "Applying cinematic color grade...",
    "Finalizing render..."
  ];

  let msgIndex = 0;
  while (!operation.done) {
    onProgress(progressMessages[msgIndex % progressMessages.length]);
    msgIndex++;
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");
  
  return `${downloadLink}&key=${process.env.API_KEY}`;
};
