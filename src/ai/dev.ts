import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-help-request.ts';
import '@/ai/flows/draft-help-request.ts';
import '@/ai/flows/extract-user-skills.ts';