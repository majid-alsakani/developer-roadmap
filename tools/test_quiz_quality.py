import json
import subprocess
import sys
import tempfile
from pathlib import Path

VALID_QUESTION = {
    'id': 'topic-q1',
    'type': 'single',
    'difficulty': 'beginner',
    'question_en': 'Which option describes the topic correctly?',
    'question_ar': 'أي خيار يصف الموضوع بصورة صحيحة؟',
    'options': [
        {'id': 'a', 'en': 'Correct concept', 'ar': 'المفهوم الصحيح'},
        {'id': 'b', 'en': 'Distractor one', 'ar': 'خيار مشتت أول'},
        {'id': 'c', 'en': 'Distractor two', 'ar': 'خيار مشتت ثان'},
        {'id': 'd', 'en': 'Distractor three', 'ar': 'خيار مشتت ثالث'},
    ],
    'answer': ['a'],
    'explanation_en': 'The first option matches the topic definition.',
    'explanation_ar': 'الخيار الأول يطابق تعريف الموضوع.',
    'skill': 'Concept recognition',
}


def write_dataset(root, invalid=False):
    (root / 'quizzes').mkdir()
    content = {
        'schema_version': '1.0.0', 'kind': 'roadmap_content', 'slug': 'demo',
        'groups': [{'en': 'Demo', 'ar': 'تجريبي', 'nodes': [{'id': 'topic', 'en': 'Topic', 'ar': 'موضوع'}]}],
    }
    q1 = json.loads(json.dumps(VALID_QUESTION))
    q2 = json.loads(json.dumps(VALID_QUESTION))
    q2['id'] = 'topic-q2'
    if invalid:
        q2['answer'] = ['z']
    quiz = {
        'schema_version': '1.1.0', 'kind': 'roadmap_quizzes', 'roadmap_slug': 'demo',
        'topics': {'topic': {'topic_id': 'topic', 'questions': [q1, q2]}},
    }
    (root / 'demo.json').write_text(json.dumps(content), encoding='utf-8')
    (root / 'quizzes' / 'demo.json').write_text(json.dumps(quiz), encoding='utf-8')


def run_validator(root):
    script = Path(__file__).with_name('validate_quiz_quality.py')
    return subprocess.run([sys.executable, str(script), '--data-root', str(root)], capture_output=True, text=True)


def main():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory) / 'valid'
        root.mkdir()
        write_dataset(root)
        result = run_validator(root)
        if result.returncode != 0:
            raise SystemExit(f'valid fixture was rejected:\n{result.stdout}\n{result.stderr}')
        invalid_root = Path(directory) / 'invalid'
        invalid_root.mkdir()
        write_dataset(invalid_root, invalid=True)
        result = run_validator(invalid_root)
        if result.returncode == 0:
            raise SystemExit('invalid fixture was accepted')
    print('quiz quality smoke tests passed')


if __name__ == '__main__':
    main()
