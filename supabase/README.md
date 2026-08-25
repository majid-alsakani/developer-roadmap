# Account sync setup

The site remains fully usable as a guest. Progress and quiz results continue to use `localStorage` immediately, and the synchronization layer retries queued changes when the browser is online. Cloud accounts are intentionally disabled until a Supabase project is configured.

## 1. Create the Supabase project

Create a project in the Supabase dashboard, enable GitHub under **Authentication → Providers**, and configure the site URL and redirect URL as:

`https://majid-alsakani.github.io/developer-roadmap/`

For local testing, also add the local URL you use for the static server.

## 2. Apply the database migration

Run `supabase/migrations/202608250001_learning_progress.sql` in the Supabase SQL editor or through the Supabase CLI. The migration creates `profiles`, `progress`, and `quiz_results`, enables Row Level Security, and adds monotonic merge rules so an older update cannot turn `done` back into a weaker state. Quiz scores, attempts, and passed status are merged by maximum/OR semantics.

## 3. Configure the public browser key

Edit `docs/assets/supabase-config.js` with the project URL and the **publishable** key. The file must never contain `sb_secret` or `service_role` credentials:

```js
window.ROADMAP_SUPABASE = Object.freeze({
  enabled: true,
  url: "https://YOUR_PROJECT.supabase.co",
  publishableKey: "YOUR_PUBLISHABLE_KEY"
});
```

The publishable key is designed for browser use. RLS is the security boundary; every policy in the migration requires `auth.uid()` to equal the row owner.

## 4. Configure GitHub OAuth

Create or select a GitHub OAuth App and set its callback URL to the Supabase callback URL shown in the Supabase provider settings. Add the GitHub client ID and secret in the Supabase dashboard only. Do not commit either secret to this repository.

Magic-link login is also available after enabling email authentication in Supabase. Email delivery may require configuring an SMTP provider in production.

## 5. Verify the flow

Test guest progress, sign-in, local-to-cloud migration, sign-out without deleting local data, a second browser session, offline edits followed by reconnect, and an attempted cross-user read. The last test must be rejected by RLS. The browser should expose only the configured publishable key.


## 6. التتبع المتقدم ولوحة الإنجاز

أضيفت صفحة `docs/dashboard.html` لعرض ملخص التقدم عبر المسارات، الاختبارات، الخطوة التعليمية التالية، وآخر النشاطات. تعمل الصفحة محليًا للضيف وتقرأ البيانات المدمجة بعد تسجيل الدخول.

للتتبع السحابي المتقدم، طبّق migration الجديدة بعد migration الأساسية:

```text
supabase/migrations/202608250002_learning_events.sql
```

ينشئ هذا الجدول `learning_events` لتسجيل أحداث `progress_saved` و`quiz_saved` و`sync_completed`. لا تُخزَّن إجابات الاختبارات الخام؛ تُرسل فقط نتيجة الاختبار وعدد المحاولات وحالة الاجتياز ضمن `metadata`. الجدول محمي بسياسات RLS تمنع المستخدم من قراءة أو إدخال أحداث مستخدم آخر.

بعد تطبيق الـ migrations، شغّل اختبارات RLS الموجودة في `supabase/tests/`. يبقى الموقع صالحًا للعمل دون Supabase؛ وتظهر لوحة الإنجاز التقدم المحلي وتستمر الاختبارات والتوصيات دون حساب. عند تفعيل الحساب، تدمج طبقة المزامنة البيانات المحلية مع السحابية، وتضع الأحداث غير المرسلة في طابور يعاد إرساله عند عودة الاتصال.
