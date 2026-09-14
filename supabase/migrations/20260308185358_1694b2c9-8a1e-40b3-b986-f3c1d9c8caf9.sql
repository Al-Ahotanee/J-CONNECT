
-- Drop the enrolled read policy on quiz_questions (exposes correct_answer)
DROP POLICY IF EXISTS "qq_enrolled_read" ON public.quiz_questions;

-- Create a policy on quiz_questions that only allows creators/admins (already have qq_admin_all, qq_creator_all, qq_learning_admin_all)
-- No public/enrolled read needed on the base table anymore.

-- Create a security definer function for grading quizzes server-side
CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS TABLE (score integer, passed boolean, total_questions integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total int;
  _correct int := 0;
  _pass_score int;
  _q record;
BEGIN
  SELECT pass_score INTO _pass_score FROM quizzes WHERE id = _quiz_id;
  
  _total := 0;
  FOR _q IN SELECT qq.id, qq.correct_answer FROM quiz_questions qq WHERE qq.quiz_id = _quiz_id ORDER BY qq.order_index
  LOOP
    _total := _total + 1;
    IF (_answers->>(_q.id::text))::int = _q.correct_answer THEN
      _correct := _correct + 1;
    END IF;
  END LOOP;

  IF _total = 0 THEN
    score := 0; passed := false; total_questions := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  score := ROUND((_correct::numeric / _total::numeric) * 100);
  passed := (score >= COALESCE(_pass_score, 50));
  total_questions := _total;
  RETURN NEXT;
END;
$$;
