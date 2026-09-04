import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

f8_logic = '''
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        handleAddRow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddRow]);
'''

target = 'const handleAddRow = async () => {'
if target in f and 'if (e.key === \'F8\')' not in f:
    f = f.replace(target, f8_logic + '\n  ' + target)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
