export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const transcript = String(req.body?.transcript || '').slice(0, 1200)
  const dialect = String(req.body?.dialect || '普通话')

  if (!transcript.trim()) {
    res.status(400).json({ error: 'Missing transcript' })
    return
  }

  res.status(200).json(normalizeTranscript(transcript, dialect))
}

function normalizeTranscript(transcript, dialect) {
  const normalizedText = transcript
    .replace(/介个/g, '这个')
    .replace(/嘛呀/g, '')
    .replace(/嘛/g, '')
    .replace(/老有/g, '经常有')
    .replace(/真要有急事儿/g, '如遇紧急情况')
    .replace(/说说吧/g, '协调处理')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    dialect,
    transcript,
    normalizedText: normalizedText || transcript,
    confidence: dialect === '天津话' ? 0.82 : 0.88,
    provider: 'Vercel Serverless / api/transcribe',
    notes: [
      '当前接口演示方言文本规范化',
      '试点阶段可替换为腾讯云、阿里云或科大讯飞 ASR',
      'ASR 输出继续进入 analyze 工单分析接口',
    ],
  }
}
