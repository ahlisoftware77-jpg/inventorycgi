import fs from 'fs';
import * as parser from '@babel/parser';
const code = fs.readFileSync('src/app/register-design/page.tsx', 'utf-8');
parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
console.log('OK');
