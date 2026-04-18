import { createApp } from '../server.js';

export default async (req, res) => {
  const app = await createApp();
  return app(req, res);
};
