import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs'
DATA = ROOT / 'data'
QUIZZES = DATA / 'quizzes'


def load_topics():
    result = {}
    for path in sorted(DATA.glob('*.json')):
        if path.name in {'index.json', 'roadmaps.json', 'schema.json', 'quiz_coverage.json'}:
            continue
        data = json.loads(path.read_text(encoding='utf-8'))
        result[path.stem] = [node['id'] for group in data.get('groups', []) for node in group.get('nodes', [])]
    return result


def main():
    topics = load_topics()
    rows = []
    total_topics = 0
    covered_topics = 0
    total_questions = 0
    for slug, ids in topics.items():
        quiz_path = QUIZZES / f'{slug}.json'
        quiz = json.loads(quiz_path.read_text(encoding='utf-8')) if quiz_path.exists() else {'topics': {}}
        covered = 0
        questions = 0
        invalid_ids = []
        for topic_id in ids:
            entry = quiz.get('topics', {}).get(topic_id)
            if entry and entry.get('questions'):
                covered += 1
                questions += len(entry['questions'])
            elif topic_id in quiz.get('topics', {}):
                invalid_ids.append(topic_id)
        total_topics += len(ids)
        covered_topics += covered
        total_questions += questions
        rows.append({
            'slug': slug,
            'topic_count': len(ids),
            'quiz_topic_count': covered,
            'quiz_question_count': questions,
            'coverage_percent': round(covered / len(ids) * 100, 1) if ids else 0,
            'invalid_or_empty_entries': invalid_ids,
        })
    existing_path = DATA / 'quiz_coverage.json'
    existing = json.loads(existing_path.read_text(encoding='utf-8')) if existing_path.exists() else {}
    manifest = {
        'schema_version': '1.1.0',
        'kind': 'quiz_coverage',
        'generated_at': existing.get('generated_at', date.today().isoformat()),
        'policy': {'target_questions_per_topic': 2, 'coverage_claim_allowed_at_percent': 100},
        'totals': {
            'roadmap_count': len(rows),
            'topic_count': total_topics,
            'quiz_topic_count': covered_topics,
            'quiz_question_count': total_questions,
            'coverage_percent': round(covered_topics / total_topics * 100, 1) if total_topics else 0,
        },
        'roadmaps': rows,
    }
    (DATA / 'quiz_coverage.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    catalog_path = DATA / 'roadmaps.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    catalog.setdefault('stats', {}).update({
        'roadmap_count': len(rows),
        'topic_count': total_topics,
        'quiz_topic_count': covered_topics,
        'quiz_question_count': total_questions,
        'quiz_coverage_percent': manifest['totals']['coverage_percent'],
    })
    by_slug = {row['slug']: row for row in rows}
    for item in catalog.get('roadmaps', []):
        row = by_slug.get(item.get('slug'))
        if row:
            item.update({
                'quiz_topic_count': row['quiz_topic_count'],
                'quiz_question_count': row['quiz_question_count'],
                'quiz_coverage_percent': row['coverage_percent'],
            })
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest['totals'], ensure_ascii=False))


if __name__ == '__main__':
    main()
