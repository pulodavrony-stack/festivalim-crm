import { readFileSync, writeFileSync } from 'fs';

const inputFile = '/Users/pulodavrony/Downloads/orgotdiel_data_clean.sql';
const outputFile = '/Users/pulodavrony/Downloads/orgotdiel_data_inserts.sql';

const content = readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

let result = [];
let currentTable = null;
let currentColumns = null;
let inCopyBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip postgres commands, comments, and empty lines
  if (line.startsWith('\\') || line.startsWith('SET ') || line.startsWith('SELECT pg_catalog') || line.startsWith('--') || !line.trim()) {
    // End copy block on backslash commands
    if (line.startsWith('\\') && inCopyBlock) {
      inCopyBlock = false;
      currentTable = null;
      currentColumns = null;
    }
    continue;
  }
  
  // Detect COPY command
  const copyMatch = line.match(/^COPY\s+(\S+)\s+\(([^)]+)\)\s+FROM\s+stdin;?$/i);
  if (copyMatch) {
    currentTable = copyMatch[1];
    currentColumns = copyMatch[2];
    inCopyBlock = true;
    continue;
  }
  
  // Process data rows (only actual data, not comments)
  if (inCopyBlock && currentTable && line.trim() && !line.startsWith('--')) {
    const columns = currentColumns.split(',').map(c => c.trim());
    const values = line.split('\t');
    
    // Skip if column count doesn't match
    if (values.length !== columns.length) {
      console.warn(`Skipping line ${i+1}: column mismatch (expected ${columns.length}, got ${values.length})`);
      continue;
    }
    
    const formattedValues = values.map(v => {
      if (v === '\\N') return 'NULL';
      if (v === 't') return 'true';
      if (v === 'f') return 'false';
      // Escape single quotes and wrap in quotes
      return `'${v.replace(/'/g, "''")}'`;
    });
    
    result.push(`INSERT INTO ${currentTable} (${currentColumns}) VALUES (${formattedValues.join(', ')});`);
  }
}

// Add transaction wrapper for better performance
const finalSQL = `-- Orgotdel Data Import (converted to INSERT statements)
-- Generated: ${new Date().toISOString()}

BEGIN;

${result.join('\n')}

COMMIT;
`;

writeFileSync(outputFile, finalSQL);
console.log(`✓ Конвертировано ${result.filter(l => l.startsWith('INSERT')).length} записей`);
console.log(`✓ Сохранено в: ${outputFile}`);
