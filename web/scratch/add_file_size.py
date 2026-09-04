import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update interface
    old_interface = "designImageName?: string;"
    new_interface = "designImageName?: string;\n  designImageSize?: string;"
    content = content.replace(old_interface, new_interface)

    # 2. Add formatFileSize helper inside CellImageUpload
    old_upload_start = "const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);"
    new_upload_start = """const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };"""
    content = content.replace(old_upload_start, new_upload_start)

    # 3. Save the size on upload
    old_upload_success = """        handleUpdateCell(row.id, 'designImage', fileId);
        handleUpdateCell(row.id, 'designImageName', file.name);"""
    new_upload_success = """        handleUpdateCell(row.id, 'designImage', fileId);
        handleUpdateCell(row.id, 'designImageName', file.name);
        handleUpdateCell(row.id, 'designImageSize', formatFileSize(file.size));"""
    content = content.replace(old_upload_success, new_upload_success)

    # 4. Display the size in the preview box
    old_preview_bottom = """            <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-1.5 pb-0.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Status</span>"""
    
    new_preview_bottom = """            {row.designImageSize && (
              <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-1.5 pb-0.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Ukuran File</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{row.designImageSize}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-1.5 pb-0.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Status</span>"""
    
    content = content.replace(old_preview_bottom, new_preview_bottom)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done adding file size display.")

if __name__ == "__main__":
    main()
