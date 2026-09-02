import re

with open('src/app/form-app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{/* PAPER */}')
end_idx = content.find('</div>\n        {/* END RIGHT COLUMN */}')

if start_idx == -1 or end_idx == -1:
    print("Could not find blocks")
else:
    print_jsx = content[start_idx:end_idx]
    
    component_code = """import React from 'react';

export const FormDarPrintLayout = ({ data }: { data: any }) => {
  const { 
    darNo, type, requiredDate, closingDate, sizeChecks, sizeFaces, sizeCm1, sizeCm2,
    glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,
    items, numColumns, note2Rows, lastDesignSupp, feedbackRows, signatures
  } = data;

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 scale-[0.45] sm:scale-[0.75] md:scale-[0.9] xl:scale-100 origin-top xl:relative xl:left-auto xl:transform-none print:relative print:scale-100 print:left-auto print:transform-none w-[210mm]">
""" + print_jsx + """
    </div>
  );
};
"""
    with open('src/components/FormDarPrintLayout.tsx', 'w', encoding='utf-8') as out:
        out.write(component_code)
    print("Successfully extracted to src/components/FormDarPrintLayout.tsx")
