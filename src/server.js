import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import inboxRoutes from './routes/inbox.js';
import aiRoutes from './routes/ai.js';
import channelRoutes from './routes/channels.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100 }));

app.use('/api/inbox', inboxRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/channels', channelRoutes);

app.get('/health', (_, res) => res.json({
  status: 'ok', version: '1.0.0',
  channels: ['email'], planned: ['linkedin','instagram','twitter']
}));

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`✈  Autopilot running on port ${PORT}`));
export default app;
