'use server';
/**
 * @fileOverview Character identification flow with confidence scores.
 *
 * - generateCharacterConfidenceScores - A function that identifies characters in a script and provides confidence scores.
 * - GenerateCharacterConfidenceScoresInput - The input type for the generateCharacterConfidenceScores function.
 * - GenerateCharacterConfidenceScoresOutput - The return type for the generateCharacterConfidenceScores function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCharacterConfidenceScoresInputSchema = z.object({
  script: z.string().describe('The script content to analyze.'),
});
export type GenerateCharacterConfidenceScoresInput = z.infer<typeof GenerateCharacterConfidenceScoresInputSchema>;

const CharacterSchema = z.object({
  name: z.string().describe('The name of the character.'),
  confidence: z.number().describe('The confidence score (0-1) of the character identification.'),
});

const GenerateCharacterConfidenceScoresOutputSchema = z.object({
  characters: z.array(CharacterSchema).describe('The list of identified characters with confidence scores.'),
});
export type GenerateCharacterConfidenceScoresOutput = z.infer<typeof GenerateCharacterConfidenceScoresOutputSchema>;

export async function generateCharacterConfidenceScores(input: GenerateCharacterConfidenceScoresInput): Promise<GenerateCharacterConfidenceScoresOutput> {
  return generateCharacterConfidenceScoresFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCharacterConfidenceScoresPrompt',
  input: {schema: GenerateCharacterConfidenceScoresInputSchema},
  output: {schema: GenerateCharacterConfidenceScoresOutputSchema},
  prompt: `You are a script analysis expert. Your task is to identify the characters in a given script and provide a confidence score (0 to 1) for each character identified.

Analyze the following script and identify the characters. Provide a confidence score for each character.

Script: {{{script}}}

Return the output as a JSON array of characters with their names and confidence scores.

Example:
[{
  "name": "Character A",
  "confidence": 0.95
}, {
  "name": "Character B",
  "confidence": 0.80
}]
`,
});

const generateCharacterConfidenceScoresFlow = ai.defineFlow(
  {
    name: 'generateCharacterConfidenceScoresFlow',
    inputSchema: GenerateCharacterConfidenceScoresInputSchema,
    outputSchema: GenerateCharacterConfidenceScoresOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
