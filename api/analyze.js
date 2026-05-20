const fallback = {
  category: '综合诉求',
  urgency: '中',
  emotion: '关注',
  department: '社区综合服务窗口',
  summary: '居民提交了一条需要网格员进一步核实的信息，建议补充地点、对象与期望结果后转派处理。',
  nextSteps: ['补充诉求地点与联系方式', '确认责任主体与处理时限', '转派对应网格员跟进并回访'],
  confidence: 0.78,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const text = String(req.body?.text || '').slice(0, 2000)
  if (!text.trim()) {
    res.status(400).json({ error: 'Missing text' })
    return
  }

  try {
    const aiResult = await callDashScope(text)
    res.status(200).json(aiResult)
  } catch {
    res.status(200).json(localAnalysis(text))
  }
}

async function callDashScope(text) {
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
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '你是社区网格员工单预处理助手。只输出 JSON，不要 Markdown。字段：category, urgency(高/中/低), emotion, department, summary, nextSteps(数组3项), confidence(0-1数字)。',
        },
        { role: 'user', content: text },
      ],
    }),
  })

  if (!response.ok) throw new Error('Model request failed')
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  return normalize(JSON.parse(stripJson(content)))
}

function stripJson(content) {
  return content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
}

function normalize(result) {
  return {
    category: String(result.category || fallback.category),
    urgency: ['高', '中', '低'].includes(result.urgency) ? result.urgency : fallback.urgency,
    emotion: String(result.emotion || fallback.emotion),
    department: String(result.department || fallback.department),
    summary: String(result.summary || fallback.summary),
    nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps.slice(0, 3).map(String) : fallback.nextSteps,
    confidence: Number.isFinite(Number(result.confidence)) ? Math.min(1, Math.max(0, Number(result.confidence))) : 0.8,
  }
}

function localAnalysis(text) {
  const isFire = /消防|通道|电动车|充电|火/.test(text)
  const isClean = /垃圾|异味|卫生|积水|蚊虫/.test(text)
  const isRepair = /维修|坏|漏水|电梯|路灯|门禁/.test(text)
  const isConflict = /吵|噪音|纠纷|楼上|装修|争执/.test(text)
  const angry = /生气|投诉|没人管|受不了|严重|一直/.test(text)

  if (isFire) {
    return {
      category: '消防安全',
      urgency: '高',
      emotion: angry ? '焦虑 / 愤怒' : '担忧',
      department: '物业服务中心 + 社区安全专员',
      summary: '居民反映存在消防通道或用电安全隐患，需要优先核实现场情况并及时处置。',
      nextSteps: ['生成巡查任务并记录楼栋位置', '通知物业现场核查并保留照片', '必要时联动消防或综合执法部门'],
      confidence: 0.88,
    }
  }

  if (isClean) {
    return {
      category: '环境卫生',
      urgency: '中',
      emotion: angry ? '不满' : '关注',
      department: '物业保洁组',
      summary: '居民反馈公共区域卫生问题，影响日常通行和居住体验，建议安排保洁处理并回访。',
      nextSteps: ['派发保洁处理任务', '要求上传处理前后照片', '24 小时内回访居民确认结果'],
      confidence: 0.86,
    }
  }

  if (isRepair) {
    return {
      category: '设施维修',
      urgency: '中',
      emotion: '焦虑',
      department: '物业工程维修组',
      summary: '居民反馈公共设施异常，需判断是否影响安全或基本生活，并安排维修人员处理。',
      nextSteps: ['记录设施位置与故障描述', '转派物业工程人员', '跟踪维修时限并同步居民'],
      confidence: 0.84,
    }
  }

  if (isConflict) {
    return {
      category: '邻里纠纷',
      urgency: '中',
      emotion: angry ? '愤怒' : '困扰',
      department: '社区调解员',
      summary: '居民反映邻里噪音或装修扰民问题，建议先核实时间与频次，再进行沟通调解。',
      nextSteps: ['记录发生时间与持续天数', '联系双方了解情况', '必要时引入物业或社区调解机制'],
      confidence: 0.85,
    }
  }

  return fallback
}
