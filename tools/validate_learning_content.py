#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1] / "docs" / "data"
errors = []

def load(name):
    try:
        return json.loads((ROOT / name).read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{name}: invalid JSON: {exc}")
        return {}

catalog = load("roadmaps.json")
education = load("education.json")
media = load("media.json")
roadmap_items = catalog.get("roadmaps", [])
slugs = {item.get("slug") for item in roadmap_items}
topics_by_slug = {}
for slug in slugs:
    data = load(f"{slug}.json")
    topics_by_slug[slug] = {node.get("id") for group in data.get("groups", []) for node in group.get("nodes", [])}

if education.get("kind") != "roadmap_education":
    errors.append("education.json: kind must be roadmap_education")
if set(education.get("roadmaps", {})) != slugs:
    errors.append("education.json: roadmap keys must exactly match the catalog")
for slug, track in education.get("roadmaps", {}).items():
    projects = track.get("projects", [])
    if len(projects) < 2:
        errors.append(f"education.json:{slug}: at least two applied projects are required")
    ids = set()
    for project in projects:
        pid = project.get("id")
        if not pid or pid in ids:
            errors.append(f"education.json:{slug}: project IDs must be unique and non-empty")
        ids.add(pid)
        for field in ("title_ar", "title_en", "brief_ar", "brief_en"):
            if not isinstance(project.get(field), str) or not project[field].strip():
                errors.append(f"education.json:{slug}:{pid}: missing {field}")
        if not project.get("milestones_ar") or len(project.get("milestones_ar", [])) != len(project.get("milestones_en", [])):
            errors.append(f"education.json:{slug}:{pid}: bilingual milestone lists must have equal non-zero length")

items = media.get("items", [])
media_ids = set()
for item in items:
    mid = item.get("id")
    if not mid or mid in media_ids:
        errors.append(f"media.json: duplicate or empty media id {mid!r}")
    media_ids.add(mid)
    slug, topic = item.get("roadmap_slug"), item.get("topic_id")
    if slug not in topics_by_slug:
        errors.append(f"media.json:{mid}: unknown roadmap slug {slug!r}")
    elif topic not in topics_by_slug[slug]:
        errors.append(f"media.json:{mid}: topic {topic!r} does not exist in {slug}")
    for field in ("title_ar", "title_en", "provider", "source_url", "url", "checked_at"):
        if not isinstance(item.get(field), str) or not item[field].strip():
            errors.append(f"media.json:{mid}: missing {field}")
    for field in ("url", "source_url"):
        parsed = urlparse(item.get(field, ""))
        if parsed.scheme != "https" or not parsed.netloc:
            errors.append(f"media.json:{mid}: {field} must be an https URL")
    if item.get("status") != "verified":
        errors.append(f"media.json:{mid}: only verified media may be displayed")

result = {"education_tracks": len(education.get("roadmaps", {})), "projects": sum(len(x.get("projects", [])) for x in education.get("roadmaps", {}).values()), "media_items": len(items), "errors": len(errors)}
print(json.dumps(result, ensure_ascii=False))
if errors:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    raise SystemExit(1)
