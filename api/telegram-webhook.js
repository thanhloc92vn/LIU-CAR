// Webhook nhận tin từ Telegram. Token, Chat ID và mã bí mật chỉ nằm trong biến môi trường của Vercel.
//   TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID, TELEGRAM_WEBHOOK_SECRET
// Bản này chỉ trả lời lệnh cơ bản để kiểm tra kết nối; chưa đọc hay ghi dữ liệu chuyến.

const API = 'https://api.telegram.org';

async function sendMessage(token, chatId, text, replyTo) {
  await fetch(`${API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_to_message_id: replyTo,
      allow_sending_without_reply: true,
    }),
  });
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
      await sendMessage(
        token,
        chatId,
        `Bot đang hoạt động.\nNhóm: ${isDispatchGroup ? 'điều hành (đã cấu hình)' : 'chat riêng'}\nChat ID: ${chatId}`,
        msg.message_id
      );
    } else if (command === '/start') {
      await sendMessage(
        token,
        chatId,
        'Xin chào, đây là bot điều phối xe. Việc liên kết tài khoản tài xế sẽ có ở bản cập nhật tiếp theo.',
        msg.message_id
      );
    } else if (command === '/help') {
      await sendMessage(token, chatId, 'Lệnh hiện có:\n/ping - kiểm tra bot\n/help - hướng dẫn', msg.message_id);
    }
  } catch {
    // Luôn trả 200 để Telegram không gửi lại liên tục
  }
  return res.status(200).json({ ok: true });
}
