const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const Anthropic = require('@anthropic-ai/sdk');

let _client = null;

function getClient() {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set in .env');
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `You are a focused personal accountability coach built into a productivity app.
Your job is to help the user stay on track, prioritize clearly, and reflect honestly.
Be direct, warm, and brief — no fluff. Bullet points over paragraphs. No emoji.`;

// ── Prompt templates ──────────────────────────────────────────────────────────

function kickoffPrompt(tasks) {
  const list = tasks.map((t, i) => `${i + 1}. [${t.priority}] ${t.title}`).join('\n');
  return `It's the start of my day. Here are my pending tasks:\n\n${list}\n\nGive me:\n1. A suggested order to tackle these (reorder if needed, explain briefly why)\n2. Any tasks I should defer or break down\n3. One thing to watch out for today`;
}

function reviewPrompt({ tasks, sessions }) {
  const done = tasks.filter(t => t.done).map(t => `- ${t.title}`).join('\n') || 'none';
  const pending = tasks.filter(t => !t.done).map(t => `- [${t.priority}] ${t.title}`).join('\n') || 'none';
  const focused = sessions.filter(s => !s.interrupted).length;
  const distracted = sessions.filter(s => s.interrupted).length;

  return `Here's my day:\n\nCompleted:\n${done}\n\nStill pending:\n${pending}\n\nPomodoros: ${sessions.length} total (${focused} focused, ${distracted} distracted)\n\nGive me:\n1. A quick honest assessment of today\n2. What to carry forward tomorrow (top 3 only)\n3. One thing to do differently tomorrow`;
}

function driftPrompt({ currentTask, question }) {
  return `I'm supposed to be working on: "${currentTask}"\n\nI'm about to ask: "${question}"\n\nIs this related to my current task? Reply with one of:\n- ON TRACK: [one sentence why]\n- DRIFTING: [one sentence why, and what I should do instead]`;
}

function summarizePrompt(content) {
  return `Summarize the following note in 1-3 concise bullet points. Extract the key facts, decisions, or action items. Be brief.\n\nNote:\n${content}`;
}

function draftPrompt({ channel, context, tone }) {
  return `Draft a ${channel} message.\n\nContext: ${context}\nTone: ${tone || 'professional but direct'}\n\nGive me 2 short variants. Label them Option A and Option B.`;
}

// ── API call ──────────────────────────────────────────────────────────────────

async function ask(userPrompt, { model = 'claude-haiku-4-5-20251001', history = [] } = {}) {
  const client = getClient();
  const messages = [...history, { role: 'user', content: userPrompt }];
  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM,
    messages,
  });
  return msg.content[0].text;
}

module.exports = { ask, kickoffPrompt, reviewPrompt, driftPrompt, draftPrompt, summarizePrompt };
