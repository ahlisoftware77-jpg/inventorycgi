import re
f = open('src/app/form-app/page.tsx', encoding='utf-8').read()

# 1. Add imports
f = f.replace('Plus } from "lucide-react";', 'Plus, ChevronUp, ChevronDown } from "lucide-react";')

# 2. Add state
state_code = '''  const [historySearch, setHistorySearch] = useState("");
  const [historySortConfig, setHistorySortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
'''
f = f.replace('  const [historySearch, setHistorySearch] = useState("");', state_code)

# 3. Add sorting logic
sort_logic = '''
  const handleSortHistory = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (historySortConfig && historySortConfig.key === key && historySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setHistorySortConfig({ key, direction });
  };

  const sortedHistoryData = React.useMemo(() => {
    let sortableItems = [...historyData];
    if (historySortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[historySortConfig.key] || "";
        let bVal = b[historySortConfig.key] || "";
        
        if (historySortConfig.key === "createdAt") {
            aVal = a.createdAt?.seconds || 0;
            bVal = b.createdAt?.seconds || 0;
        }

        if (aVal < bVal) {
          return historySortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return historySortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [historyData, historySortConfig]);
'''
f = f.replace('  const loadReport = async (r: any) => {', sort_logic + '\n  const loadReport = async (r: any) => {')

# 4. Replace historyData.filter(r => ... with sortedHistoryData.filter(r => ...
f = f.replace('{historyData.filter(r => {', '{sortedHistoryData.filter(r => {')

# 5. Update headers
# Function to generate sortable th
def make_th(label, key, class_name='p-3'):
    return f'''<th className="{class_name} cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={{() => handleSortHistory("{key}")}}>
                                            <div className="flex items-center gap-1">
                                                {label}
                                                {{historySortConfig?.key === "{key}" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}}
                                            </div>
                                        </th>'''

f = f.replace('<th className="p-3 pl-4">No. DAR</th>', make_th('No. DAR', 'darNo', 'p-3 pl-4'))
f = f.replace('<th className="p-3">Waktu</th>', make_th('Waktu', 'createdAt'))
f = f.replace('<th className="p-3">Customer</th>', make_th('Customer', 'customer'))
f = f.replace('<th className="p-3">Designer</th>', make_th('Designer', 'designer'))
f = f.replace('<th className="p-3">Design No</th>', make_th('Design No', 'designNo'))
f = f.replace('<th className="p-3">Status</th>', make_th('Status', 'status'))
f = f.replace('<th className="p-3">Tipe Desain</th>', make_th('Tipe Desain', 'typeDesign'))
f = f.replace('<th className="p-3">Sumber Desain</th>', make_th('Sumber Desain', 'designSource'))

with open('src/app/form-app/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
