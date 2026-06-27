const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELS  = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];

function checkKey() {
  if (!API_KEY || API_KEY === 'your_gemini_api_key_here')
    throw new Error('Gemini API key not set in .env');
}

// ── Simple single-turn call ─────────────────────────────────────────────────
async function callGemini(prompt) {
  checkKey();
  let lastErr;
  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        lastErr = new Error(e?.error?.message || `HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response');
      return text;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('All Gemini models failed');
}

// ── Multi-turn conversational call ─────────────────────────────────────────
async function callGeminiMultiTurn(systemInstruction, contents) {
  checkKey();
  let lastErr;
  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.75, maxOutputTokens: 512 },
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        lastErr = new Error(e?.error?.message || `HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response');
      return text.trim();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('All Gemini models failed');
}

// ── Conversational Interview ────────────────────────────────────────────────
// conversationHistory: [{ role: 'model'|'user', text: string }, ...]
// Returns: { question: string, shouldEnd: boolean }
export async function getNextInterviewQuestion({ role, duration, resumeFile, conversationHistory }) {
  const systemInstruction = `You are a highly experienced professional interviewer conducting a real-world job interview.

Your goal is to simulate a realistic, adaptive, and conversational interview experience.

Context:
- Job Role: ${role}
- Interview Duration: ${duration} minutes
- Candidate Resume: ${resumeFile ? 'Provided as an attached PDF document' : 'Not provided'}

Instructions:

1. Start the interview naturally:
   Begin with a warm greeting and ask: "Tell me about yourself."

2. Conduct a REAL conversational interview:
   - Ask ONE question at a time.
   - Wait for the candidate's answer before asking the next question.
   - Ask follow-up questions based on the candidate’s previous response.
   - Do NOT ask unrelated or random questions.

3. Adaptive difficulty:
   - Start with EASY questions (background, basics).
   - If answers are strong → move to MEDIUM → HARD.
   - If answers are weak → reduce difficulty.

4. Resume-based personalization:
   - If resume is provided, ask about projects, skills, and technologies.
   - Ask deep “why/how” questions about their work.

5. Maintain interview flow:
   - Keep conversation natural and professional.
   - Do not repeat questions.
   - Do not ask multiple questions at once.

${/software|engineer|developer|programmer|coder|data|frontend|backend|fullstack/i.test(role) ? '6. Technical Coding Round (CRITICAL):\n   - Since this is a technical role, you MUST ask a coding/algorithmic problem during the interview.\n   - Explicitly instruct the candidate to: "Please use the Code Editor tab to write your solution, and explain your thought process out loud as you type."\n   - Keep the problem solvable in 5 minutes (e.g., array manipulation, a simple React component, string parsing).' : ''}

6. Candidate control:
   - If the candidate says things like:
     "end interview", "stop", "exit", "finish"
     → immediately end the interview politely.
   - Respond with exactly:
     "Thank you for your time. The interview has been concluded."

7. Ending condition:
   - End naturally when enough depth is reached or time is completed (usually after ${Math.max(3, Math.round(duration * 0.8))} questions).
   - Say exactly:
     "That concludes the interview. Thank you."

8. Strict rules:
   - Do NOT break character
   - Do NOT explain instructions
   - Do NOT generate multiple questions at once
   - Act like a real human interviewer`;

  // Build Gemini multi-turn contents array
  const contents = conversationHistory.map(turn => ({
    role: turn.role, // 'model' or 'user'
    parts: [{ text: turn.text }],
  }));

  // Ensure first message is from user to establish the conversation flow
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello, I am ready to begin the interview.' }] });
  }

  // Inject resume into the first user message if provided
  if (resumeFile && contents[0].role === 'user') {
    contents[0].parts.push({
      inlineData: { mimeType: resumeFile.type, data: resumeFile.data }
    });
  }

  const response = await callGeminiMultiTurn(systemInstruction, contents);
  
  const responseLower = response.toLowerCase();
  if (responseLower.includes('conclude') || responseLower.includes('thank you for your time')) {
    return { question: response, shouldEnd: true };
  }

  return { question: response, shouldEnd: false };
}

// ── Feedback Generation ─────────────────────────────────────────────────────
export async function generateFeedback({ role, questions, responses, speechMetrics, emotionSummary }) {
  const qa = questions.map((q, i) =>
    `Q${i + 1}: ${q}\nAnswer: ${responses[i] || '(no answer given)'}`
  ).join('\n\n');

  const prompt = `You are an expert interview coach. Evaluate this mock interview for a ${role} position.

TRANSCRIPT:
${qa}

SPEECH ANALYTICS:
- Avg words/min: ${speechMetrics.avgWpm}
- Filler words: ${speechMetrics.fillerCount} (${speechMetrics.fillerWords?.join(', ') || 'none'})
- Fluency score: ${speechMetrics.fluencyScore}%

EMOTION ANALYSIS:
${JSON.stringify(emotionSummary, null, 2)}

Provide honest, constructive feedback. Return ONLY valid JSON:
{
  "overallScore": <0-100>,
  "confidenceScore": <0-100>,
  "communicationScore": <0-100>,
  "fluencyScore": <0-100>,
  "technicalScore": <0-100>,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific area 1", "specific area 2", "specific area 3"],
  "suggestions": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "questionFeedback": [{"question":"Q text","score":<0-100>,"feedback":"1-2 sentence feedback"}],
  "summary": "2-3 honest sentences about overall performance and main takeaway"
}`;

  const text = await callGemini(prompt);
  const clean = text.replace(/```json|```/g, '').trim();
  const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
  return JSON.parse(clean.slice(s, e + 1));
}

// ── Fallback question bank ─────────────────────────────────────────────────
export function getFallbackQuestions(role, count = 5) {
  const banks = {
    'Software Engineer': [
      'Tell me about yourself and your programming background.',
      'Describe a project you are most proud of. What was your role and what challenges did you face?',
      'How do you approach debugging a problem you have never seen before?',
      'Explain the difference between an array and a linked list. When would you use each?',
      'Tell me about a time you had a disagreement with a teammate. How did you handle it?',
      'What is the difference between SQL and NoSQL databases? Can you give an example use case for each?',
      'How do you prioritize tasks when you have multiple deadlines at once?',
    ],
    'Product Manager': [
      'Tell me about a product you admire and why.',
      'How would you prioritize features when resources are limited?',
      'Describe a time you made a decision with limited data.',
      'How do you gather feedback from users and turn it into actionable requirements?',
      'Walk me through how you would launch a new feature end-to-end.',
      'How do you handle conflict between engineering and business stakeholders?',
      'What metrics would you use to measure the success of a new feature?',
    ],
    'Data Scientist': [
      'Walk me through a data science project you have worked on end-to-end.',
      'What is the difference between supervised and unsupervised learning?',
      'How do you handle missing data in a dataset?',
      'Explain overfitting and how you would prevent it.',
      'How would you explain the results of a machine learning model to a non-technical stakeholder?',
      'What is cross-validation and why is it useful?',
      'Describe a time when your model did not perform as expected. What did you do?',
    ],
    'HR Manager': [
      'How do you handle a conflict between two employees on the same team?',
      'Describe your approach to recruiting and hiring top talent.',
      'How do you measure employee engagement and satisfaction?',
      'Tell me about a difficult conversation you had with an employee.',
      'How do you ensure fair and unbiased hiring decisions?',
      'What strategies do you use for employee retention?',
      'How do you stay up-to-date with employment laws and HR best practices?',
    ],
    'Marketing Manager': [
      'Describe a marketing campaign you led. What was the result?',
      'How do you define and measure success for a marketing campaign?',
      'How do you approach creating a content strategy from scratch?',
      'Tell me about a campaign that did not go as planned. What did you learn?',
      'How do you balance data-driven decisions with creative thinking?',
      'How do you approach brand building for a new product?',
      'How do you prioritize marketing channels with a limited budget?',
    ],
  };

  const generic = [
    'Tell me about yourself.',
    'What are your greatest strengths?',
    'Describe a challenge you overcame at work.',
    'Where do you see yourself in 3 years?',
    'Why are you interested in this role?',
    'Tell me about a time you demonstrated leadership.',
    'How do you handle stress and tight deadlines?',
  ];

  return (banks[role] || generic).slice(0, count);
}
