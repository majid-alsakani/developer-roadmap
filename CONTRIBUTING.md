# 🤝 Contributing / المساهمة

Thanks for helping developers learn. شكرًا لمساعدتك المطورين على التعلّم.

## Ways to contribute / طرق المساهمة
1. **Fix or improve a roadmap** — better ordering, missing topic, outdated tool.
2. **Improve the Arabic** — natural phrasing beats literal translation.
3. **Add a new roadmap** — open an issue first so we agree on scope.
4. **Fix links / typos** — small PRs are very welcome.

## Roadmap template / قالب الخريطة
Every file in `roadmaps/` must contain, in this order:
1. Centered header: icon + English title + Arabic title + one-line description in both languages.
2. `## 🗺️ The Map / الخريطة` with a **Mermaid `graph TD`** block.
3. `## ✅ Step-by-step checklist / قائمة التقدم` with 3–5 numbered stages, each a `- [ ]` list.
4. `## 📌 How to use this roadmap` in English and Arabic.
5. Maintainer footer line.

Then register it in `roadmaps/index.json` (`slug`, `en`, `ar`, `icon`, `desc_en`, `desc_ar`) so it appears on the website automatically.

## Rules / القواعد
- No affiliate links, no paid-course promotion.
- Prefer official documentation over blog posts.
- Keep every stage under ~8 bullets — a roadmap is a map, not a book.
- One topic per pull request.

## Local preview / معاينة محلية
```bash
python3 -m http.server 8000 --directory docs
# open http://localhost:8000
```
