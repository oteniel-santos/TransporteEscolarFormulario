const fs = require('fs');
const path = require('path');

const root = process.cwd();
const linhasPath = path.join(root, 'src', 'constants', 'linhas.ts');
const gpxDir = path.join(root, 'public', 'gpx');

const gpxFiles = fs.readdirSync(gpxDir).filter((f) => f.endsWith('.gpx'));
const map = {};
for (const file of gpxFiles) {
  const match = file.match(/^(\d{1,2})[-_].*/);
  if (match) {
    const id = parseInt(match[1], 10);
    // prefer exact match if there are duplicates
    if (!map[id] || map[id].length > file.length) {
      map[id] = file;
    }
  }
}

let content = fs.readFileSync(linhasPath, 'utf8');
let replacements = 0;
content = content.replace(/arquivoGPX: \"(\d{1,2})\.gpx\"/g, (match, idStr) => {
  const id = parseInt(idStr, 10);
  const fileName = map[id];
  if (!fileName) {
    console.warn(`No GPX file found for ID ${id}`);
    return match;
  }
  replacements += 1;
  return `arquivoGPX: \"/gpx/${fileName}\"`;
});

fs.writeFileSync(linhasPath, content, 'utf8');
console.log(`Updated ${replacements} arquivoGPX entries in src/constants/linhas.ts`);
