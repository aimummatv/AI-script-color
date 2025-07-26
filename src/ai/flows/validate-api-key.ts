'use server';
/**
 * @fileOverview API Key Validation Flow.
 *
 * - validateApiKey - A function that checks if a Google AI API key is valid.
 * - ValidateApiKeyInput - The input type for the validateApiKey function.
 * - ValidateApiKeyOutput - The return type for the validateApiKey function.
 */

import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const ValidateApiKeyInputSchema = z.object({
  apiKey: z.string().describe('The Google AI API key to validate.'),
});
export type ValidateApiKeyInput = z.infer<typeof ValidateApiKeyInputSchema>;

const ValidateApiKeyOutputSchema = z.object({
  isValid: z.boolean(),
  message: z.string(),
});
export type ValidateApiKeyOutput = z.infer<typeof ValidateApiKeyOutputSchema>;

export async function validateApiKey(input: ValidateApiKeyInput): Promise<ValidateApiKeyOutput> {
  return validateApiKeyFlow(input);
}

const validateApiKeyFlow = async (input: ValidateApiKeyInput): Promise<ValidateApiKeyOutput> => {
  if (!input.apiKey) {
    return { isValid: false, message: 'API Key is empty.' };
  }

  try {
    const ai = genkit({
      plugins: [googleAI({ apiKey: input.apiKey })],
      model: 'googleai/gemini-2.0-flash',
    });

    const prompt = ai.definePrompt({
      name: 'apiKeyValidationPrompt',
      prompt: 'Hello.',
    });

    await prompt();

    return { isValid: true, message: 'API Key is valid.' };
  } catch (error: any) {
    console.error('API key validation failed:', error);
    // The error from the provider might contain sensitive info, so we return a generic message.
    return { isValid: false, message: 'API key validation failed. The key is likely invalid or has insufficient permissions.' };
  }
};
