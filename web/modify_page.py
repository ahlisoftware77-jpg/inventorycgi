# -*- coding: utf-8 -*-
import re

file_path = r'e:\yadiapp-project\inventory - Copy\web\src\app\register-design\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
if 'writeBatch' not in content:
    content = content.replace(
        "import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp, where, addDoc, getDoc }",
        "import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp, where, addDoc, getDoc, writeBatch }"
    )

# 2. Add state variables inside RegisterDesignPage
state_vars = """
  const [fillState, setFillState] = useState<{
    isDragging: boolean;
    field: string;
    startIdx: number;
    currentIdx: number;
    value: any;
  } | null>(null);
  
  const [hoveredCell, setHoveredCell] = useState<{
    idx: number;
    field: string;
    value: any;
    rect: DOMRect;
  } | null>(null);
"""

if 'const [fillState, setFillState] = useState' not in content:
    content = content.replace(
        '  const scrollContainerRef = useRef<HTMLDivElement>(null);',
        state_vars + '\n  const scrollContainerRef = useRef<HTMLDivElement>(null);'
    )

# 3. Add global event handlers
event_handlers = """
  // Fill handle logic
  const handleCellMouseEnter = (e: React.MouseEvent) => {
    if (fillState && fillState.isDragging) return; // Don't show handle while dragging
    
    const td = (e.target as HTMLElement).closest('td');
    if (!td || isReadOnly) return;
    
    const idx = td.getAttribute('data-row-idx');
    const field = td.getAttribute('data-field');
    
    if (idx && field) {
      const parsedIdx = parseInt(idx);
      const val = paginatedData[parsedIdx] ? paginatedData[parsedIdx][field as keyof RegisterDesignItem] : null;
      setHoveredCell({
        idx: parsedIdx,
        field,
        value: val,
        rect: td.getBoundingClientRect()
      });
    }
  };

  const handleTableMouseLeave = (e: React.MouseEvent) => {
    if (fillState && fillState.isDragging) return;
    setHoveredCell(null);
  };
  
  const startFillDrag = (e: React.MouseEvent, idx: number, field: string, value: any) => {
    e.preventDefault();
    e.stopPropagation();
    setFillState({
      isDragging: true,
      field,
      startIdx: idx,
      currentIdx: idx,
      value
    });
    setHoveredCell(null);
  };
  
  const handleTbodyMouseOver = (e: React.MouseEvent) => {
    if (!fillState || !fillState.isDragging) return;
    
    const td = (e.target as HTMLElement).closest('td');
    if (!td) return;
    
    const field = td.getAttribute('data-field');
    const idx = td.getAttribute('data-row-idx');
    
    if (field === fillState.field && idx) {
      const parsedIdx = parseInt(idx);
      if (parsedIdx !== fillState.currentIdx) {
        setFillState(prev => prev ? { ...prev, currentIdx: parsedIdx } : null);
      }
    }
  };
  
  useEffect(() => {
    const handleWindowMouseUp = async () => {
      if (!fillState || !fillState.isDragging) return;
      
      const { startIdx, currentIdx, field, value } = fillState;
      setFillState(null);
      
      const minIdx = Math.min(startIdx, currentIdx);
      const maxIdx = Math.max(startIdx, currentIdx);
      
      if (minIdx === maxIdx) return; // No drag distance
      
      const batch = writeBatch(db);
      let updateCount = 0;
      
      for (let i = minIdx; i <= maxIdx; i++) {
        const row = paginatedData[i];
        if (!row || row.isLocked) continue;
        
        // Prepare local update
        handleUpdateCell(row.id, field as keyof RegisterDesignItem, value, true); // We'll modify handleUpdateCell to optionally skip DB update, but actually we can just batch it directly and rely on local state updates.
        
        // Add to batch
        const docRef = doc(db, 'register_design', row.id);
        batch.update(docRef, {
          [field]: value,
          updatedAt: serverTimestamp()
        });
        updateCount++;
      }
      
      if (updateCount > 0) {
        try {
          await batch.commit();
          toast({ title: "Berhasil", description: `Menyalin ke ${updateCount} baris.` });
        } catch (e: any) {
          toast({ variant: 'destructive', title: "Gagal Update", description: e.message });
        }
      }
    };
    
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [fillState, paginatedData, db, toast]);
"""

if 'const handleCellMouseEnter' not in content:
    content = content.replace(
        '  const handlePublicLogin = async () => {',
        event_handlers + '\n  const handlePublicLogin = async () => {'
    )
    
# 4. Modify handleUpdateCell to accept skipDb argument (to avoid 20 separate DB calls)
# We can just change its signature. It's defined as:
# const handleUpdateCell = async (id: string, field: keyof RegisterDesignItem, value: any) => {

update_cell_orig = "const handleUpdateCell = async (id: string, field: keyof RegisterDesignItem, value: any) => {"
update_cell_new = "const handleUpdateCell = async (id: string, field: keyof RegisterDesignItem, value: any, skipDb = false) => {"
content = content.replace(update_cell_orig, update_cell_new)

if 'await updateDoc(docRef,' in content:
    content = re.sub(
        r'(const docRef = doc\(db, .register_design., id\);\s*)(await updateDoc\(docRef, \{)',
        r'\1if (!skipDb) \2',
        content
    )


# 5. Modify tbody to add onMouseOver
tbody_orig = "<tbody>"
tbody_new = "<tbody onMouseOver={handleTbodyMouseOver} onMouseMove={handleCellMouseEnter} onMouseLeave={handleTableMouseLeave} className=\"relative\">"
content = content.replace(tbody_orig, tbody_new)

# 6. Add Overlay for the fill state and hovered handle
overlay_ui = """
              {/* Fill Drag Overlay */}
              {fillState && fillState.isDragging && (
                <tr>
                  <td colSpan={100} className="p-0 m-0 border-0 h-0">
                    {(() => {
                      const startTd = scrollContainerRef.current?.querySelector(`td[data-row-idx="${fillState.startIdx}"][data-field="${fillState.field}"]`);
                      const currentTd = scrollContainerRef.current?.querySelector(`td[data-row-idx="${fillState.currentIdx}"][data-field="${fillState.field}"]`);
                      if (!startTd || !currentTd) return null;
                      
                      const startRect = (startTd as HTMLElement).getBoundingClientRect();
                      const currentRect = (currentTd as HTMLElement).getBoundingClientRect();
                      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
                      
                      if (!containerRect) return null;
                      
                      const top = Math.min(startRect.top, currentRect.top) - containerRect.top + (scrollContainerRef.current?.scrollTop || 0);
                      const height = Math.abs(startRect.bottom - currentRect.bottom) + Math.min(startRect.height, currentRect.height);
                      const left = startRect.left - containerRect.left + (scrollContainerRef.current?.scrollLeft || 0);
                      const width = startRect.width;
                      
                      return (
                        <div 
                          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-[60]"
                          style={{
                            top: `${top}px`,
                            left: `${left}px`,
                            width: `${width}px`,
                            height: `${height}px`
                          }}
                        />
                      );
                    })()}
                  </td>
                </tr>
              )}
              {/* Hover Handle */}
              {hoveredCell && !isReadOnly && (
                <tr>
                  <td colSpan={100} className="p-0 m-0 border-0 h-0">
                    {(() => {
                      const containerRect = scrollContainerRef.current?.getBoundingClientRect();
                      if (!containerRect) return null;
                      
                      const top = hoveredCell.rect.bottom - containerRect.top + (scrollContainerRef.current?.scrollTop || 0) - 6;
                      const left = hoveredCell.rect.right - containerRect.left + (scrollContainerRef.current?.scrollLeft || 0) - 6;
                      
                      return (
                        <div 
                          className="absolute w-2.5 h-2.5 bg-blue-600 border border-white cursor-crosshair z-[70] hover:w-3 hover:h-3 hover:-ml-0.5 hover:-mt-0.5 transition-all"
                          style={{ top: `${top}px`, left: `${left}px` }}
                          onMouseDown={(e) => startFillDrag(e, hoveredCell.idx, hoveredCell.field, hoveredCell.value)}
                        />
                      );
                    })()}
                  </td>
                </tr>
              )}
"""

if 'Fill Drag Overlay' not in content:
    content = content.replace("<tbody>", tbody_orig + overlay_ui)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done overlay.")
