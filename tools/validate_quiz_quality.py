import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'data'
EXCLUDED_CONTENT = {'index.json', 'roadmaps.json', 'schema.json', 'quiz_coverage.json'}
ALLOWED_TYPES = {'single', 'multiple', 'true_false'}
ALLOWED_DIFFICULTIES = {'beginner', 'intermediate', 'advanced'}


def issue(errors, warnings, message, *, hard=False):
    if hard:
        errors.append(message)
    else:
        warnings.append(message)


def annotate(kind, message):
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        print(f'::{kind}::{message}')


def parse_args():
    parser = argparse.ArgumentParser(description='Validate bilingual roadmap quiz JSON files.')
    parser.add_argument('--data-root', default=str(ROOT), help='Directory containing roadmap JSON and quizzes/.')
    parser.add_argument('--strict', action='store_true', help='Treat quality warnings as errors.')
    parser.add_argument('--min-coverage', type=float, default=0.0, help='Required topic coverage percentage.')
    parser.add_argument('--min-questions-per-topic', type=int, default=2, help='Minimum questions for a covered topic.')
    return parser.parse_args()


def main():
    args = parse_args()
    data_root = Path(args.data_root).resolve()
    errors = []
    warnings = []
    seen_question_ids = set()
    total_topics = 0
    covered_topics = 0
    total_questions = 0
    roadmap_rows = []

    for content_path in sorted(data_root.glob('*.json')):
        if content_path.name in EXCLUDED_CONTENT:
            continue
        slug = content_path.stem
        try:
            content = json.loads(content_path.read_text(encoding='utf-8'))
        except Exception as exc:
            errors.append(f'{slug}: invalid roadmap JSON: {exc}')
            continue
        topic_ids = [n['id'] for g in content.get('groups', []) for n in g.get('nodes', [])]
        topic_set = set(topic_ids)
        total_topics += len(topic_ids)
        quiz_path = data_root / 'quizzes' / f'{slug}.json'
        if not quiz_path.exists():
            warnings.append(f'{slug}: quiz file is missing')
            roadmap_rows.append((slug, len(topic_ids), 0, 0))
            continue
        try:
            quiz = json.loads(quiz_path.read_text(encoding='utf-8'))
        except Exception as exc:
            errors.append(f'{slug}: invalid quiz JSON: {exc}')
            continue
        if quiz.get('kind') != 'roadmap_quizzes':
            errors.append(f'{slug}: quiz kind must be roadmap_quizzes')
        if quiz.get('roadmap_slug') != slug:
            errors.append(f'{slug}: roadmap_slug mismatch: {quiz.get("roadmap_slug")}')
        topics = quiz.get('topics', {})
        if not isinstance(topics, dict):
            errors.append(f'{slug}: topics must be an object')
            continue
        roadmap_covered = 0
        roadmap_questions = 0
        for topic_id, entry in topics.items():
            if topic_id not in topic_set:
                errors.append(f'{slug}: quiz topic does not exist: {topic_id}')
            if entry.get('topic_id') != topic_id:
                errors.append(f'{slug}/{topic_id}: topic_id does not match map key')
            questions = entry.get('questions', [])
            if topic_id in topic_set and questions:
                roadmap_covered += 1
                covered_topics += 1
            if topic_id in topic_set and len(questions) < args.min_questions_per_topic:
                issue(errors, warnings, f'{slug}/{topic_id}: only {len(questions)} questions; expected at least {args.min_questions_per_topic}', hard=args.strict)
            roadmap_questions += len(questions)
            for question in questions:
                total_questions += 1
                qid = question.get('id')
                location = f'{slug}/{topic_id}/{qid}'
                if not isinstance(qid, str) or not qid.strip():
                    errors.append(f'{slug}/{topic_id}: question id is empty')
                elif qid in seen_question_ids:
                    errors.append(f'duplicate question id: {qid}')
                else:
                    seen_question_ids.add(qid)
                qtype = question.get('type')
                if qtype not in ALLOWED_TYPES:
                    errors.append(f'{location}: unsupported question type: {qtype}')
                options = question.get('options', [])
                option_ids = [o.get('id') for o in options]
                if len(option_ids) != len(set(option_ids)):
                    errors.append(f'{location}: duplicate option ids')
                if qtype == 'single' and len(question.get('answer', [])) != 1:
                    errors.append(f'{location}: single question needs one answer')
                answers = question.get('answer', [])
                if not answers or any(answer not in option_ids for answer in answers):
                    errors.append(f'{location}: answer is not a valid option')
                issue(errors, warnings, f'{location}: expected four options, found {len(options)}', hard=args.strict or len(options) < 3)
                for option in options:
                    for field in ('id', 'en', 'ar'):
                        if not str(option.get(field, '')).strip():
                            errors.append(f'{location}: empty option {field}')
                for field in ('question_en', 'question_ar', 'explanation_en', 'explanation_ar'):
                    if not str(question.get(field, '')).strip():
                        errors.append(f'{location}: empty {field}')
                difficulty = question.get('difficulty')
                if difficulty not in ALLOWED_DIFFICULTIES:
                    issue(errors, warnings, f'{location}: missing or invalid difficulty', hard=args.strict)
                if not str(question.get('skill', '')).strip():
                    issue(errors, warnings, f'{location}: missing skill', hard=args.strict)
                for field in ('question_en', 'question_ar'):
                    if len(str(question.get(field, '')).strip()) < 12:
                        issue(errors, warnings, f'{location}: {field} is suspiciously short', hard=args.strict)
        roadmap_rows.append((slug, len(topic_ids), roadmap_covered, roadmap_questions))

    coverage = round(covered_topics / total_topics * 100, 1) if total_topics else 0
    if coverage < args.min_coverage:
        errors.append(f'coverage {coverage}% is below required minimum {args.min_coverage}%')
    summary = {
        'topic_count': total_topics,
        'quiz_topic_count': covered_topics,
        'quiz_question_count': total_questions,
        'coverage_percent': coverage,
        'errors': len(errors),
        'warnings': len(warnings),
        'strict': args.strict,
        'min_coverage': args.min_coverage,
    }
    print(json.dumps(summary, ensure_ascii=False))
    for message in errors:
        annotate('error', message)
        print('ERROR', message)
    for message in warnings:
        annotate('warning', message)
        print('WARN', message)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        summary_path = Path(os.environ['GITHUB_STEP_SUMMARY'])
        lines = [
            '## Quiz quality report',
            '',
            '| Metric | Value |',
            '|---|---:|',
            f'| Roadmap topics | {total_topics} |',
            f'| Covered topics | {covered_topics} |',
            f'| Questions | {total_questions} |',
            f'| Coverage | {coverage}% |',
            f'| Errors | {len(errors)} |',
            f'| Warnings | {len(warnings)} |',
            '',
            '### Per-roadmap coverage',
            '',
            '| Roadmap | Topics | Covered | Questions | Coverage |',
            '|---|---:|---:|---:|---:|',
        ]
        for slug, topics_count, covered, questions in roadmap_rows:
            percent = round(covered / topics_count * 100, 1) if topics_count else 0
            lines.append(f'| {slug} | {topics_count} | {covered} | {questions} | {percent}% |')
        summary_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
