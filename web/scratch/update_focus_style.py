import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The current focus styles I added earlier were:
    # `focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30`
    # And for locked cells:
    # `focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50`

    old_style_1 = "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30"
    new_style_1 = "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100"

    old_style_2 = "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50"
    new_style_2 = "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100"

    content = content.replace(old_style_1, new_style_1)
    content = content.replace(old_style_2, new_style_2)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done updating focus highlight.")

if __name__ == "__main__":
    main()
