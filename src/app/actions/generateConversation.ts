'use server'

interface ConversationResult {
  success: boolean;
  conversation?: string;
  error?: string;
}

import { AIService } from '../services/AIService';

export async function generateConversation(
  author: string,
  respondingTo: string
): Promise<ConversationResult> {
  try {
    const prompt = `You are ${author}. Generate a single sentence response to ${respondingTo}. Choose a random personality trait and emotional tone for your character. Keep it under 15 words.`
    
    const response = await AIService.generateConversation(prompt, respondingTo);
    return {
      success: true,
      conversation: response
    };
  } catch {
    return {
      success: false,
      error: 'Failed to generate conversation'
    };
  }
}

export async function generateNonDualConversation(
  author: string,
  respondingTo: string
): Promise<ConversationResult> {
  try {
    const prompt = `You are ${author}, a person contemplating the nature of existence and non-duality. Generate a single profound or existential sentence directed at ${respondingTo}. Focus on themes like consciousness, unity, the illusion of self, or the nature of reality. Keep it under 15 words.`
    
    const response = await AIService.generateConversation(prompt, respondingTo);
    return {
      success: true,
      conversation: response
    };
  } catch {
    return {
      success: false,
      error: 'Failed to generate existential conversation'
    };
  }
}

