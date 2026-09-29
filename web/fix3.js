const fs = require('fs');
let code = fs.readFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/customer-send/page.tsx', 'utf8');

code = code.replace(
  /export function CustomerSendContent\(\{\s*designIdProp,\s*isModal = false\s*\}\s*:\s*\{\s*designIdProp\?:\s*string,\s*isModal\?:\s*boolean\s*\}\)\s*\{/,
  `export function CustomerSendContent({ designIdProp, isModal = false, onDesignChange }: { designIdProp?: string, isModal?: boolean, onDesignChange?: (id: string) => void }) {`
);

code = code.replace(
  /<Button variant="outline" size="icon" onClick=\{\(\) => router\.push\('\/register-design'\)\} className="rounded-xl bg-white\/80 dark:bg-slate-800\/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:scale-105 hover:shadow-md transition-all duration-300">\s*<ArrowLeft className="w-5 h-5" \/>\s*<\/Button>/,
  `{!isModal && (<Button variant="outline" size="icon" onClick={() => router.push('/register-design')} className="rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:scale-105 hover:shadow-md transition-all duration-300"><ArrowLeft className="w-5 h-5" /></Button>)}`
);

code = code.replace(
  /onClick=\{\(\) => \{\s*const idx = allIds\.indexOf\(designId \|\| ''\);\s*if \(idx > 0\) router\.push\(`\/customer-send\?id=\$\{allIds\[idx - 1\]\}`\);\s*\}\}/,
  `onClick={() => { const idx = allIds.indexOf(designId || ''); if (idx > 0) { if (onDesignChange) onDesignChange(allIds[idx - 1]); else router.push(\`/customer-send?id=\${allIds[idx - 1]}\`); } }}`
);

code = code.replace(
  /onClick=\{\(\) => \{\s*const idx = allIds\.indexOf\(designId \|\| ''\);\s*if \(idx !== -1 && idx < allIds\.length - 1\) router\.push\(`\/customer-send\?id=\$\{allIds\[idx \+ 1\]\}`\);\s*\}\}/,
  `onClick={() => { const idx = allIds.indexOf(designId || ''); if (idx !== -1 && idx < allIds.length - 1) { if (onDesignChange) onDesignChange(allIds[idx + 1]); else router.push(\`/customer-send?id=\${allIds[idx + 1]}\`); } }}`
);

fs.writeFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/customer-send/page.tsx', code);
console.log('Done customer-send/page.tsx');

let code2 = fs.readFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/register-design/page.tsx', 'utf8');
code2 = code2.replace(/className="max-w-7xl w-\[95vw\] h-\[95vh\]/g, 'className="max-w-[98vw] w-[98vw] h-[95vh]');
fs.writeFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/register-design/page.tsx', code2);
console.log('Done register-design/page.tsx');
