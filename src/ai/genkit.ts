
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is the default AI instance. It will be used if no API key is provided by the user.
// It relies on the GEMINI_API_KEY environment variable being set.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
