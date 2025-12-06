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

// Helper for retries with exponential backoff and smart delay parsing
const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries: number = 5, // Increased retries for rate limits
  delay: number = 5000 // Increased base delay
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    let errorMessage = error.message || '';

    // Attempt to parse stringified JSON error message to get the inner details
    if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(errorMessage);
            if (parsed.error && parsed.error.message) {
                errorMessage = parsed.error.message;
            }
        } catch (e) {
            // Ignore parse error, use original string
        }
    }

    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests') ||
      error?.status === 'RESOURCE_EXHAUSTED' ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('quota');

    if (isRateLimit && retries > 0) {
      let waitTime = delay;

      // Smart Retry: Extract "Please retry in X s" from the error message
      const match = errorMessage.match(/retry in (\d+(\.\d+)?)s/);
      if (match) {
        // Parse seconds to ms and add 1s buffer
        const secondsToWait = parseFloat(match[1]);
        waitTime = Math.ceil(secondsToWait * 1000) + 1000;
        console.warn(`Rate limit hit. API requested wait. Sleeping for ${waitTime}ms.`);
      } else {
        console.warn(`Rate limit hit. Retrying in ${waitTime}ms... (${retries} attempts left)`);
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      
      // If we found a specific time, use standard exponential backoff for the NEXT try relative to base delay
      // Otherwise double the current delay
      const nextDelay = match ? delay * 2 : delay * 1.5;
      
      return retryOperation(operation, retries - 1, nextDelay);
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

export const suggestContentTopics = async (niche: string): Promise<string[]> => {
  try {
    const ai = getGenAIInstance();
    const prompt = `Suggest 5 engaging, viral, and relevant Facebook post topics for the niche: "${niche}". 
    Target audience: Vietnamese users.
    Output only the topics, one per line, no numbering, no bullet points.`;

    const result = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    });

    return result.split('\n').filter(line => line.trim().length > 0).map(line => line.trim());
  } catch (error) {
    if (error instanceof ApiKeyError) throw error;
    console.error('Error suggesting topics:', error);
    return [];
  }
};

export const generatePostTitle = async (content: string): Promise<string> => {
  try {
    const ai = getGenAIInstance();
    const prompt = `Create a catchy, click-worthy, but professional Facebook headline (Title) for the following content. 
    Language: Vietnamese.
    Keep it under 15 words. Do not use quotes.
    
    Content: "${content.substring(0, 500)}..."`;

    const result = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    });
    return result.trim();
  } catch (error) {
    if (error instanceof ApiKeyError) throw error;
    console.error('Error generating title:', error);
    return '';
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
    const modelName = useHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const config: any = {};
    if (useHighQuality) {
        // High quality model supports specific image sizing: 1K, 2K, 4K
        config.imageConfig = {
            aspectRatio: "1:1",
            imageSize: "4K" // Upgrade to highest resolution
        };
        // Add Safety Settings to prevent generic blocks on creative prompts
        config.safetySettings = [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ];
    } else {
        // Optimization for Speed (Flash Model)
        // Ensure no heavy configs are passed that might slow it down
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

export interface ImagePayload {
  imageBytes: string;
  mimeType: string;
}

export interface VideoConfig {
  model: 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
}

export const generateVideo = async (
  prompt: string,
  images: ImagePayload[] = [], // Changed to array to support multiple reference images
  config: VideoConfig = {
    model: 'veo-3.1-fast-generate-preview',
    resolution: '720p',
    aspectRatio: '16:9'
  }
): Promise<string> => {
  try {
    const ai = getGenAIInstance();

    // Determine payload structure based on input images
    const payload: any = {
      model: config.model,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: config.resolution,
        aspectRatio: config.aspectRatio,
      },
    };

    // Case 1: Multiple Images (Character Consistency / Asset Reference)
    if (images.length > 1) {
       // CONSTRAINT: Multiple reference images REQUIRE 'veo-3.1-generate-preview', '720p', and '16:9'
       payload.model = 'veo-3.1-generate-preview';
       payload.config.resolution = '720p';
       payload.config.aspectRatio = '16:9';
       
       const referenceImagesPayload = images.slice(0, 3).map(img => ({
          image: {
            imageBytes: img.imageBytes,
            mimeType: img.mimeType
          },
          referenceType: 'ASSET' // This tells the model these are consistent assets/characters
       }));
       
       payload.config.referenceImages = referenceImagesPayload;
    } 
    // Case 2: Single Image (Standard Image-to-Video Start Frame)
    else if (images.length === 1) {
        payload.image = {
            imageBytes: images[0].imageBytes,
            mimeType: images[0].mimeType,
        };
    }

    let operation: VideosOperation | GetVideosOperationResponse =
      await retryOperation(async () => await ai.models.generateVideos(payload));

    // POLLING OPTIMIZATION: Reduced check interval from 10000ms (10s) to 2000ms (2s)
    // This significantly improves perceived speed for short video generation (Veo Fast).
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      // Broad check for 404/Not Found in fetch
      if (response.status === 404 || errorBody.includes("Requested entity was not found")) {
        throw new ApiKeyError(
          'Lỗi tải video (404): Không tìm thấy tài nguyên. Có thể Khóa API của bạn không hợp lệ hoặc không có quyền truy cập dự án trả phí.',
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
    
    // Improved error parsing
    let errorMessage = (error as any).message || String(error);
    
    // Try to extract nested JSON message from API error strings
    if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
        try {
            const jsonMatch = errorMessage.match(/\{.*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.error && parsed.error.message) {
                    errorMessage = parsed.error.message;
                }
            }
        } catch (e) {
            // parsing failed, stick to original string
        }
    }

    // Specific check for "Requested entity was not found" (404) which usually means Billing/Project issue for Veo
    if (
        errorMessage.includes('Requested entity was not found') || 
        (errorMessage.includes('404') && errorMessage.includes('NOT_FOUND'))
    ) {
         throw new ApiKeyError(
            'Lỗi Model Veo (404): Không tìm thấy thực thể yêu cầu. Nguyên nhân phổ biến: API Key chưa được liên kết với Dự án Google Cloud có bật Thanh toán (Billing) hoặc model chưa được kích hoạt cho dự án này.',
            'NOT_FOUND_404'
         );
    }

    // Check for Permission/Invalid Key issues
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('PERMISSION_DENIED')) {
         throw new ApiKeyError(
            'Lỗi Quyền (403): API Key không hợp lệ hoặc không có quyền truy cập model Veo. Vui lòng kiểm tra lại.',
            'NOT_FOUND_404'
         );
    }
    
    console.error('Error generating video with Gemini:', error);
    throw error;
  }
};

export interface TrendResult {
  text: string;
  urls: string[];
}

export const generateTrends = async (niche: string): Promise<TrendResult> => {
  try {
    const ai = getGenAIInstance();
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