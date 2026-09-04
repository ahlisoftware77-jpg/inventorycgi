import re

with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update RegisterDesignItem interface
if "designImage?: string" not in content:
    content = content.replace(
        "status: string;",
        "status: string;\n  designImage?: string;"
    )

# 2. Add designImage to default fields in handleAddRow and fetch
if 'status: "FREE",' in content and 'designImage: ""' not in content:
    content = content.replace(
        'status: "FREE",',
        'status: "FREE", designImage: "",'
    )
if 'status: rest.status || "FREE",' in content and 'designImage:' not in content:
    content = content.replace(
        'status: rest.status || "FREE",',
        'status: rest.status || "FREE",\n            designImage: rest.designImage || "",'
    )

# 3. Add CellImageUpload Component
cell_component = '''
const CellImageUpload = ({ 
  row, 
  handleUpdateCell 
}: { 
  row: RegisterDesignItem, 
  handleUpdateCell: (id: string, field: keyof RegisterDesignItem, value: any) => void 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload-drive', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      handleUpdateCell(row.id, 'designImage', data.fileId);
      toast({ title: 'Upload Berhasil', description: 'Gambar berhasil disimpan ke Google Drive.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: err.message });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (row.designImage) {
    const imgUrl = `https://drive.google.com/uc?id=${row.designImage}`;
    return (
      <div className="relative group flex items-center justify-center w-full h-full">
        <a href={imgUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
          <Eye className="w-3 h-3" />
          <span className="text-[10px]">Lihat</span>
        </a>
        
        {/* Hover Preview Box */}
        <div className="absolute hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white p-2 rounded-xl shadow-2xl border border-slate-200">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100">
             <img src={imgUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>
          <button onClick={(e) => { e.preventDefault(); handleUpdateCell(row.id, 'designImage', ''); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 -mt-2 -mr-2 shadow-sm hover:bg-red-600">
             <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {isUploading ? (
        <span className="text-[10px] text-slate-500 animate-pulse">Uploading...</span>
      ) : (
        <>
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Upload Gambar" />
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full bg-slate-100 hover:bg-slate-200 pointer-events-none">
            <Upload className="w-3 h-3 text-slate-500" />
          </Button>
        </>
      )}
    </div>
  );
};
'''

if "const CellImageUpload = (" not in content:
    content = content.replace(
        "const CellMultiSelect = (",
        cell_component + "\nconst CellMultiSelect = ("
    )


# 4. Add to Table Header
if '<th className="p-2 border-r bg-slate-50 text-center select-none w-20">' not in content:
    content = content.replace(
        '<th className="p-2 border-r bg-slate-50 text-center select-none group w-12" onClick={() => handleSort("status")}>',
        '<th className="p-2 border-r bg-slate-50 text-center select-none w-20">\n                  <div className="flex items-center justify-center gap-1"><Eye className="w-3 h-3 text-slate-400" /> Gambar</div>\n                </th>\n                <th className="p-2 border-r bg-slate-50 text-center select-none group w-12" onClick={() => handleSort("status")}>'
    )

# 5. Add to Table Row
if '<td className="p-1 border-r bg-slate-50/50"><CellImageUpload' not in content:
    content = content.replace(
        '<td className="p-1 border-r bg-slate-50/50"><CellStatus',
        '<td className="p-1 border-r bg-slate-50/50"><CellImageUpload handleUpdateCell={handleUpdateCell} row={row} /></td>\n                    <td className="p-1 border-r bg-slate-50/50"><CellStatus'
    )

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated register-design/page.tsx")
