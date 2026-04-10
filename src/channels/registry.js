import { EmailChannel } from './email.js';

const CHANNEL_MAP = {
  email: EmailChannel,
  // linkedin: LinkedInChannel,
  // instagram: InstagramChannel,
  // twitter: TwitterChannel,
};

export function createChannel(type, config) {
  const Adapter = CHANNEL_MAP[type];
  if (!Adapter) throw new Error(`Unknown channel "${type}". Available: ${Object.keys(CHANNEL_MAP).join(', ')}`);
  return new Adapter(config);
}

export function listChannels() {
  return { active: Object.keys(CHANNEL_MAP), planned: ['linkedin','instagram','twitter','slack'] };
}
