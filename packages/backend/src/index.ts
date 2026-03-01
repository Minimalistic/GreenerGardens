import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

import { buildApp } from './app.js';

const start = async () => {
  try {
    const server = await buildApp();
    const port = parseInt(process.env.PORT ?? '3000', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`GardenVault API running on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
