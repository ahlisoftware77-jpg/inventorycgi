def main():
    with open('src/app/form-app/preview/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    text = text.replace('"✓"', '<span className="text-red-600 font-bold">✓</span>')

    with open('src/app/form-app/preview/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == "__main__":
    main()
