import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

connectDB()
  .then(() => app.listen(env.port, () => console.log(`Setu API ready on http://localhost:${env.port}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    console.error('Start MongoDB (docker compose up -d) or set MONGODB_URI in server/.env');
    process.exit(1);
  });
