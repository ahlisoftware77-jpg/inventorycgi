import json

transcript_path = r"C:\Users\00563\.gemini\antigravity-ide\brain\8b62d400-178f-4101-b637-45a41851ddf4\.system_generated\logs\transcript_full.jsonl"
output_path = r"e:\yadiapp-project\inventory - Copy\web\scratch\restored_page.txt"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in reversed(list(f)):
        try:
            data = json.loads(line)
            if data.get("type") == "VIEW_FILE" and "src/app/register-design/page.tsx" in data.get("content", "") and "Total Lines: 310" in data.get("content", ""):
                with open(output_path, "w", encoding="utf-8") as out:
                    out.write(data["content"])
                print("Found and restored.")
                break
        except Exception as e:
            pass
