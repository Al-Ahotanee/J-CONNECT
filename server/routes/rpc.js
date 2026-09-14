import express from 'express';
import { query } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/rpc/verify_certificate
 * Verifies authenticity of certificate by certificate number
 */
router.post('/verify_certificate', optionalAuth, async (req, res) => {
  try {
    const certNumber = (req.body._cert_number || req.body.certNumber || req.body.certificate_number || '').trim();
    if (!certNumber) {
      return res.status(400).json({ error: 'Certificate number is required' });
    }

    // Query certificates table joined with profiles and courses
    const sql = `
      SELECT 
        c.certificate_number,
        c.issued_at,
        c.status,
        c.user_id,
        c.course_id,
        COALESCE(p.full_name, 'Citizen') as holder_name,
        COALESCE(co.title, 'Professional Qualification') as course_title,
        COALESCE(co.category, 'Certification') as course_category,
        COALESCE(co.level, 'Advanced') as course_level
      FROM certificates c
      LEFT JOIN profiles p ON c.user_id = p.user_id
      LEFT JOIN courses co ON c.course_id = co.id
      WHERE c.certificate_number = ?
      LIMIT 1
    `;

    const rows = await query(sql, [certNumber]);

    if (rows && rows.length > 0) {
      return res.json([rows[0]]);
    }

    // Fallback: If not in certificates table, check completed enrollments
    const enrollmentSql = `
      SELECT 
        e.id,
        COALESCE(e.completed_at, e.enrolled_at) as issued_at,
        p.full_name as holder_name,
        co.title as course_title,
        co.category as course_category,
        co.level as course_level
      FROM enrollments e
      JOIN profiles p ON e.user_id = p.user_id
      JOIN courses co ON e.course_id = co.id
      WHERE e.completed = TRUE AND CONCAT('JCON-', UPPER(SUBSTRING(e.id, 1, 8))) = ?
      LIMIT 1
    `;
    
    const fallbackRows = await query(enrollmentSql, [certNumber]);
    if (fallbackRows && fallbackRows.length > 0) {
      return res.json([{
        certificate_number: certNumber,
        issued_at: fallbackRows[0].issued_at,
        status: 'valid',
        holder_name: fallbackRows[0].holder_name,
        course_title: fallbackRows[0].course_title,
        course_category: fallbackRows[0].course_category,
        course_level: fallbackRows[0].course_level
      }]);
    }

    return res.json([]);
  } catch (err) {
    console.error('[RPC verify_certificate Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rpc/grade_quiz_attempt
 * Secure server-side grading of quiz attempts
 */
router.post('/grade_quiz_attempt', optionalAuth, async (req, res) => {
  try {
    const quizId = req.body._quiz_id || req.body.quiz_id;
    const userAnswers = req.body._answers || req.body.answers || {};

    if (!quizId) {
      return res.status(400).json({ error: 'Quiz ID is required' });
    }

    // Fetch quiz pass score
    const quizRows = await query('SELECT * FROM quizzes WHERE id = ? LIMIT 1', [quizId]);
    const passScore = quizRows[0]?.pass_score || 70;

    // Fetch questions
    const questions = await query('SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = ?', [quizId]);
    const totalQuestions = questions.length;

    if (totalQuestions === 0) {
      return res.json([{
        score: 100,
        passed: true,
        total_questions: 0,
        correct_count: 0
      }]);
    }

    let correctCount = 0;
    for (const q of questions) {
      const chosen = userAnswers[q.id];
      if (chosen !== undefined && String(chosen) === String(q.correct_answer)) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= passScore;

    return res.json([{
      score,
      passed,
      total_questions: totalQuestions,
      correct_count: correctCount
    }]);
  } catch (err) {
    console.error('[RPC grade_quiz_attempt Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rpc/has_role
 * Checks if current user has a role
 */
router.post('/has_role', optionalAuth, async (req, res) => {
  try {
    const roleToCheck = req.body._role || req.body.role;
    if (!req.user) {
      return res.json({ data: false, error: null });
    }

    const roles = req.user.roles || [];
    const hasRole = roles.includes('super_admin') || roles.includes(roleToCheck);
    return res.json({ data: hasRole, error: null });
  } catch (err) {
    console.error('[RPC has_role Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rpc/execute_workflow
 * Executes workflow action step
 */
router.post('/execute_workflow', optionalAuth, async (req, res) => {
  try {
    const { workflow_id, status, notes } = req.body;
    if (!workflow_id || !status) {
      return res.status(400).json({ error: 'workflow_id and status required' });
    }

    const reviewerId = req.user?.id || null;
    await query(
      'UPDATE approval_workflows SET status = ?, notes = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [status, notes || null, reviewerId, workflow_id]
    );

    return res.json({ success: true, workflow_id, status });
  } catch (err) {
    console.error('[RPC execute_workflow Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
