import { Router } from 'express';
import { listChannels } from '../channels/registry.js';

const router = Router();

router.get('/', (req, res) => res.json(listChannels()));

export default router;
