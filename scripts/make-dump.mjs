import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MAX_FILE_SIZE = 200 * 1024; // 200 KB
const MAX_DUMP_SIZE = 300 * 1024; // 300 KB per chunk

const ALLOWED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.sql', '.md', '.mjs', '.cjs']);
const EXCLUDED_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', '.vercel', 'scripts']);
const EXCLUDED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

const skippedFiles = [];
const redactions = [];
const allFiles = [];

// Redaction patterns
const redactionRules = [
  { name: 'JWT/Supabase Key', regex: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { name: 'sk_ Secret', regex: /sk_[a-zA-Z0-9_]+/g },
  { name: 're_ Secret', regex: /re_[a-zA-Z0-9_]+/g },
  { name: 'Turnstile Secret', regex: /0x4AAAA[a-zA-Z0-9_-]+/g },
  { name: 'Bearer Token', regex: /(?<=Bearer\s+)[a-zA-Z0-9_.-]+/g },
  { name: 'Long Random String', regex: /(?<=['"`])([a-zA-Z0-9_\-\.\+]{40,})(?=['"`])/g }
];

function isSafeEnvExampleValue(value) {
  // We don't want to redact placeholders in .env.example if they are 40+ chars
  if (value.includes('your') || value.includes('placeholder')) return true;
  return false;
}

function redactContent(filePath, content) {
  let redactedContent = content;
  let fileRedacted = false;
  const isEnvExample = path.basename(filePath) === '.env.example';

  for (const rule of redactionRules) {
    let match;
    const regex = new RegExp(rule.regex);
    while ((match = regex.exec(content)) !== null) {
      const matchStr = match[0];
      if (isEnvExample && isSafeEnvExampleValue(matchStr)) continue;
      
      redactedContent = redactedContent.replace(matchStr, '[REDACTED]');
      fileRedacted = true;
      
      // Log the redaction type without the value
      if (!redactions.find(r => r.file === filePath && r.rule === rule.name)) {
        redactions.push({ file: filePath, rule: rule.name });
      }
    }
  }
  return { content: redactedContent, redacted: fileRedacted };
}

function traverseDir(dir, relDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relDir, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      traverseDir(fullPath, relPath);
    } else {
      // Filename checks
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
      if (EXCLUDED_FILES.has(entry.name)) continue;
      if (entry.name.endsWith('.pem') || entry.name.endsWith('.key') || entry.name.endsWith('.p12')) continue;
      if (entry.name.startsWith('repo-dump')) continue;

      const ext = path.extname(entry.name).toLowerCase();
      const isConfig = entry.name.includes('config') || entry.name.startsWith('.eslint');
      if (!ALLOWED_EXTS.has(ext) && entry.name !== '.gitignore' && entry.name !== '.env.example' && !isConfig) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat.size > MAX_FILE_SIZE) {
        skippedFiles.push({ path: relPath, reason: `File size ${Math.round(stat.size / 1024)}KB exceeds limit of 200KB` });
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const { content: processedContent } = redactContent(relPath, content);
      
      allFiles.push({
        path: relPath,
        content: processedContent,
        ext: ext.slice(1) || 'txt'
      });
    }
  }
}

function getSortScore(filePath) {
  if (filePath === 'package.json') return 1;
  if (filePath.includes('config') || filePath.includes('eslint') || filePath.includes('tsconfig')) return 2;
  if (filePath === '.env.example') return 3;
  if (filePath === '.gitignore') return 4;
  if (filePath.startsWith('lib/')) return 5;
  if (filePath.startsWith('app/')) return 6;
  if (filePath.startsWith('components/')) return 7;
  if (filePath.endsWith('.sql')) return 8;
  if (filePath === 'README.md') return 9;
  return 10;
}

function generateDump() {
  traverseDir(ROOT_DIR);
  
  allFiles.sort((a, b) => {
    const scoreA = getSortScore(a.path);
    const scoreB = getSortScore(b.path);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.path.localeCompare(b.path);
  });

  const treeLines = allFiles.map(f => `- ${f.path}`);
  const treeSection = `## File Tree\n${treeLines.join('\n')}\n\n`;

  const skippedSection = `## Skipped Files\n${skippedFiles.length > 0 ? skippedFiles.map(f => `- ${f.path}: ${f.reason}`).join('\n') : 'None'}\n\n`;
  
  const redactionSection = `## Redactions\n${redactions.length > 0 ? redactions.map(r => `- ${r.file}: ${r.rule}`).join('\n') : 'None'}\n\n`;

  let currentChunk = 1;
  let currentSize = 0;
  let currentContent = '';

  const writeChunk = (content, isFinal = false) => {
    let finalContent = content;
    if (currentChunk === 1) {
      finalContent = `# Repository Dump\n\n${treeSection}` + finalContent;
    }
    if (isFinal) {
      finalContent += `\n${skippedSection}${redactionSection}`;
    }
    
    const fileName = `repo-dump${currentChunk > 1 || !isFinal ? `-${currentChunk}` : ''}.md`;
    fs.writeFileSync(path.join(ROOT_DIR, fileName), finalContent);
    console.log(`Created ${fileName} (${Math.round(Buffer.byteLength(finalContent) / 1024)} KB)`);
  };

  for (const file of allFiles) {
    const lang = file.ext === 'mjs' || file.ext === 'cjs' ? 'javascript' : (file.ext === 'tsx' || file.ext === 'ts' ? 'typescript' : file.ext);
    const fileContent = `### ${file.path}\n\`\`\`${lang}\n${file.content}\n\`\`\`\n\n`;
    const byteLength = Buffer.byteLength(fileContent);

    if (currentSize + byteLength > MAX_DUMP_SIZE && currentSize > 0) {
      writeChunk(currentContent, false);
      currentChunk++;
      currentContent = '';
      currentSize = 0;
    }

    currentContent += fileContent;
    currentSize += byteLength;
  }

  if (currentSize > 0 || currentChunk === 1) {
    writeChunk(currentContent, true);
  }

  console.log(`\nTotal files included: ${allFiles.length}`);
}

generateDump();
