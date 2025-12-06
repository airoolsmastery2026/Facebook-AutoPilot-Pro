import { GoogleGenAI, Modality } from '@google/genai';
import type {
  GenerateContentResponse,
  GetVideosOperationResponse,
  VideosOperation,
} from '@google/genai';

// Custom error for API Key issues
export class ApiKeyError extends Error {
  constructor(message: string, public readonly type: 'MISSING' | 'NOT_FOUND_404') {
    super(message);
    this.name = 'ApiKeyError';
  }
}

// Function to get GoogleGenAI instance. It ensures the latest API_KEY is used.
// It prioritizes the key from localStorage (user input), then process.env.
const getGenAIInstance = (): GoogleGenAI => {
  let apiKey = '';
  
  // 1. Try to get from LocalStorage (User entered via Settings/Login)
  if (typeof window !== 'undefined') {
    const storedKey = window.localStorage.getItem('gemini-api-key');
    if (storedKey) apiKey = storedKey;
  }

  // 2. Fallback to Environment Variable
  if (!apiKey && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }

  if (!apiKey) {
    throw new ApiKeyError(
      'Chưa cấu hình Gemini API Key. Vui lòng nhập khóa trong phần Cài đặt hoặc biến môi trường.',
      'MISSING'
    );
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for retries with exponential backoff
const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      (error?.message && error.message.includes('429')) ||
      (error?.statusText && error.statusText.includes('Too Many Requests')) ||
      error?.status === 'RESOURCE_EXHAUSTED' ||
      (error?.message && error.message.includes('RESOURCE_EXHAUSTED'));

    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit exceeded. Retrying in ${delay}ms...`, error.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const generateText = async (prompt: string): Promise<string> => {
  try {
    const ai = getGenAIInstance();
    return await retryOperation(async () => {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    });
  } catch (error) {
    if (error instanceof ApiKeyError) {
      throw error;
    }
    console.error('Error generating text with Gemini:', error);
    return `Lỗi: ${(error as Error).message}`;
  }
};

export const generateImagePromptFromContent = async (content: string): Promise<string> => {
  try {
    const ai = getGenAIInstance();
    const prompt = `Analyze the following Facebook post content and create a highly detailed, creative image generation prompt (in English) that visually represents the core message, mood, or subject of the post. 
    The prompt should specify artistic style, lighting, and details. Keep it under 50 words.
    
    Post Content: "${content}"
    
    Image Prompt:`;

    return await retryOperation(async () => {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    });
  } catch (error) {
    if (error instanceof ApiKeyError) throw error;
    console.error('Error generating image prompt:', error);
    return '';
  }
};

export const generateComment = async (
  postTopic: string,
  userInterests: string,
  exampleComments: string,
): Promise<string> => {
  try {
    const ai = getGenAIInstance();
    const prompt = `You are a Facebook user whose interests include: ${userInterests}.
      You are commenting on a post about "${postTopic}".
      Here are some examples of the types of comments you leave:
      ---
      ${exampleComments}
      ---
      Based on this, write a short, natural, and engaging comment for the post.
      The comment should be one or two sentences at most. Do not use hashtags.
      Do not wrap the comment in quotes.`;

    return await retryOperation(async () => {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    });
  } catch (error) {
    if (error instanceof ApiKeyError) {
      throw error;
    }
    console.error('Error generating comment with Gemini:', error);
    return 'Lỗi: Không thể tạo bình luận.';
  }
};

export const generateImage = async (
  prompt: string,
  useHighQuality: boolean = false
): Promise<string | null> => {
  try {
    const ai = getGenAIInstance();
    
    // Select model based on quality preference
    // 'gemini-2.5-flash-image' (Nano Banana) for speed/standard
    // 'gemini-3-pro-image-preview' for high quality
    const modelName = useHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const config: any = {};
    if (useHighQuality) {
        // High quality model supports specific image sizing
        config.imageConfig = {
            aspectRatio: "1:1",
            imageSize: "1K"
        };
    }

    const response: GenerateContentResponse = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: prompt }],
        },
        config: config, 
      });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    return null; // Should not happen if API call is successful
  } catch (error) {
    if (error instanceof ApiKeyError) {
      throw error;
    }
    console.error('Error generating image with Gemini:', error);
    return null;
  }
};

interface ImagePayload {
  imageBytes: string;
  mimeType: string;
}

export const generateVideo = async (
  prompt: string,
  image: ImagePayload | null = null,
): Promise<string> => {
  try {
    const ai = getGenAIInstance(); // Get fresh instance with latest API key

    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
      },
    };

    if (image) {
      payload.image = {
        imageBytes: image.imageBytes,
        mimeType: image.mimeType,
      };
    }

    // Wrap the initial generation request in retry
    let operation: VideosOperation | GetVideosOperationResponse =
      await retryOperation(async () => await ai.models.generateVideos(payload));

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      // Wrap the polling request in retry as well
      operation = await retryOperation(async () => 
        await ai.operations.getVideosOperation({
          operation: operation as VideosOperation,
        })
      );
    }

    const downloadLink = (operation as GetVideosOperationResponse).response
      ?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error(
        'Video generation succeeded but no download link was provided.',
      );
    }

    // Determine which key was used (Local or Env)
    let apiKey = '';
    if (typeof window !== 'undefined') {
       apiKey = window.localStorage.getItem('gemini-api-key') || '';
    }
    if (!apiKey) apiKey = process.env.API_KEY || '';

    if (!apiKey) {
      throw new ApiKeyError(
        'Gemini API key is not configured for video download.',
        'MISSING'
      );
    }

    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) {
      const errorBody = await response.text();
      // Check for specific 404 error from the fetch response
      if (response.status === 404 && errorBody.includes("Requested entity was not found.")) {
        throw new ApiKeyError(
          'Khóa API được chọn có thể không hợp lệ hoặc không liên kết với dự án tính phí. Vui lòng kiểm tra lại.',
          'NOT_FOUND_404'
        );
      }
      throw new Error(`Failed to download video: ${response.statusText} - ${errorBody}`);
    }
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    if (error instanceof ApiKeyError) {
      throw error;
    }
    // Check if the original error object from ai.models.generateVideos contains a 404 message
    let errorMessage = (error as Error).message;
    if (typeof errorMessage === 'string' && errorMessage.startsWith('{') && errorMessage.endsWith('}')) {
      try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError.error?.code === 404 && parsedError.error?.message === "Requested entity was not found.") {
          throw new ApiKeyError(
             'Khóa API được chọn có thể không hợp lệ hoặc không liên kết với dự án tính phí. Vui lòng kiểm tra lại.',
            'NOT_FOUND_404'
          );
        }
      } catch (parseError) {
        // Not a JSON error string, proceed with original message
      }
    } else if ((error as any)?.error?.code === 404 && (error as any)?.error?.message === "Requested entity was not found.") {
      // This path is for direct error objects from the SDK
      throw new ApiKeyError(
         'Khóa API được chọn có thể không hợp lệ hoặc không liên kết với dự án tính phí. Vui lòng kiểm tra lại.',
        'NOT_FOUND_404'
      );
    }
    console.error('Error generating video with Gemini:', error);
    throw error;
  }
};

// --- NEW FEATURES ---

export interface TrendResult {
  text: string;
  urls: string[];
}

export const generateTrends = async (niche: string): Promise<TrendResult> => {
  try {
    const ai = getGenAIInstance();
    // Using gemini-2.5-flash with googleSearch tool for real-time grounding
    const response: GenerateContentResponse = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `What are 3 trending topics or news right now related to "${niche}" in Vietnam? Provide a short summary list.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    });

    const text = response.text || 'Không tìm thấy xu hướng.';
    
    // Extract URLs from grounding metadata
    const urls: string[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        urls.push(chunk.web.uri);
      }
    });

    return { text, urls };
  } catch (error) {
    if (error instanceof ApiKeyError) throw error;
    console.error('Error generating trends:', error);
    return { text: 'Không thể tải xu hướng lúc này.', urls: [] };
  }
};

export const analyzeSentimentAndReply = async (comment: string): Promise<{ sentiment: string; reply: string }> => {
  try {
    const ai = getGenAIInstance();
    const prompt = `Analyze the sentiment of this Facebook comment: "${comment}". 
    Classify it as 'Positive', 'Negative', or 'Inquiry'.
    Then, write a polite, professional, and short reply in Vietnamese.
    
    Format the output exactly like this:
    Sentiment: [Sentiment]
    Reply: [Reply text]`;

    const response = await retryOperation(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
    });

    const text = response.text || '';
    const sentimentMatch = text.match(/Sentiment:\s*(.*)/i);
    const replyMatch = text.match(/Reply:\s*(.*)/is);

    return {
      sentiment: sentimentMatch ? sentimentMatch[1].trim() : 'Neutral',
      reply: replyMatch ? replyMatch[1].trim() : 'Cảm ơn bạn đã quan tâm!',
    };
  } catch (error) {
     if (error instanceof ApiKeyError) throw error;
     console.error('Error analyzing sentiment:', error);
     return { sentiment: 'Error', reply: 'Lỗi kết nối AI.' };
  }
}