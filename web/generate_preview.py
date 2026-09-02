import re
import os

page_path = 'src/app/form-app/page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the print layout
start_idx = content.find('{/* PAPER */}')
end_idx = content.find('</div>\n        {/* END RIGHT COLUMN */}')

if start_idx == -1 or end_idx == -1:
    # Alternative fallback if previous modifications changed something
    end_idx = content.find('</div>\n            </div>\n        </div>')
    if end_idx == -1:
        end_idx = content.find('</div>\n        </div>\n\n      </div>')

if start_idx == -1 or end_idx == -1:
    print("Could not find print block!")
    exit(1)

print_block = content[start_idx:end_idx]

# List of all state variables used in the print block
state_vars = [
    'darNo', 'type', 'requiredDate', 'closingDate', 'sizeChecks', 'sizeFaces', 'sizeCm1', 'sizeCm2',
    'glazeChecks', 'glazeResidue', 'surfaceChecks', 'surfaceTemp', 'guPtv', 'guPtvChecks', 'inkChecks', 'inkOther', 'sendBy',
    'items', 'numColumns', 'note2Rows', 'lastDesignSupp', 'feedbackRows', 'signatures',
    'customer', 'entryDate', 'designer', 'technician', 'purpose', 'designNo',
    'benefit', 'lastTimeReq', 'feedback', 'generalNote'
]

# We will create a local proxy or just replace them
modified_print_block = print_block
for var in state_vars:
    # This is slightly dangerous with regex, so we just wrap it in a local constant destructuring instead
    pass

preview_page_content = f"""'use client';
import React, {{{{ useEffect, useState }}}} from 'react';
import {{{{ doc, getDoc }}}} from 'firebase/firestore';
import {{{{ db }}}} from '@/lib/firebase';
import {{{{ useParams }}}} from 'next/navigation';

export default function PreviewPage() {{{{
    const params = useParams();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {{{{
        const fetchReport = async () => {{{{
            if (!params.id) return;
            try {{{{
                const docRef = doc(db, 'form_dar', params.id as string);
                const snap = await getDoc(docRef);
                if (snap.exists()) {{{{
                    setReport(snap.data());
                }}}}
            }}}} catch (e) {{{{
                console.error(e);
            }}}}
            setLoading(false);
        }}}};
        fetchReport();
    }}}}, [params.id]);

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100">Memuat preview...</div>;
    if (!report) return <div className="flex items-center justify-center h-screen bg-slate-100">Form tidak ditemukan</div>;

    // Destructure all required variables from the report with default values
    const {{{{
        darNo = '', type = [], requiredDate = '', closingDate = '', sizeChecks = [], sizeFaces = '', sizeCm1 = '', sizeCm2 = '',
        glazeChecks = [], glazeResidue = '', surfaceChecks = [], surfaceTemp = '', guPtv = [], guPtvChecks = [], inkChecks = [], inkOther = '', sendBy = [],
        items = [], numColumns = 4, note2Rows = [], lastDesignSupp = [], feedbackRows = [], signatures = {{{{}}}},
        customer = '', entryDate = '', designer = '', technician = '', purpose = '', designNo = '',
        benefit = '', lastTimeReq = '', feedback = '', generalNote = ''
    }}}} = report;

    return (
        <div className="min-h-screen bg-slate-200 flex items-center justify-center py-10 w-full overflow-x-hidden relative">
            <style dangerouslySetInnerHTML={{{{{{__html: `
                body {{{{ margin: 0; padding: 0; background: #e2e8f0; }}}}
                .print-section {{{{ transform-origin: top center; transform: scale(0.9); }}}}
                @media (max-width: 768px) {{{{ .print-section {{{{ transform: scale(0.6); }}}} }}}}
                @media (max-width: 480px) {{{{ .print-section {{{{ transform: scale(0.4); }}}} }}}}
            `}}}}}} />
            
            <div className="print-section bg-white border shadow-2xl text-black w-[210mm] min-h-[297mm] text-[11px] leading-tight font-serif" style={{{{{{ padding: "20px 40px" }}}}}}>
                {modified_print_block.replace("print-section bg-white border shadow-lg text-black w-full min-h-[297mm] print:border-none print:shadow-none print:max-w-none print:w-[210mm] print:h-[297mm] text-[11px] leading-tight font-serif mx-auto", "")}
            </div>
        </div>
    );
}}}}
"""

os.makedirs('src/app/form-app/preview/[id]', exist_ok=True)
with open('src/app/form-app/preview/[id]/page.tsx', 'w', encoding='utf-8') as out:
    out.write(preview_page_content)
    
print("Successfully generated preview page!")
