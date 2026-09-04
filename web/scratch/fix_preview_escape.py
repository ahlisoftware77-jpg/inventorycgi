import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the CellImageUpload component start
    start_idx = content.find("const CellImageUpload = ({")
    if start_idx == -1:
        print("Could not find CellImageUpload")
        return

    # Find where the hook declarations are
    toast_hook = "const { toast } = useToast();"
    toast_idx = content.find(toast_hook, start_idx)
    
    if toast_idx != -1:
        # Insert our new state and effect right after toast hook
        new_hooks = """const { toast } = useToast();
  const [isHiddenByEscape, setIsHiddenByEscape] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHiddenByEscape(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseLeave = () => {
    setIsHiddenByEscape(false);
  };
"""
        content = content.replace(toast_hook, new_hooks, 1)

    # Now replace the container div
    old_container = '<div className="relative group flex items-center justify-center w-full h-full">'
    new_container = '<div className="relative group flex items-center justify-center w-full h-full" onMouseLeave={handleMouseLeave}>'
    content = content.replace(old_container, new_container, 1) # Only the first one which is for the preview

    # Now replace the hover preview box
    old_preview_box = '<div className="absolute hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white p-3 rounded-xl shadow-2xl border border-slate-200">'
    new_preview_box = '<div className={`absolute ${isHiddenByEscape ? "hidden" : "hidden group-hover:block"} top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white p-3 rounded-xl shadow-2xl border border-slate-200`}>'
    content = content.replace(old_preview_box, new_preview_box, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done adding Escape listener for image preview.")

if __name__ == "__main__":
    main()
