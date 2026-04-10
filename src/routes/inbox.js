import { Router } from 'express';
import { createChannel } from '../channels/registry.js';
import { triageMessage, draftReply, processBatch } from '../ai/engine.js';

const router = Router();

function sanitize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ));
}

router.post('/connect', async (req, res, next) => {
  try {
    const { type = 'email', config } = req.body;
    if (!config) return res.status(400).json({ error: 'config is required' });
    const channel = createChannel(type, config);
    const result = await channel.testConnection();
    res.json(sanitize({ channel: type, ...result }));
  } catch (err) { next(err); }
});

router.post('/fetch', async (req, res, next) => {
  try {
    const { type = 'email', config, limit = 20, folder = 'INBOX' } = req.body;
    if (!config) return res.status(400).json({ error: 'config is required' });
    const channel = createChannel(type, config);
    const messages = await channel.fetchRecent({ limit, folder });
    res.json(sanitize({ channel: type, count: messages.length, messages }));
  } catch (err) { next(err); }
});

router.post('/triage', async (req, res, next) => {
  try {
    const { message, context = {} } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const result = await triageMessage(message, context);
    res.json(sanitize({ messageId: message.id, ...result }));
  } catch (err) { next(err); }
});

router.post('/draft', async (req, res, next) => {
  try {
    const { message, context = {}, instruction = '' } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const draft = await draftReply(message, context, instruction);
    res.json(sanitize({ messageId: message.id, draft }));
  } catch (err) { next(err); }
});

router.post('/process', async (req, res, next) => {
  try {
    const { type = 'email', config, context = {}, limit = 20 } = req.body;
    if (!config) return res.status(400).json({ error: 'config is required' });
    const channel = createChannel(type, config);
    const messages = await channel.fetchRecent({ limit });
    const results = await processBatch(messages, context);
    res.json(sanitize({ channel: type, processed: results.length, results }));
  } catch (err) { next(err); }
});

router.post('/reply', async (req, res, next) => {
  try {
    const { type = 'email', config, messageId, body, replyMeta = {} } = req.body;
    if (!config || !messageId || !body) return res.status(400).json({ error: 'config, messageId and body are required' });
    const channel = createChannel(type, config);
    const result = await channel.sendReply(messageId, body, replyMeta);
    res.json(sanitize({ channel: type, ...result }));
  } catch (err) { next(err); }
});

router.post('/archive', async (req, res, next) => {
  try {
    const { type = 'email', config, messageId } = req.body;
    if (!config || !messageId) return res.status(400).json({ error: 'config and messageId are required' });
    const channel = createChannel(type, config);
    const result = await channel.archiveMessage(messageId);
    res.json(sanitize({ channel: type, messageId, ...result }));
  } catch (err) { next(err); }
});

export default router;
