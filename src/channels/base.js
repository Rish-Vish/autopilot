export class BaseChannel {
  constructor(config) {
    if (new.target === BaseChannel) throw new Error('BaseChannel is abstract');
    this.config = config;
    this.name = 'base';
  }
  async testConnection() { throw new Error('not implemented'); }
  async fetchRecent() { throw new Error('not implemented'); }
  async sendReply() { throw new Error('not implemented'); }
  async archiveMessage() { throw new Error('not implemented'); }
  normalise() { throw new Error('not implemented'); }
}
