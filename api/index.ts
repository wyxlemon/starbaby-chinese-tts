import { createApp } from '../server.js';

let appPromise = null;

export default async (req, res) => {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
};
