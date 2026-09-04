import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

old_logic = '''
    if (field === "designNo" && value.trim() !== "") {
      const existingDuplicate = data.find(d => d.id !== id && d.designNo === value.trim());
      if (existingDuplicate) {
        let maxNo = 0;
        data.forEach(d => {
          const num = parseInt(d.designNo || "0", 10);
          if (!isNaN(num) && num > maxNo) {
            maxNo = num;
          }
        });
        const suggestion = (maxNo + 1).toString();
        toast({ 
          title: "Nomor Desain Duplikat!", 
          description: `Nomor ${value} sudah digunakan pada desain dengan status: ${existingDuplicate.status || 'Tidak ada status'}. Sugesti nomor selanjutnya: ${suggestion}`, 
          variant: "destructive" 
        });
      }
    }
'''

new_logic = '''
    if (field === "designNo" && value.trim() !== "") {
      if ((window as any).designNoTimeout) clearTimeout((window as any).designNoTimeout);
      (window as any).designNoTimeout = setTimeout(() => {
        const existingDuplicate = data.find(d => d.id !== id && d.designNo === value.trim());
        if (existingDuplicate) {
          let maxNo = 0;
          data.forEach(d => {
            const num = parseInt(d.designNo || "0", 10);
            if (!isNaN(num) && num > maxNo) {
              maxNo = num;
            }
          });
          const suggestion = (maxNo + 1).toString();
          toast({ 
            title: "Nomor Desain Duplikat!", 
            description: `Nomor ${value} sudah digunakan pada desain dengan status: ${existingDuplicate.status || 'Tidak ada status'}. Sugesti nomor selanjutnya: ${suggestion}`, 
            variant: "destructive" 
          });
        }
      }, 1500);
    } else if (field === "designNo" && value.trim() === "") {
      if ((window as any).designNoTimeout) clearTimeout((window as any).designNoTimeout);
    }
'''

f = f.replace(old_logic.strip(), new_logic.strip())

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
