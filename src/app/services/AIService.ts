import { GetServerSidePropsContext } from 'next';

export class AIService {
  private static API_URL = 'https://api.anthropic.com/v1/messages';

  static async generateConversation(prompt: string, respondingCircle: string, context?: GetServerSidePropsContext): Promise<string> {
    const API_KEY = (process.env.ANTHROPIC_API_KEY || (context && context.req.headers['x-anthropic-api-key'])) as string;
    
    console.log('API Key (last 4 chars):', API_KEY ? API_KEY.slice(-4) : 'Not set');
    
    if (!API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Generate a very short conversation between two circles. The prompt is: "${prompt}". The responding circle is named "${respondingCircle}". Keep the response concise and under 50 words.`
            }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API response error:', response.status, errorBody);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.content || !result.content[0] || !result.content[0].text) {
        console.error('Unexpected API response structure:', JSON.stringify(result));
        throw new Error('Unexpected API response structure');
      }

      return result.content[0].text;
    } catch (error) {
      console.error('Error in generateConversation:', error);
      throw error;
    }
  }
}

