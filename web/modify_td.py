# -*- coding: utf-8 -*-
import re

with open(r'e:\yadiapp-project\inventory - Copy\web\src\app\register-design\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_td(match):
    td_opening = match.group(1)
    inner_content = match.group(2)
    
    # Extract field name
    field_match = re.search(r'field=\"([a-zA-Z0-9_]+)\"', inner_content)
    if not field_match:
        return match.group(0)
    
    field = field_match.group(1)
    
    new_td = td_opening
    
    if 'data-row-idx' not in new_td:
        new_td = new_td.rstrip('>') + f' data-row-idx={{idx}} data-field="{field}">'
        
    if 'className="' in new_td and 'relative' not in new_td:
        new_td = new_td.replace('className="', 'className="relative ')
    elif 'className={`' in new_td and 'relative' not in new_td:
        new_td = new_td.replace('className={`', 'className={`relative ')
        
    return new_td + inner_content + "</td>"

new_content = re.sub(r'(<td[^>]*>)(.*?)</td>', replace_td, content, flags=re.DOTALL)

with open(r'e:\yadiapp-project\inventory - Copy\web\src\app\register-design\page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done replacing.")
