import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'fleet_database.json');

function fleetBackendPlugin() {
  return {
    name: 'smartfleet-backend-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // GET /api/db - Load persistent database
        if (req.url === '/api/db' && req.method === 'GET') {
          try {
            if (fs.existsSync(DB_FILE)) {
              const raw = fs.readFileSync(DB_FILE, 'utf-8');
              res.statusCode = 200;
              res.end(raw);
              return;
            }
            res.statusCode = 404;
            res.end(JSON.stringify({ initialized: false }));
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || 'Read error' }));
            return;
          }
        }

        // POST /api/db - Save persistent database
        if (req.url === '/api/db' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err?.message || 'Invalid JSON' }));
            }
          });
          return;
        }

        // POST /api/telegram-notify - Optional live Telegram Bot webhook sender
        if (req.url === '/api/telegram-notify' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { botToken, chatId, text } = JSON.parse(body);
              if (!botToken || !chatId) {
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    ok: true,
                    simulated: true,
                    message: 'Đã gửi qua bộ giả lập AI Bot (Chưa cấu hình Token Telegram thực)',
                  })
                );
                return;
              }
              const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text,
                  parse_mode: 'HTML',
                }),
              });
              const tgData = await tgRes.json();
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: tgRes.ok, simulated: false, telegramResponse: tgData }));
            } catch (err: any) {
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  ok: true,
                  simulated: true,
                  error: err?.message,
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fleetBackendPlugin()],
  server: {
    port: 3000,
    host: true,
  },
});
