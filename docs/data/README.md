# Developer Roadmaps JSON System

هذا المجلد هو مصدر المحتوى الثابت لموقع Developer Roadmaps by Majid Al-Sakani. صُمم النظام بحيث تكون بيانات المسارات والأسئلة قابلة للتعديل دون تغيير محرك الواجهة.

## الملفات

`roadmaps.json` هو الكتالوج المركزي للصفحة الرئيسية. يحتوي على معلومات المسارات، الإحصائيات، عدد الموضوعات، وعدد الأسئلة.

`<slug>.json` يحتوي على المحتوى التفصيلي لمسار واحد: المراحل، الموضوعات، الملاحظات، والمصادر.

`quizzes/<slug>.json` يحتوي على الاختبارات المرتبطة بمعرّفات الموضوعات داخل المسار نفسه. يحمّل محرك صفحة المسار هذا الملف بالتوازي مع ملف المحتوى.

`schema.json` يصف الحقول الأساسية للإصدار الحالي من المخطط، بما في ذلك حقول جودة السؤال الثنائية اللغة.

`quiz_coverage.json` هو manifest مولّد يطابق كل سؤال بمعرّف موضوع حقيقي ويعرض نسبة التغطية لكل مسار. لا يُسمح بادعاء التغطية الشاملة إلا عندما تصل النسبة إلى 100%. الحالة الحالية موثقة داخله بدقة.

## نموذج كامل: quizzes/frontend.json

```json
{
  "schema_version": "1.1.0",
  "kind": "roadmap_quizzes",
  "roadmap_slug": "frontend",
  "updated_at": "2026-08-25",
  "topics": {
    "http": {
      "topic_id": "http",
      "questions": [
        {
          "id": "fe-http-q1",
          "type": "single",
          "question_en": "Which HTTP method is commonly used to retrieve a resource?",
          "question_ar": "أي طريقة HTTP تستخدم عادةً لجلب مورد؟",
          "options": [
            {"id": "a", "en": "GET", "ar": "GET"},
            {"id": "b", "en": "POST", "ar": "POST"},
            {"id": "c", "en": "DELETE", "ar": "DELETE"}
          ],
          "answer": ["a"],
          "explanation_en": "GET requests a representation of a resource.",
          "explanation_ar": "تطلب GET تمثيلًا لمورد معين."
        },
        {
          "id": "fe-http-q2",
          "type": "single",
          "question_en": "What does a 404 response usually mean?",
          "question_ar": "ماذا تعني استجابة 404 عادةً؟",
          "options": [
            {"id": "a", "en": "The resource was not found", "ar": "لم يتم العثور على المورد"},
            {"id": "b", "en": "The server is permanently redirected", "ar": "الخادم أعاد التوجيه نهائيًا"},
            {"id": "c", "en": "The request succeeded", "ar": "نجح الطلب"}
          ],
          "answer": ["a"],
          "explanation_en": "404 indicates that the requested resource could not be found.",
          "explanation_ar": "تشير 404 إلى عدم العثور على المورد المطلوب."
        }
      ]
    }
  }
}
```

## الحفظ المحلي

ملفات JSON لا تتغير من المتصفح على GitHub Pages. لذلك يقرأ الموقع المحتوى والأسئلة من هذه الملفات، بينما يحفظ حالة الموضوعات في `rm_progress_<slug>` ونتائج الاختبارات في `rm_quiz_<slug>` داخل Local Storage. هذا يحافظ على عمل الزائر بدون حساب. عند تهيئة Supabase، ترفع طبقة `sync.js` هذه البيانات بعد تسجيل الدخول مع إبقاء النسخ المحلية والعمل دون اتصال، بينما تبقى ملفات JSON للمحتوى والأسئلة فقط.
