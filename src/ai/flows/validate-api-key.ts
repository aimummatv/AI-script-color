
'use server';
/**
 * @fileOverview API Key Validation Flow.
 *
 * - validateApiKey - A function that checks if a Google AI API key is valid.
 * - ValidateApiKeyInput - The input type for the validateApiKey function.
 * - ValidateApiKeyOutput - The return type for the validateApiKey function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'genkit';

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

const validateApiKeyFlow = ai.defineFlow(
  {
    name: 'validateApiKeyFlow',
    inputSchema: ValidateApiKeyInputSchema,
    outputSchema: ValidateApiKeyOutputSchema,
  },
  async (input) => {
    if (!input.apiKey) {
      return { isValid: false, message: 'API Key is empty.' };
    }

    try {
      const model = googleAI({ apiKey: input.apiKey }).model('gemini-2.0-flash');

      await ai.generate({
        model,
        prompt: 'Hello.',
      });

      return { isValid: true, message: 'API Key is valid.' };
    } catch (error: any) {
      console.error('API key validation failed:', error);
      // The error from the provider might contain sensitive info, so we return a generic message.
      return { isValid: false, message: 'API key validation failed. The key is likely invalid or has insufficient permissions.' };
    }
  }
);
