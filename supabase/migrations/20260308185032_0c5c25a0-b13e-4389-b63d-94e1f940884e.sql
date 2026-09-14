
-- 1. Create a security definer function for certificate verification (replaces blanket public SELECT)
CREATE OR REPLACE FUNCTION public.verify_certificate(_cert_number text)
RETURNS TABLE (
  certificate_number text,
  issued_at timestamptz,
  course_title text,
  course_category text,
  course_level text,
  holder_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.certificate_number,
    c.issued_at,
    co.title AS course_title,
    co.category AS course_category,
    co.level AS course_level,
    p.full_name AS holder_name
  FROM certificates c
  LEFT JOIN courses co ON co.id = c.course_id
  LEFT JOIN profiles p ON p.user_id = c.user_id
  WHERE c.certificate_number = _cert_number
  LIMIT 1;
$$;

-- 2. Drop the blanket public SELECT policy on certificates
DROP POLICY IF EXISTS "cert_public_verify" ON public.certificates;

-- 3. Create a view for quiz questions that hides correct_answer for public access
CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = on) AS
  SELECT id, quiz_id, question, options, order_index, created_at
  FROM public.quiz_questions;

-- 4. Drop the overly permissive public read policy on quiz_questions
DROP POLICY IF EXISTS "qq_published_read" ON public.quiz_questions;

-- 5. Replace with authenticated-only policy that checks enrollment
CREATE POLICY "qq_enrolled_read" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      LEFT JOIN courses c ON c.id = q.course_id
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = auth.uid()
      WHERE q.id = quiz_questions.quiz_id
        AND q.is_published = true
        AND (
          q.course_id IS NULL
          OR e.id IS NOT NULL
        )
    )
  );
