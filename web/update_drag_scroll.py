import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

# 1. Add refs and state
drag_logic = '''
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    // Don't start drag if clicking on an input or button
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'select' || target.tagName.toLowerCase() === 'button' || target.closest('button')) {
      return;
    }
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };
'''
f = f.replace('  const [search, setSearch] = useState("");', '  const [search, setSearch] = useState("");' + drag_logic)

# 2. Add handlers to the div
div_search = '<div className="flex-1 overflow-auto bg-slate-50 relative">'
div_replace = '''<div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-auto bg-slate-50 relative ${isDragging ? 'cursor-grabbing select-none' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >'''

f = f.replace(div_search, div_replace)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
