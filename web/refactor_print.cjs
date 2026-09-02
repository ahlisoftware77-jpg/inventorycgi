const fs = require('fs');

const file = 'src/app/form-app/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

const startStr = '{/* PAPER */}';
const endStr = '</div>\n        </div>\n\n      </div>'; // Exact end of right column

const startIndex = content.indexOf('<div className="absolute top-0 left-1/2');
const endIndex = content.indexOf('</div>\n\n      </div>', startIndex) + '</div>\n'.length;

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find blocks");
    process.exit(1);
}

const printJsx = content.substring(startIndex, endIndex);

const componentCode = `
const FormDarPrintLayout = ({ data }: { data: any }) => {
  const { 
    darNo, type = [], requiredDate = '', closingDate = '', sizeChecks = [], sizeFaces = '', sizeCm1 = '', sizeCm2 = '',
    glazeChecks = [], glazeResidue = '', surfaceChecks = [], surfaceTemp = '', guPtv = [], guPtvChecks = [], inkChecks = [], inkOther = '', sendBy = [],
    items = [], numColumns = 4, note2Rows = [], lastDesignSupp = [], feedbackRows = [], signatures = {},
    customer = '', entryDate = '', designer = '', technician = '', purpose = '', designNo = '',
    benefit = '', lastTimeReq = '', feedback = '', generalNote = ''
  } = data || {};

  return (
    ${printJsx.trim()}
  );
};
`;

// Now replace the block in the main component with <FormDarPrintLayout data={liveData} />
const liveDataObj = `
        const liveData = {
          darNo, customer, entryDate, designer, technician, purpose, designNo, items,
          requiredDate, closingDate, type, sizeChecks, sizeFaces, sizeCm1, sizeCm2,
          glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,
          benefit, lastTimeReq, feedback, feedbackRows, lastDesignSupp, note2Rows, generalNote,
          signatures, lockedSignatures, penColors, numColumns
        };
`;

content = content.replace(printJsx, liveDataObj + '\n        <FormDarPrintLayout data={liveData} />\n      </div>\n');

// Insert the component right before export default function FormAppPage()
content = content.replace('export default function FormAppPage() {', componentCode + '\nexport default function FormAppPage() {');

fs.writeFileSync(file, content, 'utf-8');
console.log("Refactoring complete");
