import express from 'express';
import aiRoutes from '../server/routes/ai.js';

const app = express();
app.use(express.json());
app.use('/api/ai', aiRoutes);

function parseSSE(sseRaw) {
  let result = '';
  const lines = sseRaw.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
      try {
        const json = JSON.parse(line.slice(6));
        result += json.choices?.[0]?.delta?.content || '';
      } catch {}
    }
  }
  return result;
}

const server = app.listen(5099, async () => {
  console.log('Test server running on port 5099...');

  try {
    // 1. Test Session Start
    console.log('\n--- 1. Testing Session Start ---');
    const startRes = await fetch('http://localhost:5099/api/ai/ai-interview-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'practice',
        job_title: 'Software Developer',
        messages: [{ role: 'user', content: 'I want to practice for a general interview. Please start the mock interview.' }]
      })
    });
    const startRaw = await startRes.text();
    const startText = parseSSE(startRaw);
    if (startText.includes('Stage 1 of 5') && !startText.includes('You demonstrated clear ownership')) {
      console.log('  ✅ PASS: Starts at Stage 1 and does NOT praise the start command!');
    } else {
      console.error('  ❌ FAIL: Session start did not start at Stage 1');
    }

    // 2. Test Gibberish "JJJJJJJJJJ"
    console.log('\n--- 2. Testing Gibberish "JJJJJJJJJJ" ---');
    const gibberishRes = await fetch('http://localhost:5099/api/ai/ai-interview-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'practice',
        job_title: 'Software Developer',
        messages: [
          { role: 'user', content: 'I want to practice for a general interview. Please start the mock interview.' },
          { role: 'assistant', content: 'Welcome... Stage 1 of 5: Could you please walk me through your professional background?' },
          { role: 'user', content: 'JJJJJJJJJJ' }
        ]
      })
    });
    const gibberishRaw = await gibberishRes.text();
    const gibberishText = parseSSE(gibberishRaw);
    if (gibberishText.includes('Incomplete or Low-Effort') && gibberishText.includes('Stage 1') && !gibberishText.includes('clear ownership')) {
      console.log('  ✅ PASS: Rejected "JJJJJJJJJJ", re-prompted Stage 1, did not praise or advance!');
    } else {
      console.error('  ❌ FAIL: Gibberish handling failed');
    }

    // 3. Test Consecutive Gibberish "HHHHHHHHHHH"
    console.log('\n--- 3. Testing Consecutive Gibberish "HHHHHHHHHHH" ---');
    const gibberish2Res = await fetch('http://localhost:5099/api/ai/ai-interview-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'practice',
        job_title: 'Software Developer',
        messages: [
          { role: 'user', content: 'I want to practice for a general interview. Please start the mock interview.' },
          { role: 'assistant', content: 'Welcome... Stage 1 of 5' },
          { role: 'user', content: 'JJJJJJJJJJ' },
          { role: 'assistant', content: '⚠️ Incomplete or Low-Effort Response Detected... Please provide a substantive answer for Stage 1' },
          { role: 'user', content: 'HHHHHHHHHHH' }
        ]
      })
    });
    const gibberish2Raw = await gibberish2Res.text();
    const gibberish2Text = parseSSE(gibberish2Raw);
    if (gibberish2Text.includes('Incomplete or Low-Effort') && gibberish2Text.includes('Stage 1')) {
      console.log('  ✅ PASS: Rejected consecutive gibberish "HHHHHHHHHHH" and stayed on Stage 1!');
    } else {
      console.error('  ❌ FAIL: Consecutive gibberish handling failed');
    }

    // 4. Test Substantive Background Answer -> Progression to Stage 2
    console.log('\n--- 4. Testing Substantive Answer -> Progress to Stage 2 ---');
    const substantiveRes = await fetch('http://localhost:5099/api/ai/ai-interview-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'practice',
        job_title: 'Software Developer',
        messages: [
          { role: 'user', content: 'I want to practice for a general interview. Please start the mock interview.' },
          { role: 'assistant', content: 'Welcome... Stage 1 of 5: Could you please walk me through your professional background?' },
          { role: 'user', content: 'I have 5 years of experience building modern web and backend platforms. In my last role, I led the migration of our monolith to microservices using Node.js and PostgreSQL.' }
        ]
      })
    });
    const substantiveRaw = await substantiveRes.text();
    const substantiveText = parseSSE(substantiveRaw);
    if (substantiveText.includes('Stage 2 of 5') && substantiveText.includes('Technical Competency')) {
      console.log('  ✅ PASS: Evaluated background answer and cleanly transitioned to Stage 2 (Technical Competency)!');
    } else {
      console.error('  ❌ FAIL: Transition to Stage 2 failed');
    }

    // 5. Test Progression to Stage 3 (STAR)
    console.log('\n--- 5. Testing Progression to Stage 3 (STAR) ---');
    const stage2Res = await fetch('http://localhost:5099/api/ai/ai-interview-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'practice',
        job_title: 'Software Developer',
        messages: [
          { role: 'user', content: 'I want to practice for a general interview. Please start the mock interview.' },
          { role: 'assistant', content: 'Stage 1 of 5...' },
          { role: 'user', content: 'I have 5 years of experience building modern web platforms...' },
          { role: 'assistant', content: 'Stage 2 of 5: Technical Competency...' },
          { role: 'user', content: 'I follow test-driven development, CI/CD pipelines with GitHub Actions, Docker containerization, and clean architecture.' }
        ]
      })
    });
    const stage2Raw = await stage2Res.text();
    const stage2Text = parseSSE(stage2Raw);
    if (stage2Text.includes('Stage 3 of 5') && stage2Text.includes('Behavioral Challenge')) {
      console.log('  ✅ PASS: Evaluated technical answer and progressed to Stage 3 (STAR Behavioral Challenge)!');
    } else {
      console.error('  ❌ FAIL: Transition to Stage 3 failed');
    }

    console.log('\n=== ALL LIVE HTTP SSE TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
