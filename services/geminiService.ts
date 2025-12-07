import { GoogleGenAI, Modality } from '@google/genai';
import type {
  GenerateContentResponse,
  GetVideosOperationResponse,
  VideosOperation,
} from '@google/genai';
import type { TopicAnalysis } from '../types';

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
  retries: number = 10, // Increased retries for rate limits
  delay: number = 5000 // Increased base delay
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // 1. Extract detailed error message
      let errorMessage = error.message || '';
      
      // Attempt to parse stringified JSON error message to get the inner details
      if (typeof errorMessage === 'string') {
          const jsonMatch = errorMessage.match(/(\{.*\})/s);
          if (jsonMatch) {
              try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.error && parsed.error.message) {
                      errorMessage = parsed.error.message;
                  } else if (parsed.message) {
                      errorMessage = parsed.message;
                  }
              } catch (e) {
                  // Ignore parse error
              }
          }
      }

      // 2. Detect Rate Limit
      const isRateLimit =
        error?.status === 429 ||
        error?.code === 429 ||
        errorMessage.includes('429') ||
        errorMessage.includes('Too Many Requests') ||
        error?.status === 'RESOURCE_EXHAUSTED' ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota');

      if (isRateLimit && attempt < retries) {
        let waitTime = delay * Math.pow(1.5, attempt); // Standard exponential

        // 3. Smart Retry: Extract "Please retry in X s" from the error message
        const match = errorMessage.match(/retry in\s+(\d+(\.\d+)?)\s*s/i);
        if (match) {
          const secondsToWait = parseFloat(match[1]);
          // Add 2 seconds buffer to be safe against server/client clock drift
          waitTime = Math.ceil(secondsToWait * 1000) + 2000;
          console.warn(`[Gemini Service] Rate limit hit. API requested wait: ${secondsToWait}s. Sleeping for ${waitTime}ms.`);
        } else {
          console.warn(`[Gemini Service] Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${retries})`);
        }

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If we are here, it's either not a rate limit or we ran out of retries
      throw error;
    }
  }
  throw lastError;
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

// NEW: Suggest related niches for Trend Agent
export const suggestRelatedNiches = async (niche: string): Promise<string[]> => {
  try {
    const ai = getGenAIInstance();
    const prompt = `Based on the topic "${niche}", suggest 5 specific, related sub-niches or search terms that are popular right now in Vietnam.
    Output only the terms, comma separated.`;

    const result = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    });

    return result.split(',').map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error('Error suggesting related niches:', error);
    return [];
  }
};

// NEW: Advanced Topic Analysis using Google Search
export const getDeepTopicAnalysis = async (niche: string): Promise<TopicAnalysis> => {
  try {
    const ai = getGenAIInstance();
    // Using Search Grounding to get real data
    const prompt = `Analyze the topic "${niche}" in Vietnam context.
    Using Google Search, identify:
    1. 5 "Trending" topics (Newest, Viral, Breaking News in last 24h/48h).
    2. 5 "Popular" topics (High search volume, evergreen questions, most cared about).
    3. 5 "Related" topics (Semantic related keywords, sub-niches).

    Output the result exactly in this format (no markdown bolding):
    TRENDING:
    - [Topic 1]
    - [Topic 2]
    ...
    POPULAR:
    - [Topic 1]
    - [Topic 2]
    ...
    RELATED:
    - [Topic 1]
    - [Topic 2]
    ...
    `;

    const resultText = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Flash is good for search aggregation
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }] // Enable search for "Most Newest/Popular" accuracy
        }
      });
      return response.text;
    });

    // Parse the response
    const analysis: TopicAnalysis = { trending: [], popular: [], related: [] };
    const lines = resultText.split('\n');
    let currentSection: 'trending' | 'popular' | 'related' | null = null;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('TRENDING:')) { currentSection = 'trending'; continue; }
      if (cleanLine.startsWith('POPULAR:')) { currentSection = 'popular'; continue; }
      if (cleanLine.startsWith('RELATED:')) { currentSection = 'related'; continue; }

      if (currentSection && (cleanLine.startsWith('-') || cleanLine.startsWith('•'))) {
        const topic = cleanLine.replace(/^[-•]\s*/, '').trim();
        if (topic) analysis[currentSection].push(topic);
      }
    }

    return analysis;

  } catch (error) {
    if (error instanceof ApiKeyError) throw error;
    console.error('Error in deep topic analysis:', error);
    // Fallback structure
    return { trending: [], popular: [], related: [] };
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

export const generateVideoPromptFromContent = async (
  content: string, 
  characterDesc?: string, 
  images: ImagePayload[] = []
): Promise<string> => {
  try {
    const ai = getGenAIInstance();
    
    let basePrompt = `Create a prompt for a video generation model (like Veo/Sora). The video should visualize this content: "${content.substring(0, 200)}..."`;
    
    if (characterDesc) {
      basePrompt += `\nCRITICAL: The main character must match this description: "${characterDesc}".`;
    }
    
    if (images.length > 0) {
      basePrompt += `\nNote: Reference images are provided. The video prompt should describe movement and action starting from these references.`;
    }

    basePrompt += `\nOutput ONLY the English prompt. Describe the camera movement, lighting (Cinematic), and action. Keep it under 60 words.`;

    const result = await retryOperation(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: basePrompt,
      });
      return response.text;
    });
    return result.trim();
  } catch (error) {
    // Fallback if AI fails
    return `Cinematic video about: ${content.substring(0, 50)}`;
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

// IMPROVED: Generate Thumbnail with 16:9 aspect ratio and visual optimization
export const generateThumbnail = async (title: string, niche: string): Promise<string | null> => {
  try {
    const ai = getGenAIInstance();
    
    // Prompt specifically optimized for High CTR, Vibrance, and High Contrast
    const prompt = `Create a viral, high-CTR YouTube/Facebook video thumbnail for a video about "${niche}" with the title "${title}". 
    Visual Style: High Contrast, Vibrant and Saturated Colors, Dramatic Lighting.
    Composition: Central subject, clean background, rule of thirds, professional digital art, hyper-realistic, 4k resolution.
    Emotion: Exciting, curious, or shocking.
    Make it visually striking to stop the scroll.
    IMPORTANT: No text inside the image (text will be added as overlay).`;
    
    // Thumbnails usually need high quality and 16:9 aspect ratio
    const config: any = {
       imageConfig: {
          aspectRatio: "16:9", // Standard video cover format
          imageSize: "2K" // Good balance
       }
    };
    
    // Auto-fallback: If Pro model fails (due to free key), use Flash Image
    try {
        const response: GenerateContentResponse = await retryOperation(async () => {
          return await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', // Use Pro model for best thumbnail results
            contents: { parts: [{ text: prompt }] },
            config: config, 
          });
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          }
        }
    } catch (proError: any) {
         // Fallback logic for free key users
         if (proError.message?.includes('404') || proError.message?.includes('PERMISSION_DENIED') || proError.type === 'NOT_FOUND_404') {
             console.warn("Pro model failed (likely free key). Falling back to Flash Image.");
             return await generateImage(prompt, false); // Use standard flash generation
         }
         throw proError;
    }
    return null;
  } catch (error) {
    if (error instanceof ApiKeyError) throw error;
    console.error('Error generating thumbnail:', error);
    return null;
  }
};

export const generateImage = async (
  prompt: string,
  useHighQuality: boolean = false
): Promise<string | null> => {
  try {
    const ai = getGenAIInstance();
    
    // Select model based on quality preference
    let modelName = useHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    let config: any = {};

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
    }

    try {
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
    } catch (err: any) {
        // === AUTO FALLBACK FOR FREE KEYS ===
        // If the user tried "High Quality" (Pro) but failed with a Billing/Permission error (404/403),
        // we automatically try again with the Free Tier model (Flash Image).
        if (useHighQuality && (err.message?.includes('404') || err.message?.includes('PERMISSION_DENIED') || err.type === 'NOT_FOUND_404')) {
            console.warn("High Quality Image Gen failed (Billing/Permission). Automatically falling back to Free Tier (Flash Image).");
            // Recursive call forcing low quality
            return await generateImage(prompt, false);
        }
        throw err;
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
          'Lỗi tải video (404): Không tìm thấy tài nguyên. Có thể Khóa API của bạn không hợp lệ hoặc không có quyền truy cập dự án trả phí (Billing).',
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
            'Lỗi Model Veo (404): Không tìm thấy thực thể. Vui lòng kiểm tra Billing/Tín dụng của dự án Google Cloud liên kết với API Key.',
            'NOT_FOUND_404'
         );
    }

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

export const analyzeSentimentAndReply = async (
  comment: string,
  shopLink?: string // Optional parameter to inject product context
): Promise<{ sentiment: string; reply: string }> => {
  try {
    const ai = getGenAIInstance();
    
    let contextInstruction = "";
    if (shopLink && shopLink.trim().length > 0) {
      contextInstruction = `\nCONTEXT: The user is running a shop. The product link or cart link is: "${shopLink}".
      INSTRUCTION: If the comment is an INQUIRY (asking for price, shipping, details) or POSITIVE (compliment), you MUST naturally include this link in your reply (e.g., "Mời bạn xem thêm tại: ${shopLink}" or "Đặt hàng ngay tại: ${shopLink}").
      However, if the sentiment is NEGATIVE, DO NOT include the link. Instead, apologize and ask them to Direct Message (Inbox).`;
    }

    const prompt = `Analyze the sentiment of this Facebook comment: "${comment}". 
    Classify it as 'Positive', 'Negative', or 'Inquiry'.
    Then, write a polite, professional, and short reply in Vietnamese.${contextInstruction}
    
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

export interface TrendResult {
  text: string;
  urls: string[];
}