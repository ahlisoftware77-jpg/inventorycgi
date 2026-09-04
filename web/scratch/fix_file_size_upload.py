import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the line: handleUpdateCell(row.id, 'designImageName', file.name);
    # and append the designImageSize update right after it.
    
    target_line = "handleUpdateCell(row.id, 'designImageName', file.name);"
    if target_line in content and "designImageSize" not in content.split(target_line)[1][:200]:
        new_line = target_line + "\n      handleUpdateCell(row.id, 'designImageSize', formatFileSize(file.size));"
        content = content.replace(target_line, new_line, 1)
        print("Replaced handleUpdateCell successfully")
    else:
        print("Could not find or already replaced handleUpdateCell")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
if __name__ == "__main__":
    main()
