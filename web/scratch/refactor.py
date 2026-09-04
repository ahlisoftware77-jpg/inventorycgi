import re

def main():
    with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    # Define the blocks
    # TH blocks:
    # <th ... onClick={() => handleSort("FIELD")}>...</th>
    
    th_pattern = re.compile(r'(<th[^>]*onClick=\{\(\) => handleSort\("([a-zA-Z0-9]+)"\)\}.*?</th>)', re.DOTALL)
    ths = {}
    for m in th_pattern.finditer(text):
        ths[m.group(2)] = m.group(1)

    # TD blocks:
    td_pattern = re.compile(r'(<td[^>]*>\s*<Cell[^>]*field="([a-zA-Z0-9]+)".*?</td>)', re.DOTALL)
    tds = {}
    for m in td_pattern.finditer(text):
        tds[m.group(2)] = m.group(1)
        
    print(list(ths.keys()))
    print(list(tds.keys()))

if __name__ == "__main__":
    main()
