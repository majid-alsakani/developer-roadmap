import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs" / "data"
CATALOG = json.loads((ROOT / "roadmaps.json").read_text(encoding="utf-8"))

rows = []
for item in CATALOG["roadmaps"]:
    data = json.loads((ROOT / f"{item['slug']}.json").read_text(encoding="utf-8"))
    nodes = [node for group in data.get("groups", []) for node in group.get("nodes", [])]
    quiz_file = ROOT / "quizzes" / f"{item['slug']}.json"
    quiz_data = json.loads(quiz_file.read_text(encoding="utf-8")) if quiz_file.exists() else {"topics": {}}
    quiz_topics = quiz_data.get("topics", {})
    resources = sum(len(node.get("resources", [])) for node in nodes)
    notes = sum(bool(node.get("note_ar") and node.get("note_en")) for node in nodes)
    videos = sum(sum(1 for resource in node.get("resources", []) if any(token in resource.get("url", "").lower() for token in ("youtube.com", "youtu.be", "vimeo.com"))) for node in nodes)
    covered = sum(bool(quiz_topics.get(node["id"], {}).get("questions")) for node in nodes)
    rows.append({"slug": item["slug"], "topics": len(nodes), "notes_bilingual": notes, "resources": resources, "video_links": videos, "quiz_topics": covered})

print(json.dumps({"roadmaps": len(rows), "topics": sum(row["topics"] for row in rows), "rows": rows}, ensure_ascii=False, indent=2))
