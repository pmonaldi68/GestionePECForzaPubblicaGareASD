import fs from 'fs';
import path from 'path';
import { SAMPLE_MATCHES } from '../src/data/sampleMatches';
import { generatePecForMatch, formatSeparatedFieldsTxt } from '../src/utils/pecGenerator';

const outDir = path.resolve(process.cwd(), 'bozze_pec');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Filter ONLY home matches as strictly specified: "bisogna richiedere la forza pubblica solo per le gare in casa"
const homeMatches = SAMPLE_MATCHES.filter(m => m.isHome);

console.log(`Generazione di ${homeMatches.length} bozze PEC per le sole gare in casa...`);

homeMatches.forEach((match, index) => {
  const pec = generatePecForMatch(match, true);
  const content = formatSeparatedFieldsTxt(match, pec);

  const safeClub = match.clubId;
  const safeDate = match.data.replace(/[^0-9]/g, '-');
  const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
  const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
  
  const filename = `Bozza_${String(index + 1).padStart(2, '0')}_${safeClub}_${safeDate}_${safeHome}_vs_${safeAway}.txt`;
  const filePath = path.join(outDir, filename);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Creata bozza: ${filename}`);
});

console.log('Tutte le bozze delle email PEC sono state salvate con successo in /bozze_pec/');
