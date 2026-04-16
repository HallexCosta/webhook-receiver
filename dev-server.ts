import { serve } from '@hono/node-server';
import { app } from './api/_app.js';

serve({ fetch: app.fetch, port: 1010 }, (info) => {
  console.log(`API running at http://localhost:${info.port}`);
});
