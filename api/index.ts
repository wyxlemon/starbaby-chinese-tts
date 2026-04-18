import { createApp } from '../server';

export default async (req, res) => {
  const app = await createApp();
  return app(req, res);
};
