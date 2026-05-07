import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';
const MODEL_NAME = 'gemini-2.5-flash';

let vertexAI = null;

/**
 * Initialize Vertex AI client
 */
export function initializeVertexAI() {
  try {
    if (!PROJECT_ID) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
    }

    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
    });

    console.log('[Vertex AI] Initialized successfully');
    return vertexAI;
  } catch (error) {
    console.error('[Vertex AI] Initialization failed:', error.message);
    throw error;
  }
}

/**
 * Get Vertex AI client instance
 */
export function getVertexAIClient() {
  if (!vertexAI) {
    initializeVertexAI();
  }
  return vertexAI;
}

/**
 * Generate summary from text using Vertex AI
 * @param {string} text - Text to summarize
 * @param {number} maxLength - Max summary length (default: 1000)
 * @returns {Promise<string>} - Generated summary
 */
export async function generateSummary(text, maxLength = 1000) {
  try {
    const client = getVertexAIClient();
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
    });

    // Clean and truncate input if too large (Vertex AI has token limits)
    const maxInputTokens = 30000; // ~120KB of text
    const estimatedTokens = Math.ceil(text.length / 4);

    if (estimatedTokens > maxInputTokens) {
      console.warn(`[Vertex AI] Input truncated from ${estimatedTokens} to ${maxInputTokens} tokens`);
      // Keep first 80% and last 20% of text to preserve context
      const keepLength = Math.floor((text.length * 80) / 100);
      const tailStart = text.length - Math.floor((text.length * 20) / 100);
      text = text.substring(0, keepLength) + '\n\n... [MIDDLE CONTENT TRUNCATED] ...\n\n' + text.substring(tailStart);
    }

    const prompt = `Hãy viết một bản tóm tắt mở rộng cho nội dung sau, ưu tiên đầy đủ ý hơn là ngắn.

    Yêu cầu bắt buộc:
    - Không rút gọn quá mạnh; giữ lại càng nhiều ý quan trọng càng tốt.
    - Bao gồm: khái niệm chính, mục tiêu, lợi ích, quy trình, thành phần, công cụ, ví dụ, lưu ý, và kết luận nếu có.
    - Viết thành 2 đến 4 đoạn văn liền mạch, tự nhiên, dễ đọc.
    - Mỗi đoạn nên có nhiều ý, không chỉ 1-2 câu.
    - Chỉ dùng gạch đầu dòng khi một ý quá dài và cần làm rõ.
    - Không thêm tiêu đề, lời mở đầu, hoặc nhận xét ngoài phần tóm tắt.
    - Nếu nội dung gốc có nhiều ý, hãy cố gắng phản ánh gần như tất cả thay vì chỉ chọn 3-4 ý nổi bật.
    - Không vượt quá ${maxLength} ký tự.

    Nội dung cần tóm tắt:
    ---
    ${text}
    ---`;

    console.log('[Vertex AI] Generating summary...');

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3, // Lower temperature for more factual summaries
        topP: 0.95,
        topK: 40,
      },
    });

    if (!response.response.candidates || response.response.candidates.length === 0) {
      throw new Error('No response from Vertex AI');
    }

    const summary = response.response.candidates[0].content.parts[0].text;
    console.log(`[Vertex AI] Summary generated: ${summary.length} characters`);

    return summary;
  } catch (error) {
    console.error('[Vertex AI] Generation failed:', error.message);
    throw error;
  }
}

/**
 * Validate text is not empty
 */
export function validateText(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text content is empty or invalid');
  }
  return true;
}

export default {
  initializeVertexAI,
  getVertexAIClient,
  generateSummary,
  validateText,
};
