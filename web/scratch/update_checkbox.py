def main():
    with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace('className="w-4 h-4 cursor-pointer"', 'className="w-4 h-4 cursor-pointer accent-red-600"')
    text = text.replace('className="w-3 h-3 cursor-pointer"', 'className="w-3 h-3 cursor-pointer accent-red-600"')
    text = text.replace('className="w-4 h-4 cursor-pointer mx-auto block"', 'className="w-4 h-4 cursor-pointer accent-red-600 mx-auto block"')

    with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == "__main__":
    main()
