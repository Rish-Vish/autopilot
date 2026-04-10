import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function triageMessage(message, context = {}) {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 400,
    system: buildSystem(context),
    messages: [{ role: 'user', content: `Analyse this message and return ONLY valid JSON:
{
  "score": <0-100>,
  "action": <"reply"|"archive"|"followup"|"urgent"|"read">,
  "summary": <one sentence max 20 words>,
  "reasoning": <one sentence>,
  "sentiment": <"positive"|"neutral"|"negative">,
  "isAutomated": <true if bot/newsletter>
}

Channel: ${message.channel}
From: ${message.from} <${message.fromAddress}>
Subject: ${message.subject}
Body: ${message.body.slice(0,2000)}` }]
  });
  const text = res.content[0].text.trim();
  return JSON.parse(text.replace(/```json|```/g,'').trim());
}

export async function draftReply(message, context = {}, instruction = '') {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 600,
    system: buildSystem(context),
    messages: [{ role: 'user', content: `Draft a reply to this message as ${context.name || 'the recipient'}.
No subject line. No sign-off name. Professional but warm. Match the length of the incoming message.
${instruction ? `Instruction: ${instruction}` : ''}

From: ${message.from}
Subject: ${message.subject}
Body: ${message.body.slice(0,2000)}

Return ONLY the draft text.` }]
  });
  return res.content[0].text.trim();
}

export async function processBatch(messages, context = {}, { concurrency = 5, draftActions = ['reply','followup','urgent'] } = {}) {
  const results = [];
  for (let i = 0; i < messages.length; i += concurrency) {
    const chunk = messages.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map(async msg => {
      const triage = await triageMessage(msg, context);
      const draft = (!triage.isAutomated && draftActions.includes(triage.action))
        ? await draftReply(msg, context) : null;
      return { messageId: msg.id, channel: msg.channel, triage, draft };
    }));
    for (const r of settled) {
      results.push(r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'Failed' });
    }
  }
  return results;
}

function buildSystem(context) {
  return `You are Autopilot, an AI inbox manager.
${context.name ? `User: ${context.name}.` : ''}
${context.role ? `Role: ${context.role}.` : ''}
${context.company ? `Company: ${context.company}.` : ''}
Be concise and professional. Never invent information.`;
}
