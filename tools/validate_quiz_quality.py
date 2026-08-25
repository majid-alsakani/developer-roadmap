import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'data'


def main():
    errors = []
    warnings = []
    seen_question_ids = set()
    total_topics = 0
    covered_topics = 0
    total_questions = 0
    for content_path in sorted(ROOT.glob('*.json')):
        if content_path.name in {'index.json', 'roadmaps.json', 'schema.json', 'quiz_coverage.json'}:
            continue
        slug = content_path.stem
        content = json.loads(content_path.read_text(encoding='utf-8'))
        topic_ids = [n['id'] for g in content.get('groups', []) for n in g.get('nodes', [])]
        total_topics += len(topic_ids)
        quiz_path = ROOT / 'quizzes' / f'{slug}.json'
        quiz = json.loads(quiz_path.read_text(encoding='utf-8')) if quiz_path.exists() else {'topics': {}}
        topics = quiz.get('topics', {})
        for topic_id, entry in topics.items():
            if topic_id not in topic_ids:
                errors.append(f'{slug}: quiz topic does not exist: {topic_id}')
            questions = entry.get('questions', [])
            if topic_id in topic_ids and questions:
                covered_topics += 1
            for question in questions:
                total_questions += 1
                qid = question.get('id')
                if qid in seen_question_ids:
                    errors.append(f'duplicate question id: {qid}')
                seen_question_ids.add(qid)
                options = question.get('options', [])
                option_ids = [o.get('id') for o in options]
                if len(option_ids) != len(set(option_ids)):
                    errors.append(f'{slug}/{topic_id}/{qid}: duplicate option ids')
                answers = question.get('answer', [])
                if question.get('type') == 'single' and len(answers) != 1:
                    errors.append(f'{slug}/{topic_id}/{qid}: single question needs one answer')
                if answers and answers[0] not in option_ids:
                    errors.append(f'{slug}/{topic_id}/{qid}: answer is not an option')
                for field in ('question_en', 'question_ar', 'explanation_en', 'explanation_ar'):
                    if not str(question.get(field, '')).strip():
                        errors.append(f'{slug}/{topic_id}/{qid}: empty {field}')
                if len(options) < 4:
                    warnings.append(f'{slug}/{topic_id}/{qid}: legacy question has fewer than four options')
                for field in ('difficulty', 'skill'):
                    if not question.get(field):
                        warnings.append(f'{slug}/{topic_id}/{qid}: missing recommended {field}')
        for topic_id in topic_ids:
            if topic_id not in topics or not topics[topic_id].get('questions'):
                continue
    summary = {
        'topic_count': total_topics,
        'quiz_topic_count': covered_topics,
        'quiz_question_count': total_questions,
        'coverage_percent': round(covered_topics / total_topics * 100, 1) if total_topics else 0,
        'errors': len(errors),
        'warnings': len(warnings),
    }
    print(json.dumps(summary, ensure_ascii=False))
    for line in errors[:50]:
        print('ERROR', line)
    for line in warnings[:20]:
        print('WARN', line)
    if errors:
        sys.exit(1)


if __name__ == '__main__':
    main()
