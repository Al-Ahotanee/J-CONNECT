import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  evaluateInputQuality,
  isInitialSessionStart,
  getQuestionForStage,
  analyzeAnswerQuality,
  determineCurrentStage,
  generateScorecard,
  generateInterviewTips,
  generateCoachChatReply
} from '../services/interviewCoachNLP.js';

const router = express.Router();

// ==========================================
// 1. ADMIN CREATE USER (/api/ai/admin-create-user & /api/admin/create-user)
// ==========================================
router.post('/admin-create-user', requireAuth, async (req, res) => {
  try {
    const { email, password, full_name, role, phone, lga, ward, gender, user_type } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const userId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [
      userId, cleanEmail, passwordHash
    ]);

    const assignedRole = role || 'user';
    await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [
      uuidv4(), userId, assignedRole
    ]);

    await query(
      `INSERT INTO profiles 
       (id, user_id, full_name, email, phone, lga, ward, gender, user_type, profile_completion, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), userId, full_name.trim(), cleanEmail,
        phone || null, lga || null, ward || null, gender || null,
        user_type || 'job_seeker', 60, 'approved'
      ]
    );

    return res.json({ success: true, user_id: userId });
  } catch (err) {
    console.error('[Admin Create User Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. GENERATE ATS CV (/api/ai/generate-cv)
// ==========================================
router.post('/generate-cv', requireAuth, async (req, res) => {
  try {
    const { target_role } = req.body;
    const userId = req.user.id;

    const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const education = await query('SELECT * FROM education WHERE user_id = ? ORDER BY year_of_graduation DESC', [userId]);

    let skillsList = [];
    if (profile.skills) {
      skillsList = typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills;
    }

    let certsList = [];
    if (profile.certifications) {
      certsList = typeof profile.certifications === 'string' ? JSON.parse(profile.certifications) : profile.certifications;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are a professional ATS resume writer. Generate an ATS-optimized CV in JSON for:
Name: ${profile.full_name}
Target Role: ${target_role || profile.job_title || 'Professional'}
Skills: ${skillsList.join(', ')}
Sector: ${profile.sector || 'General'}
Work Experience: ${profile.work_experience || 'None specified'}
Education: ${education.map(e => `${e.qualification_type} in ${e.field_of_study || 'General'} from ${e.institution} (${e.year_of_graduation || ''})`).join('; ')}

Return ONLY valid JSON with structure:
{
  "professional_summary": "2-3 sentence summary",
  "work_experience": [{"title": "...", "company": "...", "location": "...", "period": "...", "achievements": ["..."]}],
  "education": [{"degree": "...", "institution": "...", "year": "...", "details": "..."}],
  "skills": {"technical": ["..."], "soft": ["..."]},
  "certifications": ["..."]
}`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return res.json({
              cv: parsed,
              profile: {
                full_name: profile.full_name,
                email: profile.email,
                phone: profile.phone,
                lga: profile.lga,
                job_title: profile.job_title || target_role,
                residential_address: profile.residential_address,
              }
            });
          }
        }
      } catch (aiErr) {
        console.warn('[AI CV Fallback]:', aiErr.message);
      }
    }

    // High quality ATS Fallback
    const roleTitle = target_role || profile.job_title || 'Professional Specialist';
    const fallbackCV = {
      professional_summary: `Results-driven and motivated ${roleTitle} with a proven track record of excellence in ${profile.sector || 'human capital development'}. Demonstrated capacity in ${skillsList.slice(0, 3).join(', ') || 'analytical problem-solving'} with strong commitment to organizational goals in Jigawa State.`,
      work_experience: [
        {
          title: profile.job_title || `${roleTitle} Intern`,
          company: profile.current_employer || 'Jigawa Development Initiative',
          location: `${profile.lga || 'Dutse'}, Jigawa State`,
          period: '2023 - Present',
          achievements: [
            `Managed strategic objectives and improved operational efficiency across assigned tasks.`,
            `Collaborated with cross-functional teams to implement best practices in ${profile.sector || 'operations'}.`,
            `Delivered measurable outcomes using ${skillsList[0] || 'core technical competencies'}.`
          ]
        }
      ],
      education: education.length > 0 ? education.map(e => ({
        degree: `${e.qualification_type} ${e.field_of_study ? 'in ' + e.field_of_study : ''}`,
        institution: e.institution,
        year: e.year_of_graduation || 'Completed',
        details: e.grade ? `Grade: ${e.grade}` : 'Verified Academic Record'
      })) : [
        {
          degree: 'Undergraduate / Secondary Qualification',
          institution: 'Accredited Institution in Jigawa State',
          year: '2022',
          details: 'Academic Honors'
        }
      ],
      skills: {
        technical: skillsList.length > 0 ? skillsList : ['Project Management', 'Data Analysis', 'Digital Literacy'],
        soft: ['Critical Thinking', 'Team Collaboration', 'Public Speaking', 'Problem Solving', 'Adaptability']
      },
      certifications: certsList.length > 0 ? certsList : ['State Human Capital Development Certification']
    };

    return res.json({
      cv: fallbackCV,
      profile: {
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        lga: profile.lga,
        job_title: profile.job_title || target_role,
        residential_address: profile.residential_address,
      }
    });
  } catch (err) {
    console.error('[Generate CV Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SMART JOB MATCH (/api/ai/smart-job-match)
// ==========================================
router.post('/smart-job-match', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const education = await query('SELECT * FROM education WHERE user_id = ?', [userId]);
    const jobs = await query('SELECT * FROM jobs WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 50');

    let userSkills = [];
    if (profile.skills) {
      userSkills = (typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills).map(s => s.toLowerCase());
    }

    const matches = jobs.map(job => {
      let score = 20; // base score
      let reasons = [];

      let jobSkills = [];
      if (job.skills_required) {
        jobSkills = (typeof job.skills_required === 'string' ? JSON.parse(job.skills_required) : job.skills_required).map(s => s.toLowerCase());
      }

      const matchedSkills = jobSkills.filter(js => userSkills.some(us => us.includes(js) || js.includes(us)));
      if (matchedSkills.length > 0) {
        score += matchedSkills.length * 20;
        reasons.push(`Skills match: ${matchedSkills.join(', ')}`);
      }

      if (profile.sector && job.sector && profile.sector.toLowerCase() === job.sector.toLowerCase()) {
        score += 20;
        reasons.push(`Direct sector match (${job.sector})`);
      }

      if (profile.lga && job.lga && profile.lga.toLowerCase() === job.lga.toLowerCase()) {
        score += 15;
        reasons.push(`Located in your LGA (${job.lga})`);
      }

      if (education.some(e => job.qualification_required && e.qualification_type.toLowerCase() === job.qualification_required.toLowerCase())) {
        score += 15;
        reasons.push(`Qualification matches (${job.qualification_required})`);
      }

      score = Math.min(score, 98);

      return {
        job,
        score,
        matchReason: reasons.join(' • ') || 'General profile alignment',
      };
    });

    matches.sort((a, b) => b.score - a.score);

    return res.json({ matches: matches.slice(0, 10) });
  } catch (err) {
    console.error('[Smart Job Match Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. AI INTERVIEW COACH (/api/ai/ai-interview-coach)
// ==========================================
router.post('/ai-interview-coach', optionalAuth, async (req, res) => {
  try {
    const { messages = [], mode = 'practice' } = req.body;
    const jobTitle = req.body.jobTitle || req.body.job_title || 'Professional';
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

    let reply = '';
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    // 1. If LLM API key is present, attempt generative completion with strict evaluation rules
    if (apiKey && lastUserMsg) {
      try {
        const sysPrompt = mode === 'tips' 
          ? `You are an expert interview coach for candidates in Jigawa State, Nigeria. Provide structured, actionable, and role-specific interview preparation tips for a ${jobTitle} position.`
          : mode === 'chat'
          ? `You are a supportive, insightful career coach at J-Connect for candidates in Jigawa State. Answer candidate questions about interviews, salary negotiation, resume preparation, and confidence for ${jobTitle} roles.`
          : `You are an experienced HR interviewer conducting a structured 5-stage mock interview for a ${jobTitle} position in Jigawa State, Nigeria.
STRICT GUIDELINES:
1. Candidate Input Validation: If the candidate inputs repeated characters (e.g. "JJJJJJJJ", "HHHHHHH"), single tokens, or low-effort gibberish, DO NOT PRAISE THEM. Politely explain why their answer is incomplete and prompt them to expand with a concrete example.
2. Progressive Stages: Do not repeat questions. Progress through:
   - Stage 1: Professional Background & Motivation
   - Stage 2: Technical/Domain Problem Solving for ${jobTitle}
   - Stage 3: Behavioral Challenge (STAR Method: Situation, Task, Action, Result)
   - Stage 4: Conflict Resolution, Team Dynamics & Integrity
   - Stage 5: Civic Impact in Jigawa State & Candidate Q&A
3. Constructive Feedback: Provide thoughtful, specific critique on their previous answer before moving to the next stage question.`;

        const conversationHistory = messages.slice(-8).map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');
        const prompt = `${sysPrompt}\n\nRecent Conversation:\n${conversationHistory}\n\nCandidate's latest input:\n"${lastUserMsg}"\n\nYour response:`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.7 }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            reply = text;
          }
        }
      } catch (aiErr) {
        console.warn('[AI Coach LLM Fallback]:', aiErr.message);
      }
    }

    // 2. Deterministic Intelligent Multi-Turn NLP Engine (Runs offline or as fail-safe)
    if (!reply) {
      if (mode === 'tips') {
        reply = generateInterviewTips(jobTitle);
      } else if (mode === 'chat') {
        reply = generateCoachChatReply(lastUserMsg, jobTitle);
      } else {
        // Mode === 'practice' (Mock Interview Session)
        const isStart = isInitialSessionStart(lastUserMsg, messages);

        if (isStart) {
          // Opening Session & Stage 1 Question
          const q1 = getQuestionForStage(1, jobTitle);
          reply = `Welcome to your mock interview session for the **${jobTitle}** position in Jigawa State! I am your AI Interview Coach.

We will conduct a 5-stage comprehensive interview:
1. **Background & Professional Value Proposition**
2. **Technical & Domain Execution**
3. **Behavioral Challenge (STAR Method)**
4. **Team Collaboration, Conflict Resolution & Integrity**
5. **Civic Alignment & Candidate Q&A**

Let's begin with our first question:

---

### **${q1.title}**
${q1.question}

💡 **Coach Tip:** ${q1.tip}`;
        } else {
          // Candidate answered or provided input
          const quality = evaluateInputQuality(lastUserMsg);

          // Determine the stage of the interview
          let currentStage = determineCurrentStage(messages);
          if (currentStage === 0) currentStage = 1;

          if (!quality.isValid) {
            // Gibberish / Low-effort input detected!
            const stageInfo = getQuestionForStage(Math.min(currentStage, 5), jobTitle) || getQuestionForStage(1, jobTitle);
            const userSnippet = lastUserMsg.length > 25 ? lastUserMsg.slice(0, 22) + '...' : lastUserMsg;

            reply = `⚠️ **Incomplete or Low-Effort Response Detected**

${quality.feedback}

In a competitive interview for a **${jobTitle}** position, interview panels in Jigawa State evaluate communication depth, professional articulation, and concrete examples. Your response \`"${userSnippet}"\` cannot be evaluated.

---

### **Please provide a substantive answer for ${stageInfo.title}:**
${stageInfo.question}

💡 **Coach Tip:** ${stageInfo.tip}`;
          } else {
            // Legitimate response provided!
            const evaluation = analyzeAnswerQuality(lastUserMsg, currentStage, jobTitle);

            if (currentStage === 1) {
              const q2 = getQuestionForStage(2, jobTitle);
              reply = `${evaluation.feedback}

---

### **${q2.title}**
${q2.question}

💡 **Coach Tip:** ${q2.tip}`;
            } else if (currentStage === 2) {
              const q3 = getQuestionForStage(3, jobTitle);
              reply = `${evaluation.feedback}

---

### **${q3.title}**
${q3.question}

💡 **Coach Tip:** ${q3.tip}`;
            } else if (currentStage === 3) {
              const q4 = getQuestionForStage(4, jobTitle);
              reply = `${evaluation.feedback}

---

### **${q4.title}**
${q4.question}

💡 **Coach Tip:** ${q4.tip}`;
            } else if (currentStage === 4) {
              const q5 = getQuestionForStage(5, jobTitle);
              reply = `${evaluation.feedback}

---

### **${q5.title}**
${q5.question}

💡 **Coach Tip:** ${q5.tip}`;
            } else {
              // Stage 5 completed -> Deliver Comprehensive Final Scorecard!
              const scorecard = generateScorecard(jobTitle, messages);
              reply = `${evaluation.feedback}

${scorecard}`;
            }
          }
        }
      }
    }

    // Format as SSE streaming response for AIInterviewCoachPage
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const words = reply.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    return res.end();
  } catch (err) {
    console.error('[Interview Coach Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. COURSE RECOMMENDATIONS (/api/ai/ai-course-recommend)
// ==========================================
router.post('/ai-course-recommend', optionalAuth, async (req, res) => {
  try {
    const courses = await query('SELECT * FROM courses WHERE is_published = TRUE LIMIT 6');
    return res.json({ recommended: courses });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
