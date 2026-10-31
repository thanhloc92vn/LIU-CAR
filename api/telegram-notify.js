export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { botToken, chatId, text } = req.body || {};
    if (!botToken || !chatId) {
      return res.status(200).json({
        ok: true,
        simulated: true,
        message: 'Đã gửi qua bộ giả lập AI Bot (Chưa cấu hình Token Telegram thực)',
      });
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
    return res.status(200).json({
      ok: tgRes.ok,
      simulated: false,
      telegramResponse: tgData,
    });
  } catch (err) {
    return res.status(200).json({
      ok: true,
      simulated: true,
      error: err?.message || 'Error',
    });
  }
}
