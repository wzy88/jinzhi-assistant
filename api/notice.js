export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const prompt = String(req.body?.prompt || '').slice(0, 500)
  const category = String(req.body?.analysis?.category || '社区治理')

  if (!prompt.trim()) {
    res.status(400).json({ error: 'Missing prompt' })
    return
  }

  try {
    const aiResult = await callDashScope(prompt, category)
    res.status(200).json(aiResult)
  } catch {
    res.status(200).json(localNotice(prompt, category))
  }
}

async function callDashScope(prompt, category) {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('Missing DASHSCOPE_API_KEY')

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.DASHSCOPE_MODEL || 'qwen-plus',
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            '你是社区通知文案助手。只输出 JSON，不要 Markdown。字段：formal, friendly, sms。formal正式简洁，friendly适合居民微信群，sms不超过70字。',
        },
        { role: 'user', content: `主题：${prompt}\n相关类别：${category}` },
      ],
    }),
  })

  if (!response.ok) throw new Error('Model request failed')
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim())
  return {
    formal: String(parsed.formal || ''),
    friendly: String(parsed.friendly || ''),
    sms: String(parsed.sms || ''),
  }
}

function localNotice(prompt, category) {
  return {
    formal: `各位居民：关于“${prompt}”，社区将结合近期${category}类诉求开展专项提醒与现场巡查。请大家主动配合社区及物业工作，共同维护安全、有序、整洁的居住环境。`,
    friendly: `邻居们大家好，最近社区在关注“${prompt}”。如果大家发现类似问题，可以及时联系网格员，我们会尽快协调处理，也请大家互相提醒、一起配合。`,
    sms: `社区提醒：${prompt}。如遇相关问题请联系网格员或物业，感谢理解与配合。`,
  }
}
