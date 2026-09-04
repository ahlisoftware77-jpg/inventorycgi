import json

transcript_path = r"C:\Users\00563\.gemini\antigravity-ide\brain\8b62d400-178f-4101-b637-45a41851ddf4\.system_generated\logs\transcript_full.jsonl"
output_path = r"e:\yadiapp-project\inventory - Copy\web\scratch\restored_page.txt"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE":
                for tc in data.get("tool_calls", []):
                    if tc.get("name") == "write_to_file":
                        args = tc.get("args", {})
                        target = args.get("TargetFile", "")
                        if "src/app/register-design/page.tsx" in target.replace("\\", "/"):
                            with open(output_path, "w", encoding="utf-8") as out:
                                out.write(args.get("CodeContent", ""))
                            print("Found and restored.")
        except Exception as e:
            pass
