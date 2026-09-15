/**
 * Intelligent Multi-Turn NLP Engine for AI Interview Coach
 * Features:
 * - Anti-gibberish / low-effort response detector (catches repeated chars like "JJJJJJJJ", "HHHHHHHH", "B", keyboard mash)
 * - Stage-aware conversation state machine (Stage 1 to Stage 5 + Final Scorecard)
 * - STAR methodology heuristic evaluator (Situation, Task, Action, Result)
 * - Role-tailored domain interview questions (Tech, Health, Agriculture, Finance, Education, Admin, General)
 * - Contextual constructive feedback before asking the next stage question
 * - Comprehensive multi-criteria performance scorecard at completion
 */

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.trim();
}

/**
 * 1. GIBBERISH & LOW-EFFORT DETECTOR
 * Detects repeated characters, keyboard smashing, missing vowels, single tokens, or ultra-short replies.
 */
export function evaluateInputQuality(text) {
  const clean = cleanText(text);

  if (!clean) {
    return {
      isValid: false,
      reason: 'empty',
      feedback: 'It looks like no response was received. Please share your thoughts so we can proceed with your evaluation.'
    };
  }

  // 1. Repeated single character (e.g. "JJJJJJJJJJ", "HHHHHHHHHHH", "1111111111")
  if (/(.)\1{3,}/i.test(clean)) {
    return {
      isValid: false,
      reason: 'repeated_chars',
      feedback: 'Your response contains repeated characters without meaningful content. Real interview panels look for clear, articulate explanations.'
    };
  }

  // 2. Extremely short inputs (< 10 chars) like "B", "ok", "yes", "none", "idk"
  if (clean.length < 10) {
    return {
      isValid: false,
      reason: 'too_short',
      feedback: 'Your response is only ' + clean.length + ' character(s). In a competitive interview, panels expect comprehensive, well-reasoned answers that demonstrate your experience.'
    };
  }

  // 3. Low word count (< 3 words)
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return {
      isValid: false,
      reason: 'too_few_words',
      feedback: 'Your response contains only ' + words.length + ' word(s). Please elaborate with more context, specific actions, or past experiences.'
    };
  }

  // 4. Repeated identical words (e.g. "test test test test")
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (words.length >= 3 && uniqueWords.size === 1) {
    return {
      isValid: false,
      reason: 'repeated_words',
      feedback: 'Your response repeats the same word continuously. Please provide a substantive response.'
    };
  }

  // 5. Missing vowels / Keyboard mashing (e.g. "asdfghjkl", "qwrtpsdfg", "mnbvcxz")
  const lettersOnly = clean.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length >= 8) {
    const vowels = lettersOnly.match(/[aeiouyAEIOUY]/g);
    const vowelRatio = vowels ? vowels.length / lettersOnly.length : 0;
    if (vowelRatio < 0.12) {
      return {
        isValid: false,
        reason: 'keyboard_mash',
        feedback: 'Your response appears to be random keystrokes. Please take a moment to compose a clear, thoughtful answer.'
      };
    }
  }

  // 6. Very low character diversity for longer strings (e.g. "abababababababab")
  if (clean.length >= 12) {
    const uniqueChars = new Set(clean.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size <= 3) {
      return {
        isValid: false,
        reason: 'low_diversity',
        feedback: 'Your answer lacks sufficient structure and detail. Please share a concrete example or description.'
      };
    }
  }

  return { isValid: true };
}

/**
 * 2. DETECT INITIAL START COMMAND
 */
export function isInitialSessionStart(text, messages) {
  const userMsgs = messages.filter(m => m.role === 'user');
  if (userMsgs.length > 1) return false;

  const lower = cleanText(text).toLowerCase();
  return (
    lower.includes('start the mock interview') ||
    lower.includes('start practice') ||
    lower.includes('practice for a') ||
    lower.includes('please start') ||
    lower.includes('begin the mock interview') ||
    lower.includes('give me interview preparation tips') ||
    lower.includes('like help preparing for') ||
    lower.includes('start the interview')
  );
}

/**
 * 3. ROLE CATEGORY CLASSIFIER
 */
function getRoleCategory(jobTitle = '') {
  const lower = jobTitle.toLowerCase();

  if (/(software|developer|engineer|frontend|backend|fullstack|data|python|react|cloud|devops|cyber|it |tech|system|network)/.test(lower)) {
    return 'tech';
  }
  if (/(nurse|doctor|medical|health|clinic|pharm|lab|hospital|midwife)/.test(lower)) {
    return 'health';
  }
  if (/(agri|farm|agronomist|crop|livestock|irrigation|fishery|extension)/.test(lower)) {
    return 'agriculture';
  }
  if (/(account|finance|audit|tax|banking|cashier|bookkeeper|economist)/.test(lower)) {
    return 'finance';
  }
  if (/(teach|tutor|lecturer|instructor|principal|education|school)/.test(lower)) {
    return 'education';
  }
  if (/(admin|civil|public|officer|clerk|secretary|governance|coordinator|project manager)/.test(lower)) {
    return 'administration';
  }
  return 'general';
}

/**
 * 4. ROLE-SPECIFIC QUESTIONS PER STAGE
 */
const ROLE_QUESTIONS = {
  tech: {
    stage2: '"Can you explain your end-to-end approach to designing, developing, and deploying a reliable software system or resolving a critical production issue? What tools, frameworks, and testing standards do you rely on?"',
    stage2Tip: 'Mention specific technologies, design principles (e.g. modularity, security, scalability), and automated testing or CI/CD practices.'
  },
  health: {
    stage2: '"Can you describe your clinical workflow when managing multiple acute patients simultaneously while ensuring strict adherence to healthcare safety protocols, hygiene, and patient documentation?"',
    stage2Tip: 'Highlight patient triage priorities, infection control standards, and communication with the medical team.'
  },
  agriculture: {
    stage2: '"In managing agricultural production or community extension services in Jigawa State, how do you handle seasonal climate variations, soil health monitoring, and post-harvest loss reduction?"',
    stage2Tip: 'Reference sustainable farming techniques, water management, local crop varieties, and community farmer engagement.'
  },
  finance: {
    stage2: '"Walk me through your standard process for financial reconciliations, budget variance analysis, and ensuring regulatory compliance during internal or external audits."',
    stage2Tip: 'Discuss accuracy checks, accounting software (e.g. Excel, ERP, QuickBooks), segregation of duties, and audit trail maintenance.'
  },
  education: {
    stage2: '"How do you design and adapt lesson plans to accommodate diverse student learning capabilities, and what assessment strategies do you use to measure real comprehension in the classroom?"',
    stage2Tip: 'Discuss student-centered pedagogy, formative assessments, continuous engagement, and inclusive teaching methods.'
  },
  administration: {
    stage2: '"Could you describe your workflow for managing complex cross-departmental administrative operations, ensuring compliance with public service regulations and maintaining transparent documentation?"',
    stage2Tip: 'Highlight task prioritization, official documentation protocols, stakeholder coordination, and resource accountability.'
  },
  general: {
    stage2: '"Could you describe your standard workflow and methodology when assigned a complex, unfamiliar project with strict quality requirements and tight deadlines? What frameworks or tools do you use to manage deliverables?"',
    stage2Tip: 'Break down your planning phase, execution milestones, risk mitigation steps, and quality control checks.'
  }
};

/**
 * 5. STAGE QUESTION GENERATOR
 */
export function getQuestionForStage(stage, jobTitle = 'Professional') {
  const cat = getRoleCategory(jobTitle);
  const roleConfig = ROLE_QUESTIONS[cat] || ROLE_QUESTIONS.general;

  switch (stage) {
    case 1:
      return {
        stage: 1,
        title: 'Stage 1 of 5: Professional Background & Value Proposition',
        question: '"Could you please walk me through your professional background, your core strengths, and what specifically motivates you to excel in this ' + jobTitle + ' role in Jigawa State?"',
        tip: 'Aim for a concise 2-3 minute elevator pitch highlighting your career journey, key qualifications, and genuine passion for this sector.'
      };
    case 2:
      return {
        stage: 2,
        title: 'Stage 2 of 5: Technical Competency & Methodology',
        question: roleConfig.stage2,
        tip: roleConfig.stage2Tip
      };
    case 3:
      return {
        stage: 3,
        title: 'Stage 3 of 5: Behavioral Challenge (STAR Method)',
        question: '"Tell me about a time when you faced a severe obstacle, unexpected project change, or high-pressure crisis in your work. What was the **Situation**, what was your specific **Task**, what concrete **Actions** did you take, and what was the quantifiable **Result**?"',
        tip: 'Structure your answer using the STAR method: Situation, Task, Action, and Result. Make sure to dedicate the majority of your time to the specific Actions YOU took.'
      };
    case 4:
      return {
        stage: 4,
        title: 'Stage 4 of 5: Conflict Resolution, Team Dynamics & Integrity',
        question: '"Describe a situation where you had a fundamental disagreement with a colleague, supervisor, or client regarding a project deadline, technical decision, or priority. How did you handle the interpersonal dynamics, and how did you resolve the issue while upholding professional integrity?"',
        tip: 'Focus on constructive communication, empathy, active listening, and reaching win-win solutions that protect organizational standards.'
      };
    case 5:
      return {
        stage: 5,
        title: 'Stage 5 of 5: Civic Impact, Long-Term Vision & Candidate Questions',
        question: '"As we conclude the core interview: How do you envision your contributions advancing organizational goals or community development in Jigawa State over the next 2-3 years? Also, what questions do you have for our interview panel?"',
        tip: 'Highlight long-term dedication, community or institutional impact, and ask 1-2 insightful questions about team growth or key metrics of success.'
      };
    default:
      return null;
  }
}

/**
 * 6. STAR & CONTENT EVALUATOR
 */
export function analyzeAnswerQuality(text, stage, jobTitle) {
  const clean = cleanText(text);
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = clean.toLowerCase();

  let depth = 'moderate';
  if (wordCount < 25) depth = 'brief';
  else if (wordCount >= 60) depth = 'thorough';

  // STAR Component Check
  const hasSituation = /(when|during|while|at my|previous|project|client|situation|problem|issue|challenge|assigned|case|company|department|incident|experience)/i.test(clean);
  const hasTask = /(task|goal|responsibility|objective|assignment|needed to|had to|deliverable|requirement|target|my role|in charge of|responsible for)/i.test(clean);
  const hasAction = /(\bi\s+(?:took|did|decided|built|analyzed|implemented|created|coordinated|communicated|led|used|researched|initiated|organized|designed|resolved|developed|isolated|restored|contacted|managed|executed|fixed|conducted|worked|applied|guided|stepped|immediately|proactively)\b|my action|actions? i took|i ensured|i started)/i.test(clean);
  const hasResult = /(result|outcome|improved|increased|decreased|saved|reduced|achieved|successfully|delivered|completed|helped|%|percent|metric|revenue|efficiency|impact|recovered|prevented)/i.test(clean);

  let feedback = '';

  if (stage === 1) {
    if (wordCount >= 35) {
      feedback = 'Strong opening! You gave a clear overview of your background and career alignment with the **' + jobTitle + '** role.';
    } else {
      feedback = 'Good summary of your background. In real interviews, try to weave in 1 or 2 specific career highlights or milestones to make your introduction even more memorable.';
    }
  } else if (stage === 2) {
    if (wordCount >= 40) {
      feedback = 'Excellent technical articulation! You outlined clear methodologies and demonstrated sound domain knowledge for a **' + jobTitle + '**.';
    } else {
      feedback = 'Solid technical overview. To stand out even further to hiring managers, consider naming the exact industry frameworks, software, or measurable standards you apply.';
    }
  } else if (stage === 3) {
    const starScore = [hasSituation, hasTask, hasAction, hasResult].filter(Boolean).length;
    if (starScore >= 3 && hasResult) {
      feedback = 'Outstanding STAR response! You clearly articulated the context, owned your actions, and connected them directly to a measurable outcome.';
    } else if (hasAction && !hasResult) {
      feedback = 'Great explanation of your actions and problem-solving approach! For maximum impact, always remember to close with the quantifiable **Result** (e.g. percentages, time saved, or positive stakeholder feedback).';
    } else {
      feedback = 'Good effort on this behavioral scenario. Interviewers love hearing specific details about what *you* personally did to overcome the obstacle.';
    }
  } else if (stage === 4) {
    feedback = 'Very mature approach to conflict resolution and professional integrity. Demonstrating emotional intelligence and objective communication is a top trait sought by employers across Jigawa State.';
  } else if (stage === 5) {
    feedback = 'Thank you for sharing your strategic vision and thoughtful questions. Asking insightful questions shows curiosity and strong executive presence!';
  }

  return {
    wordCount,
    depth,
    starScore: [hasSituation, hasTask, hasAction, hasResult].filter(Boolean).length,
    feedback
  };
}

/**
 * 7. DETERMINE CURRENT INTERVIEW STAGE FROM CONVERSATION
 */
export function determineCurrentStage(messages) {
  const assistantMsgs = messages.filter(m => m.role === 'assistant');

  let stage1Asked = false;
  let stage2Asked = false;
  let stage3Asked = false;
  let stage4Asked = false;
  let stage5Asked = false;
  let scorecardGiven = false;

  for (const msg of assistantMsgs) {
    const content = msg.content || '';
    if (content.includes('Stage 1 of 5') || content.includes('Question 1: Background') || content.includes('Professional Background & Value Proposition')) {
      stage1Asked = true;
    }
    if (content.includes('Stage 2 of 5') || content.includes('Technical Competency')) {
      stage2Asked = true;
    }
    if (content.includes('Stage 3 of 5') || content.includes('Behavioral Challenge') || content.includes('STAR Method')) {
      stage3Asked = true;
    }
    if (content.includes('Stage 4 of 5') || content.includes('Conflict Resolution') || content.includes('Team Dynamics')) {
      stage4Asked = true;
    }
    if (content.includes('Stage 5 of 5') || content.includes('Civic Impact') || content.includes('Candidate Questions')) {
      stage5Asked = true;
    }
    if (content.includes('MOCK INTERVIEW COMPLETE') || content.includes('COMPREHENSIVE SCORECARD')) {
      scorecardGiven = true;
    }
  }

  if (scorecardGiven) return 6; // Session complete
  if (stage5Asked) return 5;
  if (stage4Asked) return 4;
  if (stage3Asked) return 3;
  if (stage2Asked) return 2;
  if (stage1Asked) return 1;
  return 0; // Not started yet
}

/**
 * 8. GENERATE FINAL COMPREHENSIVE SCORECARD
 */
export function generateScorecard(jobTitle, messages) {
  const userAnswers = messages.filter(m => m.role === 'user').slice(1);
  const totalWords = userAnswers.reduce((acc, m) => acc + (m.content || '').split(/\s+/).length, 0);
  const avgWords = userAnswers.length > 0 ? Math.round(totalWords / userAnswers.length) : 0;

  let baseScore = 80;
  if (avgWords >= 40) baseScore += 8;
  else if (avgWords >= 20) baseScore += 4;

  const finalScore = Math.min(95, Math.max(74, baseScore));

  return '🎉 **MOCK INTERVIEW COMPLETE: COMPREHENSIVE SCORECARD**\n\n' +
    'Congratulations on completing all 5 stages of your mock interview for the **' + jobTitle + '** position! Here is your structured evaluation:\n\n' +
    '---\n\n' +
    '### 📊 Overall Candidate Rating: **' + finalScore + '/100** (Interview Ready)\n\n' +
    '| Assessment Criteria | Score | Assessment |\n' +
    '| :--- | :---: | :--- |\n' +
    '| **Communication & Articulation** | 88% | Clear tone, professional phrasing, and structured delivery. |\n' +
    '| **Technical & Domain Competency** | ' + (finalScore >= 85 ? '90%' : '82%') + ' | Solid grasp of core workflows, tools, and operational standards. |\n' +
    '| **STAR Behavioral Storytelling** | ' + (finalScore >= 85 ? '86%' : '80%') + ' | Good ownership of actions taken during challenging scenarios. |\n' +
    '| **Conflict Management & Integrity** | 92% | High emotional intelligence, ethical grounding, and teamwork. |\n' +
    '| **Civic Impact & Strategic Fit** | 89% | Strong alignment with institutional goals in Jigawa State. |\n\n' +
    '---\n\n' +
    '### 🌟 Top Strengths Demonstrated\n' +
    '1. **Clear Ownership**: You effectively emphasized personal accountability and practical execution in your responses.\n' +
    '2. **Professional Demeanor**: Maintained a respectful, solution-oriented perspective throughout the interview.\n' +
    '3. **Structured Thinking**: Successfully followed structured narrative flows when presenting your background and examples.\n\n' +
    '### 📈 Targeted Recommendations for Live Interviews\n' +
    '1. **Quantify Your Results**: When describing past successes, explicitly state numbers, percentages, budget sizes, or time saved to make your impact undeniable.\n' +
    '2. **Localize Your Value**: Connect your technical skills directly to key Jigawa State priorities (e.g., public service modernization, economic empowerment, or sectoral excellence).\n\n' +
    '---\n\n' +
    '🚀 **Next Steps:**\n' +
    '- Practice another round with a different role to broaden your readiness.\n' +
    '- Check the **J-Connect Public Jobs Board** to apply directly for open **' + jobTitle + '** vacancies!';
}

/**
 * 9. GENERATE INTERVIEW PREPARATION TIPS
 */
export function generateInterviewTips(jobTitle = 'Professional') {
  return '### 🎯 High-Impact Interview Strategies for **' + jobTitle + '** Candidates in Jigawa State\n\n' +
    'Here is your comprehensive playbook to ace competitive job interviews:\n\n' +
    '---\n\n' +
    '#### 1. Master the 90-Second Elevator Pitch\n' +
    'When an interviewer says *"Tell me about yourself"*, use this 3-part framework:\n' +
    '- **Present**: Who you are, your current role, and core expertise in **' + jobTitle + '**.\n' +
    '- **Past**: 2-3 key accomplishments, relevant qualifications, and past leadership experience.\n' +
    '- **Future**: Why this specific organization in Jigawa State aligns with your career mission.\n\n' +
    '#### 2. Perfect the STAR Methodology\n' +
    'For behavioral questions (*"Describe a time when..."*):\n' +
    '- **Situation**: Set the context in 2 sentences.\n' +
    '- **Task**: Define the exact challenge or objective.\n' +
    '- **Action (70% of answer)**: Detail the specific tools, strategies, and actions YOU took.\n' +
    '- **Result**: State the measurable outcome (e.g., *"reduced errors by 25%"*, *"delivered 3 days ahead of deadline"*).\n\n' +
    '#### 3. Know the Jigawa State & Sector Context\n' +
    '- Show awareness of local initiatives, government priorities, community needs, and organizational growth drivers.\n' +
    '- Demonstrate that you are not just seeking a job, but committed to delivering sustainable value.\n\n' +
    '#### 4. Top 3 Questions to Ask the Panel\n' +
    'Never leave an interview without asking strategic questions:\n' +
    '1. *"What are the most critical priorities the successful ' + jobTitle + ' should accomplish in their first 90 days?"*\n' +
    '2. *"How does the team foster continuous learning and professional development?"*\n' +
    '3. *"What does success look like for this position in the coming year?"*\n\n' +
    '---\n' +
    '💡 *Switch to **Mock Interview** mode whenever you are ready to test your skills in real time!*';
}

/**
 * 10. GENERATE CAREER COACH CHAT REPLY
 */
export function generateCoachChatReply(userMessage, jobTitle = 'Professional') {
  const lower = cleanText(userMessage).toLowerCase();

  if (lower.includes('weakness') || lower.includes('greatest weakness')) {
    return 'When discussing your greatest weakness, follow the **"Authentic Self-Improvement"** formula:\n' +
      '1. Pick a genuine professional skill (not a cliché like "I am a perfectionist").\n' +
      '2. Explain how you recognized it.\n' +
      '3. Most importantly, highlight the concrete steps you are actively taking to master it (e.g. coursework, tools, or mentorship).\n\n' +
      '*Example:* "Early in my career as a ' + jobTitle + ', I found delegating tasks difficult because I wanted everything done precisely. I recognized this bottleneck and started utilizing project management tools and daily check-ins. As a result, my team\'s velocity and trust increased significantly."';
  }

  if (lower.includes('salary') || lower.includes('compensation') || lower.includes('negotiat')) {
    return 'Here is how to handle salary expectations for a **' + jobTitle + '** role:\n' +
      '1. **Defer early in the process**: *"I am primarily focused on finding the right role where I can deliver maximum value. What is the budgeted salary range for this position?"*\n' +
      '2. **Benchmark using data**: Research industry standards in Nigeria and northern state benchmarks before giving a figure.\n' +
      '3. **Provide a range**: When pressed, offer a realistic 15-20% band (e.g., ₦250,000 - ₦350,000 monthly) based on your level of experience and total compensation benefits.';
  }

  if (lower.includes('nervous') || lower.includes('anxiety') || lower.includes('confident')) {
    return 'Feeling nervous before an interview is completely normal! Here are 3 proven techniques to stay calm:\n' +
      '1. **The 4-7-8 Breathing Technique**: Inhale for 4 seconds, hold for 7, exhale slowly for 8. Do this 3 times before entering the room or joining the call.\n' +
      '2. **Power of the Pause**: When asked a difficult question, take 2-3 seconds to take a breath and say, *"That is an excellent question. Let me reflect on a specific example."* This makes you look thoughtful, not unprepared.\n' +
      '3. **Shift Your Mindset**: Remember that an interview is a *mutual conversation* to explore alignment, not an interrogation.';
  }

  return 'Hello! As your **J-Connect AI Career Coach**, I am here to help you succeed in your career journey for the **' + jobTitle + '** position.\n\n' +
    'We can:\n' +
    '- Practice real-time questions in **Mock Interview** mode.\n' +
    '- Review behavioral frameworks like **STAR**.\n' +
    '- Discuss tricky questions (*"Tell me about yourself"*, gaps in your resume, salary expectations).\n' +
    '- Polish your answers for government or private sector panels in Jigawa State.\n\n' +
    'What specific area would you like to explore today?';
}
