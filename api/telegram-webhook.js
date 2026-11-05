// Webhook nhận tin từ Telegram. Token, Chat ID và mã bí mật chỉ nằm trong biến môi trường của Vercel:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID, TELEGRAM_WEBHOOK_SECRET, SUPABASE_SERVICE_KEY
import { getLinkByChat, getLinkByDriver, hasServiceKey, loadState, saveLink, sendMessage } from './_shared.js';

// Chống dò mã liên kết: mỗi tài khoản Telegram được thử sai tối đa 5 lần trong 10 phút (theo từng máy chủ đang chạy)
const failures = new Map();
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function tooManyFails(chatId) {
  const entry = failures.get(chatId);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(chatId);
    return false;
  }
  return entry.count >= MAX_FAILS;
}

function recordFail(chatId) {
  const entry = failures.get(chatId);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(chatId, { count: 1, first: Date.now() });
  else entry.count += 1;
}

async function handleLink(token, msg, chatId) {
  const reply = (text) => sendMessage(token, chatId, text, msg.message_id);

  if (msg.chat.type !== 'private') {
    return reply('Để liên kết tài khoản tài xế, hãy nhắn riêng cho bot (không nhắn trong nhóm).');
  }
  if (tooManyFails(chatId)) {
    return reply('Bạn nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút hoặc liên hệ điều hành.');
  }

  const code = msg.text.split(/\s+/).slice(1).find((t) => /^\d{6}$/.test(t));
  if (!code) {
    return reply(
      'Để liên kết, hãy gửi lệnh kèm mã 6 số do điều hành cấp, ví dụ:\n/start 123456\n\nMã nằm trong hồ sơ tài xế của bạn trên ứng dụng Thuê xe nhà (điều hành tạo giúp).'
    );
  }
  if (!hasServiceKey()) {
    return reply('Bot chưa được cấp quyền lưu liên kết. Vui lòng báo điều hành.');
  }

  const state = await loadState();
  const driver = state?.drivers?.find((d) => d.telegramLinkCode === code);
  if (!driver) {
    recordFail(chatId);
    return reply('Mã không đúng hoặc đã được thay mới. Vui lòng kiểm tra lại với điều hành.');
  }

  const existing = await getLinkByDriver(driver.id);
  if (existing && existing.code_used === code) {
    return reply(
      String(existing.chat_id) === chatId
        ? `Tài khoản của bạn đã được liên kết với ${driver.fullName} rồi.`
        : 'Mã này đã được dùng. Liên hệ điều hành để cấp mã mới.'
    );
  }

  const ok = await saveLink({
    driverId: driver.id,
    chatId: Number(chatId),
    code,
    username: msg.from?.username,
  });
  if (!ok) return reply('Chưa lưu được liên kết, vui lòng thử lại sau.');

  return reply(
    `Đã liên kết thành công với ${driver.fullName} (${driver.code}).\nTừ giờ bạn sẽ nhận lịch chạy và nhắc việc qua bot này.`
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const dispatchChatId = String(process.env.TELEGRAM_DISPATCH_CHAT_ID || '');

  // Chỉ nhận yêu cầu đến từ Telegram: Telegram gửi kèm mã bí mật đã đăng ký ở setWebhook
  if (!token || !secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const msg = (req.body || {}).message;
    if (!msg || typeof msg.text !== 'string') return res.status(200).json({ ok: true });

    const chatId = String(msg.chat.id);
    const isDispatchGroup = chatId === dispatchChatId;
    const isPrivate = msg.chat.type === 'private';
    // Bỏ qua mọi nhóm lạ
    if (!isDispatchGroup && !isPrivate) return res.status(200).json({ ok: true });

    // "/lenh@ten_bot tham_so" -> "lenh"
    const command = msg.text.startsWith('/') ? msg.text.split(/[\s@]/)[0].toLowerCase() : '';

    if (command === '/ping') {
      const links = isPrivate ? await getLinkByChat(chatId) : [];
      const who = isDispatchGroup
        ? 'nhóm điều hành (đã cấu hình)'
        : links.length
        ? 'chat riêng (đã liên kết tài xế)'
        : 'chat riêng (chưa liên kết)';
      await sendMessage(token, chatId, `Bot đang hoạt động.\nNhóm: ${who}\nChat ID: ${chatId}`, msg.message_id);
    } else if (command === '/start') {
      await handleLink(token, msg, chatId);
    } else if (command === '/help') {
      await sendMessage(
        token,
        chatId,
        'Lệnh hiện có:\n/start <mã 6 số> - liên kết tài khoản tài xế (nhắn riêng cho bot)\n/ping - kiểm tra bot\n/help - hướng dẫn',
        msg.message_id
      );
    }
  } catch {
    // Luôn trả 200 để Telegram không gửi lại liên tục
  }
  return res.status(200).json({ ok: true });
}
