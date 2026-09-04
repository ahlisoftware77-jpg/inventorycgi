import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove useState hooks
    hooks_old = """const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTypeDesign, setFilterTypeDesign] = useState("All");"""
    hooks_new = """const [search, setSearch] = useState("");"""
    content = content.replace(hooks_old, hooks_new)

    # 2. Update filteredData
    filtered_old = """  const filteredData = data.filter(d => {
    const matchSearch = !search || 
      d.darNo?.toLowerCase().includes(search.toLowerCase()) ||
      d.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      d.customer?.toLowerCase().includes(search.toLowerCase()) ||
      d.designNo?.toLowerCase().includes(search.toLowerCase());
      
    const matchStatus = filterStatus === "All" || d.status === filterStatus;
    const matchType = filterTypeDesign === "All" || d.typeDesign === filterTypeDesign;
    
    return matchSearch && matchStatus && matchType;
  });"""
    filtered_new = """  const filteredData = data.filter(d => 
    !search || 
    d.darNo?.toLowerCase().includes(search.toLowerCase()) ||
    d.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    d.customer?.toLowerCase().includes(search.toLowerCase()) ||
    d.designNo?.toLowerCase().includes(search.toLowerCase()) ||
    d.status?.toLowerCase().includes(search.toLowerCase()) ||
    d.typeDesign?.toLowerCase().includes(search.toLowerCase())
  );"""
    content = content.replace(filtered_old, filtered_new)

    # 3. Update UI to remove selects
    ui_old = """            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari Item/Customer/DAR..."
                className="pl-9 h-9 w-full sm:w-64 text-sm"
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 border border-slate-300 rounded-md text-sm px-2 bg-white outline-none focus:border-blue-500">
              <option value="All">Semua Status</option>
              <option value="FREE">FREE</option>
              <option value="WAIT">WAIT</option>
              <option value="SELESAI">SELESAI</option>
              <option value="CANCEL">CANCEL</option>
            </select>
            <select value={filterTypeDesign} onChange={e => setFilterTypeDesign(e.target.value)} className="h-9 border border-slate-300 rounded-md text-sm px-2 bg-white outline-none focus:border-blue-500">
              <option value="All">Semua Tipe Desain</option>
              {typeDesignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              {filteredData.length} Baris
            </div>"""

    ui_new = """            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari Item/Customer/Status/Tipe..."
                className="pl-9 h-9 w-full sm:w-64 text-sm"
              />
            </div>
            <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              {filteredData.length} Baris
            </div>"""
    content = content.replace(ui_old, ui_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done reverting filters and updating search.")

if __name__ == "__main__":
    main()
