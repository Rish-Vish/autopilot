import { Router } from 'express';
import { triageMessage, draftReply, processBatch } from '../ai/engine.js';

const router = Router();

router.post('/triage', async (req, res, next) => {
  try {
    const { message, context = {} } = req.body;
    if (!message?.body) return res.status(400).json({ error: 'message.body is required' });
    const result = await triageMessage(message, context);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/draft', async (req, res, next) => {
  try {
    const { message, context = {}, instruction = '' } = req.body;
    if (!message?.body) return res.status(400).json({ error: 'message.body is required' });
    const draft = await draftReply(message, context, instruction);
    res.json({ draft });
  } catch (err) { next(err); }
});

router.post('/batch', async (req, res, next) => {
  try {
    const { messages, context = {}, options = {} } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: 'messages array is required' });
    if (messages.length > 50) return res.status(400).json({ error: 'Max 50 messages per batch' });
    const results = await processBatch(messages, context, options);
    res.json({ processed: results.length, results });
  } catch (err) { next(err); }
});

export default router;
