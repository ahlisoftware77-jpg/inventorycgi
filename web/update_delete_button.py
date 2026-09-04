import re

with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleDeleteImage function to CellImageUpload
delete_logic = '''
  const handleDeleteImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!row.designImage) return;
    
    if (!confirm('Apakah Anda yakin ingin menghapus gambar ini dari sistem dan Google Drive?')) return;
    
    setIsUploading(true);
    try {
      const apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
        ? 'https://inventorycgi.vercel.app/api/delete-drive' 
        : '/api/delete-drive';
        
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: row.designImage }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus file dari Google Drive');
      }
      
      handleUpdateCell(row.id, 'designImage', '');
      handleUpdateCell(row.id, 'designImageName', '');
      toast({ title: 'Terhapus', description: 'Gambar berhasil dihapus dari Google Drive.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };
'''

content = content.replace(
    "const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {",
    delete_logic + "\n  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {"
)

# 2. Update the delete button onClick
content = content.replace(
    "onClick={(e) => { e.preventDefault(); handleUpdateCell(row.id, 'designImage', ''); handleUpdateCell(row.id, 'designImageName', ''); }}",
    "onClick={handleDeleteImage} disabled={isUploading}"
)

# Also, if isUploading is true, show a loading spinner on the X button? Let's just disable it.
content = content.replace(
    "className=\"absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 -mt-2 -mr-2 shadow-sm hover:bg-red-600\"",
    "className={`absolute top-0 right-0 text-white rounded-full p-1 -mt-2 -mr-2 shadow-sm ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}"
)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added delete API integration")
