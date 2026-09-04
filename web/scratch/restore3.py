import json
import re

transcript_path = r"C:\Users\00563\.gemini\antigravity-ide\brain\8b62d400-178f-4101-b637-45a41851ddf4\.system_generated\logs\transcript_full.jsonl"
output_path = r"e:\yadiapp-project\inventory - Copy\web\scratch\restored_page.txt"

content_blocks = []

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE":
                for tc in data.get("tool_calls", []):
                    args = tc.get("args", {})
                    # Look through any string arguments for the code block
                    for k, v in args.items():
                        if isinstance(v, str) and "export default function RegisterDesignPage" in v:
                            content_blocks.append(v)
        except Exception as e:
            pass

# Find the longest block which is likely the full file content
if content_blocks:
    longest = max(content_blocks, key=len)
    with open(output_path, "w", encoding="utf-8") as out:
        out.write(longest)
    print("Found and restored.")
else:
    print("Not found.")
