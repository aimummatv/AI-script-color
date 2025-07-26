import { config } from 'dotenv';
config();

import '@/ai/flows/identify-characters.ts';
import '@/ai/flows/generate-character-confidence-scores.ts';
import '@/ai/flows/validate-api-key.ts';
