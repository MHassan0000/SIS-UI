import { readFileSync } from 'node:fs';
import { loadConfig } from './env.mjs';
import { extractStudent, saveStudent } from '../extension/student.js';
try {
  const student = extractStudent(readFileSync(new URL('../RESULTCARD.html', import.meta.url), 'utf8'));
  if (process.argv.includes('--validate-only')) {
    console.log('synopsisForm extraction completed. Values withheld.');
  } else {
    await saveStudent(loadConfig(), student);
    console.log('Supabase accepted the ResultCard rollnumber/email pair. Existing identical pairs are not duplicated. Values withheld.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
