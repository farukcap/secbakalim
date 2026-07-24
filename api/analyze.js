export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Sadece POST isteği.' });

  const { type, content } = req.body || {};
  if (!type || !content) return res.status(400).json({ error: 'Veri eksik.' });

  const GEMINI_KEY = "AIzaSyCBsIjX0gqrK6DNx7tPi8c3_Gy0O03PrtU";

  let parts = [];

  // 1. FOTOĞRAF ANALİZİ İSTEMİ
  if (type === 'image') {
    parts = content.map(img => ({
      inline_data: { mime_type: 'image/jpeg', data: img.base64 }
    }));
    parts.push({
      text: "Sana yüklenen bu fotoğrafları ışık, kompozisyon ve estetik açıdan değerlendir. İnsanlara duymak istediklerini değil, gerçeği söyle. İçlerinden tartışmasız en iyi olanı seç ('Kazanan: [Resim Sırası]' şeklinde belirt) ve neden iyi olduğunu net açıkla. Kötü olanların neden berbat durduğunu çekinmeden, dürüst ve doğrudan bir dille ifade et."
    });
  } 
  // 2. SOHBET ANALİZİ İSTEMİ (YENİ)
  else if (type === 'text') {
    parts.push({
      text: `Sen bir insan psikolojisi ve ilişki dinamikleri uzmanısın. İnsanların kendilerine bile itiraf edemediği gerçekleri yüzlerine vurursun. Aşağıdaki yazışma geçmişini oku. Kimin kime asıl ilgisi var? Kim diğerini oyalıyor veya manipüle ediyor? Kim kime üstünlük kurmaya çalışıyor? Kibar olmaya çalışma; bilimsel gerçekliğe ve insan doğasına dayanarak durumun analizini yap. Kimin ne hissettiğini acımasızca dürüst bir şekilde özetle.\n\nİşte Sohbet:\n${content}`
    });
  }

  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    const geminiData = await geminiRes.json();

    if (geminiData.error) {
      return res.status(500).json({ error: 'Google AI Hatası: ' + geminiData.error.message });
    }

    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) return res.status(500).json({ error: 'Yapay zeka analiz yapamadı.' });

    return res.status(200).json({ analysis: aiText });

  } catch (error) {
    return res.status(500).json({ error: 'Sunucu Hatası: ' + error.message });
  }
}
