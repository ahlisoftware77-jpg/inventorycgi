import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix sticky left
    old_left = '<td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50/50 z-10">'
    new_left = '<td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-10">'
    content = content.replace(old_left, new_left)

    # Fix sticky right
    old_right = '<td className="p-1 text-center sticky right-0 bg-white group-hover:bg-blue-50/50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">'
    new_right = '<td className="p-1 text-center sticky right-0 bg-white group-hover:bg-blue-50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">'
    content = content.replace(old_right, new_right)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done fixing sticky column opacity.")

if __name__ == "__main__":
    main()
