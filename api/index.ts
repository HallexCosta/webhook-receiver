import { handle } from 'hono/vercel';
import { app } from './_app.js';

export const config = {
  runtime: 'edge',
};

export default handle(app);
