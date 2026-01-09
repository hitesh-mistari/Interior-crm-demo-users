// devServer.ts

// Only load .env when running locally (not inside Coolify / Docker)
if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}

import { app } from './index.js'; // use .js in runtime when using tsx/esm

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`🚀 Express API running on port ${port}`);
  console.log(`DB URL in use: ${process.env.DATABASE_URL ? 'FOUND' : 'MISSING'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});
