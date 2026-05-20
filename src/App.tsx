import { type ChangeEvent, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  GitBranch,
  KeyRound,
  ListChecks,
  LogIn,
  LogOut,
  Loader2,
  Megaphone,
  Mic,
  RefreshCcw,
  Save,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  XCircle,
} from 'lucide-react'
import './App.css'

type AnalysisResult = {
  category: string
  urgency: '高' | '中' | '低'
  emotion: string
  department: string
  summary: string
  nextSteps: string[]
  confidence: number
}

type NoticeResult = {
  formal: string
  friendly: string
  sms: string
}

type IntakeResult = {
  dialect: string
  transcript: string
  normalizedText: string
  confidence: number
  provider: string
  notes: string[]
}

type ReviewState = '待复核' | '正确' | '需调整'
type TicketStatus = '待转派' | '已转派' | '已回访'
type DialectMode = '普通话' | '天津话' | '混合口音'

type TicketRecord = {
  id: string
  text: string
  analysis: AnalysisResult
  review: ReviewState
  status: TicketStatus
  createdAt: string
}

type UserProfile = {
  name: string
  phone: string
  organization: string
  role: string
  serviceArea: string
  verified: boolean
}

type UserSettings = {
  modelMode: 'demo' | 'cloud'
  saveLocalRecords: boolean
  maskSensitiveInfo: boolean
  showDemoData: boolean
}

type ViewKey = 'workspace' | 'records' | 'notice' | 'dashboard' | 'account' | 'opc'

const views: Array<{
  key: ViewKey
  label: string
  title: string
  description: string
}> = [
  {
    key: 'workspace',
    label: '工作台',
    title: '居民诉求预处理',
    description: '集中完成诉求录入、AI 分析、人工复核和入库，适合网格员的日常主流程。',
  },
  {
    key: 'records',
    label: '处理记录',
    title: '试点工单沉淀',
    description: '查看最近处理记录，更新转派和回访状态，把演示过程变成可复核数据。',
  },
  {
    key: 'notice',
    label: '通知生成',
    title: '多渠道居民通知',
    description: '根据当前工单类别生成正式版、居民群版和短信版，减少重复写作。',
  },
  {
    key: 'dashboard',
    label: '数据看板',
    title: '高频问题与周报',
    description: '给社区负责人查看高频问题、复核准确率和周报草稿。',
  },
  {
    key: 'account',
    label: '账号设置',
    title: '演示账号与体验偏好',
    description: '维护演示身份、机构资料和模型/数据偏好，后续可升级为真实账号。',
  },
  {
    key: 'opc',
    label: 'OPC证据',
    title: '从 Demo 到试点交付',
    description: '集中展示比赛证据链、数据边界和下一步真实试点材料。',
  },
]

const sampleTickets = [
  '12号楼2单元门口消防通道长期被私家车占用，晚上救护车都进不来，物业说了几次也没人管。',
  '小区东门旁边垃圾桶满了两天没人清理，天气热味道很大，老人孩子路过都受不了。',
  '楼上夜里十一点以后还在装修，已经连续三天了，希望社区帮忙协调一下。',
]

const defaultAnalysis: AnalysisResult = {
  category: '消防安全',
  urgency: '高',
  emotion: '焦虑 / 愤怒',
  department: '物业服务中心 + 社区安全专员',
  summary: '居民反映消防通道被占用，存在紧急通行与安全隐患，需要尽快核实并协调清障。',
  nextSteps: [
    '记录位置、楼栋、时间并生成巡查任务',
    '通知物业现场核查车辆与通道状态',
    '必要时联动消防或综合执法部门',
  ],
  confidence: 0.87,
}

const defaultNotice: NoticeResult = {
  formal:
    '各位居民：为保障小区公共安全，请勿占用消防通道、楼道出入口及应急通行区域。社区将联合物业开展巡查整治，请相关车主及时挪车，感谢理解与配合。',
  friendly:
    '邻居们大家好，消防通道是生命通道，请大家不要停车占用。社区和物业会加强巡查，也请互相提醒一下，给应急救援留出通路。',
  sms: '温馨提示：请勿占用消防通道及楼道出入口，社区将联合物业巡查整治，感谢配合。',
}

const defaultVoiceDraft = '介个消防通道老有车停着，晚上真要有急事儿车都进不来，帮忙跟物业说说吧。'

const initialRecords: TicketRecord[] = sampleTickets.map((text, index) => ({
  id: `demo-${index + 1}`,
  text,
  analysis: buildLocalAnalysis(text),
  review: index === 0 ? '正确' : '待复核',
  status: index === 0 ? '已转派' : '待转派',
  createdAt: `05-20 ${String(9 + index).padStart(2, '0')}:30`,
}))

const defaultProfile: UserProfile = {
  name: '王明',
  phone: '13800000000',
  organization: '生态城某社区',
  role: '网格员',
  serviceArea: '12号楼、13号楼及东门片区',
  verified: true,
}

const defaultSettings: UserSettings = {
  modelMode: 'demo',
  saveLocalRecords: false,
  maskSensitiveInfo: true,
  showDemoData: true,
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeView, setActiveView] = useState<ViewKey>('workspace')
  const [isSignedIn, setIsSignedIn] = useState(() => readJson('jinzhi-auth', true))
  const [profile, setProfile] = useState<UserProfile>(() => readJson('jinzhi-profile', defaultProfile))
  const [settings, setSettings] = useState<UserSettings>(() => readJson('jinzhi-settings', defaultSettings))
  const [authPhone, setAuthPhone] = useState(profile.phone)
  const [authPassword, setAuthPassword] = useState('demo123')
  const [profileSaved, setProfileSaved] = useState(false)
  const [ticket, setTicket] = useState(sampleTickets[0])
  const [dialectMode, setDialectMode] = useState<DialectMode>('天津话')
  const [voiceDraft, setVoiceDraft] = useState(defaultVoiceDraft)
  const [intakeResult, setIntakeResult] = useState<IntakeResult | null>(null)
  const [noticePrompt, setNoticePrompt] = useState('周末小区消防通道专项清理提醒')
  const [analysis, setAnalysis] = useState<AnalysisResult>(defaultAnalysis)
  const [notice, setNotice] = useState<NoticeResult>(defaultNotice)
  const [records, setRecords] = useState<TicketRecord[]>(initialRecords)
  const [currentRecordId, setCurrentRecordId] = useState(initialRecords[0].id)
  const [reportText, setReportText] = useState(buildWeeklyReport(initialRecords))
  const [copiedKey, setCopiedKey] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const confidencePercent = useMemo(
    () => Math.round(analysis.confidence * 100),
    [analysis.confidence],
  )

  const dashboard = useMemo(() => {
    const total = records.length
    const reviewed = records.filter((record) => record.review !== '待复核').length
    const correct = records.filter((record) => record.review === '正确').length
    const urgent = records.filter((record) => record.analysis.urgency === '高').length
    const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0
    const topCategory = getTopCategories(records)[0]?.name || '暂无'

    return {
      metrics: [
        { label: '本次工单', value: String(total), hint: '含导入与演示样例' },
        { label: '高优先级', value: String(urgent), hint: '需优先核实处理' },
        { label: '复核准确率', value: reviewed ? `${accuracy}%` : '待复核', hint: '基于人工复核记录' },
        { label: '高频问题', value: topCategory, hint: '本次会话 TOP1' },
      ],
      topCategories: getTopCategories(records),
      reviewed,
      accuracy,
    }
  }, [records])

  const currentView = views.find((view) => view.key === activeView) || views[0]
  const currentRecord = records.find((record) => record.id === currentRecordId)

  async function analyzeTicket() {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ticket }),
      })
      if (!response.ok) throw new Error('API unavailable')
      const data = (await response.json()) as AnalysisResult
      commitAnalysis(ticket, data)
    } catch {
      commitAnalysis(ticket, buildLocalAnalysis(ticket))
    } finally {
      setIsAnalyzing(false)
    }
  }

  function commitAnalysis(text: string, result: AnalysisResult) {
    const record = createRecord(text, result)
    setAnalysis(result)
    setRecords((current) => [record, ...current])
    setCurrentRecordId(record.id)
  }

  async function transcribeVoiceDraft() {
    setIsTranscribing(true)
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceDraft, dialect: dialectMode }),
      })
      if (!response.ok) throw new Error('API unavailable')
      const data = (await response.json()) as IntakeResult
      setIntakeResult(data)
      setTicket(data.normalizedText)
    } catch {
      const fallback = buildLocalIntake(voiceDraft, dialectMode)
      setIntakeResult(fallback)
      setTicket(fallback.normalizedText)
    } finally {
      setIsTranscribing(false)
    }
  }

  async function generateNotice() {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: noticePrompt, analysis }),
      })
      if (!response.ok) throw new Error('API unavailable')
      const data = (await response.json()) as NoticeResult
      setNotice(data)
    } catch {
      setNotice(buildLocalNotice(noticePrompt, analysis))
    } finally {
      setIsGenerating(false)
    }
  }

  function updateReview(recordId: string, review: ReviewState) {
    setRecords((current) =>
      current.map((record) => (record.id === recordId ? { ...record, review } : record)),
    )
  }

  function updateStatus(recordId: string, status: TicketStatus) {
    setRecords((current) =>
      current.map((record) => (record.id === recordId ? { ...record, status } : record)),
    )
  }

  function reviewCurrent(review: ReviewState) {
    updateReview(currentRecordId, review)
  }

  function selectRecord(record: TicketRecord) {
    setTicket(record.text)
    setAnalysis(record.analysis)
    setCurrentRecordId(record.id)
  }

  function loadRecord(record: TicketRecord) {
    selectRecord(record)
    setActiveView('workspace')
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(''), 1600)
    } catch {
      setCopiedKey('copy-failed')
      window.setTimeout(() => setCopiedKey(''), 1600)
    }
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const imported = parseImportedTickets(String(reader.result || ''))
      const newRecords = imported.map((text) => createRecord(text, buildLocalAnalysis(text)))
      if (newRecords.length > 0) {
        setRecords((current) => [...newRecords, ...current])
        setTicket(newRecords[0].text)
        setAnalysis(newRecords[0].analysis)
        setCurrentRecordId(newRecords[0].id)
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function refreshReport() {
    setReportText(buildWeeklyReport(records))
  }

  function loginDemo() {
    const nextProfile = { ...profile, phone: authPhone || profile.phone }
    setProfile(nextProfile)
    setIsSignedIn(true)
    persistJson('jinzhi-auth', true)
    persistJson('jinzhi-profile', nextProfile)
  }

  function logout() {
    setIsSignedIn(false)
    persistJson('jinzhi-auth', false)
  }

  function saveProfile() {
    persistJson('jinzhi-profile', profile)
    setProfileSaved(true)
    window.setTimeout(() => setProfileSaved(false), 1600)
  }

  function updateSetting<Key extends keyof UserSettings>(key: Key, value: UserSettings[Key]) {
    const nextSettings = { ...settings, [key]: value }
    setSettings(nextSettings)
    persistJson('jinzhi-settings', nextSettings)
  }

  function updateNoticeDraft<Key extends keyof NoticeResult>(key: Key, value: NoticeResult[Key]) {
    setNotice((current) => ({ ...current, [key]: value }))
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="产品导航">
        <button className="brand brand-button" type="button" onClick={() => setActiveView('workspace')} aria-label="返回工作台">
          <span className="brand-mark" aria-hidden="true">
            津
          </span>
          <span>
            <strong>津智助理</strong>
            <small>社区网格 AI 工作台</small>
          </span>
        </button>
        <nav className="nav-links" aria-label="功能视图">
          {views.map((view) => (
            <button
              className={`tab-button ${activeView === view.key ? 'active' : ''}`}
              type="button"
              key={view.key}
              onClick={() => setActiveView(view.key)}
              aria-current={activeView === view.key ? 'page' : undefined}
            >
              {view.label}
            </button>
          ))}
        </nav>
        <div className="account-chip" aria-label="当前账号">
          <span className="avatar" aria-hidden="true">
            {isSignedIn ? profile.name.slice(0, 1) : '访'}
          </span>
          <span>
            <strong>{isSignedIn ? profile.name : '访客体验'}</strong>
            <small>{isSignedIn ? profile.role : '未登录'}</small>
          </span>
          <button type="button" onClick={isSignedIn ? logout : loginDemo}>
            {isSignedIn ? <LogOut size={15} aria-hidden="true" /> : <LogIn size={15} aria-hidden="true" />}
            {isSignedIn ? '退出' : '登录'}
          </button>
        </div>
      </header>

      <section className="workspace-brief">
        <div>
          <p className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" />
            试点演示版 · 已上线可体验
          </p>
          <h1>{currentView.title}</h1>
          <p className="brief-text">{currentView.description}</p>
        </div>
        <div className="brief-actions">
          {activeView !== 'workspace' ? (
            <button className="primary-button" type="button" onClick={() => setActiveView('workspace')}>
              <Sparkles size={18} aria-hidden="true" />
              去处理工单
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={analyzeTicket} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
              {isAnalyzing ? '分析中' : '处理当前工单'}
            </button>
          )}
          <button className="secondary-link button-link" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} aria-hidden="true" />
            导入样例
          </button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept=".csv,.txt" onChange={handleImport} />
        </div>
      </section>

      {activeView === 'workspace' && (
        <>
          <section className="workbench-flow" aria-label="工单处理流程">
            <div className="flow-step active">
              <span>01</span>
              <strong>收集诉求</strong>
              <p>文本、导入或方言转写</p>
            </div>
            <div className="flow-step">
              <span>02</span>
              <strong>AI 判断</strong>
              <p>分类、摘要、责任部门</p>
            </div>
            <div className="flow-step">
              <span>03</span>
              <strong>人工复核</strong>
              <p>确认准确性和优先级</p>
            </div>
            <div className="flow-step">
              <span>04</span>
              <strong>转派回访</strong>
              <p>通知居民并沉淀记录</p>
            </div>
          </section>

          <section className="workspace-grid">
            <article className="panel input-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">
                    <ClipboardList size={16} aria-hidden="true" />
                    第 1 步 · 收集诉求
                  </p>
                  <h2>录入工单内容</h2>
                </div>
                <span className="status-pill">核心流程</span>
              </div>

              <label htmlFor="ticket-input">居民诉求文本</label>
              <p className="field-helper">这里是后续 AI 判断和处置流转的唯一输入。语音转写、批量导入和手动编辑，最终都会汇总到这里。</p>
              <textarea
                id="ticket-input"
                value={ticket}
                onChange={(event) => setTicket(event.target.value)}
                rows={8}
              />
              <div className="sample-row" aria-label="示例诉求">
                {sampleTickets.map((sample, index) => (
                  <button type="button" key={sample} onClick={() => setTicket(sample)}>
                    示例 {index + 1}
                  </button>
                ))}
              </div>

              <div className="intake-box" aria-label="语音方言接入">
                <div className="intake-title">
                  <span>
                    <Mic size={15} aria-hidden="true" />
                    语音 / 方言入口
                  </span>
                  <strong>{intakeResult ? `${Math.round(intakeResult.confidence * 100)}%` : '演示'}</strong>
                </div>
                <div className="intake-controls">
                  <label htmlFor="dialect-mode">
                    口音类型
                    <select
                      id="dialect-mode"
                      value={dialectMode}
                      onChange={(event) => setDialectMode(event.target.value as DialectMode)}
                    >
                      <option value="天津话">天津话</option>
                      <option value="普通话">普通话</option>
                      <option value="混合口音">混合口音</option>
                    </select>
                  </label>
                  <label htmlFor="voice-draft">
                    转写文本
                    <textarea
                      id="voice-draft"
                      className="voice-textarea"
                      value={voiceDraft}
                      onChange={(event) => setVoiceDraft(event.target.value)}
                      rows={3}
                    />
                  </label>
                </div>
                <div className="button-row compact">
                  <button className="secondary-button" type="button" onClick={transcribeVoiceDraft} disabled={isTranscribing}>
                    {isTranscribing ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
                    {isTranscribing ? '转写中' : '填入诉求框'}
                  </button>
                </div>
                {intakeResult && (
                  <div className="intake-result">
                    <span>{intakeResult.provider}</span>
                    <p>{intakeResult.normalizedText}</p>
                  </div>
                )}
              </div>

              <div className="button-row">
                <button className="primary-button" type="button" onClick={analyzeTicket} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                  {isAnalyzing ? '分析中' : '智能分析并入库'}
                </button>
                <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} aria-hidden="true" />
                  批量导入
                </button>
              </div>
            </article>

            <article className="panel result-panel" aria-live="polite">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    第 2 步 · AI 判断
                  </p>
                  <h2>{analysis.category}</h2>
                </div>
                <span className={`urgency urgency-${analysis.urgency}`}>{analysis.urgency}优先级</span>
              </div>

              <div className="result-grid">
                <div>
                  <span>诉求类别</span>
                  <strong>{analysis.category}</strong>
                </div>
                <div>
                  <span>情绪标签</span>
                  <strong>{analysis.emotion}</strong>
                </div>
                <div>
                  <span>建议部门</span>
                  <strong>{analysis.department}</strong>
                </div>
                <div>
                  <span>置信度</span>
                  <strong>{confidencePercent}%</strong>
                </div>
              </div>

              <div className="summary-box">
                <span>摘要</span>
                <p>{analysis.summary}</p>
              </div>
            </article>

            <aside className="panel action-panel" aria-label="工单处置台">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">
                    <Clock3 size={16} aria-hidden="true" />
                    第 3 步 · 复核流转
                  </p>
                  <h2>复核与流转</h2>
                </div>
              </div>

              <div className="state-grid">
                <div className="state-tile">
                  <span>流转状态</span>
                  <strong>{currentRecord?.status || '待转派'}</strong>
                </div>
                <div className="state-tile">
                  <span>人工复核</span>
                  <strong>{currentRecord?.review || '待复核'}</strong>
                </div>
                <div className="state-tile wide">
                  <span>当前记录</span>
                  <strong>{currentRecord?.createdAt || '尚未入库'}</strong>
                </div>
              </div>

              <label htmlFor="current-status">流转状态</label>
              <select
                id="current-status"
                value={currentRecord?.status || '待转派'}
                onChange={(event) => currentRecord && updateStatus(currentRecord.id, event.target.value as TicketStatus)}
                disabled={!currentRecord}
              >
                <option value="待转派">待转派</option>
                <option value="已转派">已转派</option>
                <option value="已回访">已回访</option>
              </select>

              <div className="action-stack" aria-label="快捷处置">
                <button className="secondary-button" type="button" onClick={() => reviewCurrent('正确')} disabled={!currentRecord}>
                  <Check size={16} aria-hidden="true" />
                  判断正确
                </button>
                <button className="secondary-button danger-soft" type="button" onClick={() => reviewCurrent('需调整')} disabled={!currentRecord}>
                  <XCircle size={16} aria-hidden="true" />
                  需调整
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setNoticePrompt(`${analysis.category}处置进展提醒`)
                    setActiveView('notice')
                  }}
                >
                  <Megaphone size={16} aria-hidden="true" />
                  生成通知
                </button>
              </div>

              <div className="steps action-steps">
                <span>下一步动作</span>
                <ol>
                  {analysis.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="workflow-list" aria-label="处置闭环">
                <div className={`workflow-step ${currentRecord ? 'done' : ''}`}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>录入入库</span>
                </div>
                <div className={`workflow-step ${currentRecord?.review !== '待复核' ? 'done' : ''}`}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>人工复核</span>
                </div>
                <div className={`workflow-step ${currentRecord?.status !== '待转派' ? 'done' : ''}`}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>转派跟进</span>
                </div>
                <div className={`workflow-step ${currentRecord?.status === '已回访' ? 'done' : ''}`}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>居民回访</span>
                </div>
              </div>

              <div className="mini-records">
                <span>最近工单</span>
                <div className="mini-record-list">
                  {records.slice(0, 3).map((record) => (
                    <button
                      className={`mini-record-button ${record.id === currentRecordId ? 'active' : ''}`}
                      type="button"
                      key={record.id}
                      onClick={() => loadRecord(record)}
                    >
                      <strong>{record.analysis.category}</strong>
                      <small>{record.createdAt} · {record.status}</small>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          <section className="metric-grid compact-metrics" aria-label="核心指标">
            {dashboard.metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.hint}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {activeView === 'account' && (
        <section className="account-grid">
          <article className="panel account-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  <UserRound size={16} aria-hidden="true" />
                  账号与认证
                </p>
                <h2>{isSignedIn ? '演示账号已登录' : '访客体验模式'}</h2>
              </div>
              <span className={`verify-pill ${profile.verified ? 'verified' : ''}`}>
                <BadgeCheck size={15} aria-hidden="true" />
                {profile.verified ? '已认证' : '待认证'}
              </span>
            </div>
            {isSignedIn ? (
              <div className="profile-summary">
                <strong>{profile.organization}</strong>
                <p>{profile.serviceArea}</p>
                <div className="summary-tags">
                  <span>{profile.role}</span>
                  <span>{settings.modelMode === 'cloud' ? '云端模型优先' : '演示规则引擎'}</span>
                </div>
              </div>
            ) : (
              <div className="login-form">
                <label htmlFor="auth-phone">手机号</label>
                <input id="auth-phone" value={authPhone} onChange={(event) => setAuthPhone(event.target.value)} />
                <label htmlFor="auth-password">密码</label>
                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />
                <button className="primary-button" type="button" onClick={loginDemo}>
                  <KeyRound size={18} aria-hidden="true" />
                  演示登录
                </button>
              </div>
            )}
          </article>

          <article className="panel profile-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  <UserRound size={16} aria-hidden="true" />
                  个人资料
                </p>
                <h2>资料编辑</h2>
              </div>
            </div>
            <div className="form-grid">
              <label>
                姓名
                <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
              </label>
              <label>
                手机号
                <input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
              </label>
              <label>
                所属机构
                <input value={profile.organization} onChange={(event) => setProfile({ ...profile, organization: event.target.value })} />
              </label>
              <label>
                岗位角色
                <input value={profile.role} onChange={(event) => setProfile({ ...profile, role: event.target.value })} />
              </label>
            </div>
            <label htmlFor="service-area">服务片区</label>
            <input
              id="service-area"
              value={profile.serviceArea}
              onChange={(event) => setProfile({ ...profile, serviceArea: event.target.value })}
            />
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={saveProfile}>
                <Save size={16} aria-hidden="true" />
                {profileSaved ? '已保存' : '保存资料'}
              </button>
              <button className="secondary-button" type="button" onClick={() => setProfile({ ...profile, verified: !profile.verified })}>
                <BadgeCheck size={16} aria-hidden="true" />
                {profile.verified ? '取消认证演示' : '模拟认证通过'}
              </button>
            </div>
          </article>

          <article className="panel settings-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  <Settings size={16} aria-hidden="true" />
                  设置
                </p>
                <h2>体验偏好</h2>
              </div>
            </div>
            <label htmlFor="model-mode">模型模式</label>
            <select
              id="model-mode"
              value={settings.modelMode}
              onChange={(event) => updateSetting('modelMode', event.target.value as UserSettings['modelMode'])}
            >
              <option value="demo">演示规则引擎</option>
              <option value="cloud">云端模型优先</option>
            </select>
            <div className="toggle-list">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.maskSensitiveInfo}
                  onChange={(event) => updateSetting('maskSensitiveInfo', event.target.checked)}
                />
                <span>默认提示脱敏处理</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.showDemoData}
                  onChange={(event) => updateSetting('showDemoData', event.target.checked)}
                />
                <span>显示演示样例数据</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.saveLocalRecords}
                  onChange={(event) => updateSetting('saveLocalRecords', event.target.checked)}
                />
                <span>允许本地保留处理记录</span>
              </label>
            </div>
          </article>
        </section>
      )}

      {activeView === 'records' && (
        <section className="records-layout">
          <section className="panel record-panel" id="records">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  <ListChecks size={16} aria-hidden="true" />
                  处理记录
                </p>
                <h2>试点工单沉淀</h2>
              </div>
              <span className="status-pill">{records.length} 条记录</span>
            </div>
            <div className="record-table" role="table" aria-label="工单处理记录">
              <div className="record-row record-head" role="row">
                <span role="columnheader">时间</span>
                <span role="columnheader">摘要</span>
                <span role="columnheader">类别</span>
                <span role="columnheader">状态</span>
                <span role="columnheader">复核</span>
                <span role="columnheader">操作</span>
              </div>
              {records.slice(0, 8).map((record) => (
                <div className={`record-row ${record.id === currentRecordId ? 'active' : ''}`} role="row" key={record.id}>
                  <span role="cell">{record.createdAt}</span>
                  <button className="text-button" type="button" onClick={() => selectRecord(record)} role="cell">
                    {record.analysis.summary}
                  </button>
                  <span role="cell">{record.analysis.category}</span>
                  <span role="cell">
                    <select value={record.status} onChange={(event) => updateStatus(record.id, event.target.value as TicketStatus)}>
                      <option value="待转派">待转派</option>
                      <option value="已转派">已转派</option>
                      <option value="已回访">已回访</option>
                    </select>
                  </span>
                  <span className={`review-badge review-${record.review}`} role="cell">
                    {record.review}
                  </span>
                  <span className="inline-actions" role="cell">
                    <button type="button" aria-label="查看详情" onClick={() => selectRecord(record)}>
                      <FileText size={15} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="继续处理" onClick={() => loadRecord(record)}>
                      <Send size={15} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <aside className="panel record-detail-panel" aria-label="选中工单详情">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  <FileText size={16} aria-hidden="true" />
                  当前选中
                </p>
                <h2>{currentRecord?.analysis.category || '暂无工单'}</h2>
              </div>
              <span className={`review-badge review-${currentRecord?.review || '待复核'}`}>
                {currentRecord?.review || '待复核'}
              </span>
            </div>
            {currentRecord && (
              <>
                <div className="detail-grid">
                  <div>
                    <span>时间</span>
                    <strong>{currentRecord.createdAt}</strong>
                  </div>
                  <div>
                    <span>状态</span>
                    <strong>{currentRecord.status}</strong>
                  </div>
                  <div>
                    <span>优先级</span>
                    <strong>{currentRecord.analysis.urgency}</strong>
                  </div>
                  <div>
                    <span>部门</span>
                    <strong>{currentRecord.analysis.department}</strong>
                  </div>
                </div>
                <div className="summary-box">
                  <span>摘要</span>
                  <p>{currentRecord.analysis.summary}</p>
                </div>
                <div className="record-original">
                  <span>原始诉求</span>
                  <p>{currentRecord.text}</p>
                </div>
                <div className="button-row">
                  <button className="primary-button" type="button" onClick={() => loadRecord(currentRecord)}>
                    <Send size={16} aria-hidden="true" />
                    继续处理
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setNoticePrompt(`${currentRecord.analysis.category}处置进展提醒`)
                      setActiveView('notice')
                    }}
                  >
                    <Megaphone size={16} aria-hidden="true" />
                    生成通知
                  </button>
                </div>
              </>
            )}
          </aside>
        </section>
      )}

      {activeView === 'notice' && (
      <section className="notice-workspace">
        <article className="panel" id="notice">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">
                <Megaphone size={16} aria-hidden="true" />
                通知草稿
              </p>
              <h2>AI 生成后人工编辑</h2>
            </div>
          </div>

          <label htmlFor="notice-input">通知主题</label>
          <p className="field-helper">AI 每次生成会覆盖右侧草稿。发出前可逐字修改，再复制到对应渠道。</p>
          <input
            id="notice-input"
            value={noticePrompt}
            onChange={(event) => setNoticePrompt(event.target.value)}
          />
          <button className="primary-button notice-button" type="button" onClick={generateNotice} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
            {isGenerating ? '生成中' : 'AI 生成 / 重新生成'}
          </button>
        </article>

        <article className="panel notice-output">
          <NoticeBlock
            title="正式版"
            text={notice.formal}
            copied={copiedKey === 'formal'}
            onChange={(value) => updateNoticeDraft('formal', value)}
            onCopy={() => copyText('formal', notice.formal)}
          />
          <NoticeBlock
            title="居民群版"
            text={notice.friendly}
            copied={copiedKey === 'friendly'}
            onChange={(value) => updateNoticeDraft('friendly', value)}
            onCopy={() => copyText('friendly', notice.friendly)}
          />
          <NoticeBlock
            title="短信版"
            text={notice.sms}
            copied={copiedKey === 'sms'}
            onChange={(value) => updateNoticeDraft('sms', value)}
            onCopy={() => copyText('sms', notice.sms)}
          />
        </article>
      </section>
      )}

      {activeView === 'dashboard' && (
      <section className="dashboard" id="dashboard">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">
                <BarChart3 size={16} aria-hidden="true" />
                试点数据看板
              </p>
              <h2>高频问题 TOP5</h2>
            </div>
            <span className="status-pill">本次会话</span>
          </div>
          <div className="bar-list">
            {dashboard.topCategories.map((issue) => (
              <div className="bar-row" key={issue.name}>
                <span>{issue.name}</span>
                <div className="bar-track" aria-hidden="true">
                  <div style={{ width: `${Math.max(12, issue.percent)}%` }} />
                </div>
                <strong>{issue.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel report-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">
                <CalendarDays size={16} aria-hidden="true" />
                周报生成
              </p>
              <h2>社区工单周报草稿</h2>
            </div>
          </div>
          <textarea className="report-textarea" value={reportText} readOnly rows={9} aria-label="社区工单周报草稿" />
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={refreshReport}>
              <RefreshCcw size={16} aria-hidden="true" />
              刷新周报
            </button>
            <button className="secondary-button" type="button" onClick={() => copyText('report', reportText)}>
              <Copy size={16} aria-hidden="true" />
              {copiedKey === 'report' ? '已复制' : '复制周报'}
            </button>
          </div>
        </div>
      </section>
      )}

      {activeView === 'opc' && (
        <>
      <section className="dashboard">
        <div className="panel report-panel">
          <p className="section-kicker">
            <Building2 size={16} aria-hidden="true" />
            决赛证据链
          </p>
          <h2>接下来要补齐的真实材料</h2>
          <ul>
            <li>10-30 条社区或物业脱敏工单样例</li>
            <li>1 份网格员访谈记录或试用意向说明</li>
            <li>人工处理与 AI 辅助处理的效率对比表</li>
            <li>2 周试点后的满意度问卷和反馈截图</li>
          </ul>
        </div>
        <div className="panel">
          <p className="section-kicker">
            <AlertTriangle size={16} aria-hidden="true" />
            演示边界
          </p>
          <h2>数据安全说明</h2>
          <div className="warning-note">
            <AlertTriangle size={18} aria-hidden="true" />
            <p>当前为演示版，前端记录仅保存在本次浏览器会话。接入试点前需做脱敏、权限和留痕设计。</p>
          </div>
        </div>
      </section>

      <section className="evidence-section" aria-label="项目证据链">
        <div className="evidence-heading">
          <p className="section-kicker">
            <Clock3 size={16} aria-hidden="true" />
            面向比赛的证据链
          </p>
          <h2>从可体验 Demo 走向真实试点</h2>
        </div>
        <div className="proof-strip">
          <div>
            <span>01</span>
            <strong>线上可访问</strong>
            <p>部署后可绑定 jinzhi.22dhmv.top，评委和社区无需安装。</p>
          </div>
          <div>
            <span>02</span>
            <strong>真实试点导向</strong>
            <p>支持替换为脱敏工单、网格员反馈和处理效率数据。</p>
          </div>
          <div>
            <span>03</span>
            <strong>复赛可适配</strong>
            <p>工单分类、通知模板、周报生成都能快速响应微需求。</p>
          </div>
        </div>
      </section>

      <section className="evidence-section" aria-label="服务接入方案">
        <div className="evidence-heading">
          <p className="section-kicker">
            <Server size={16} aria-hidden="true" />
            服务端与接入
          </p>
          <h2>线上体验背后的部署关系</h2>
        </div>
        <div className="service-grid">
          <div className="service-card">
            <GitBranch size={18} aria-hidden="true" />
            <strong>代码仓库</strong>
            <p>代码放在 GitHub，推送 main 分支后由 Vercel 自动构建上线。</p>
          </div>
          <div className="service-card">
            <Server size={18} aria-hidden="true" />
            <strong>服务端接口</strong>
            <p>当前使用 Vercel Serverless：/api/analyze、/api/notice、/api/transcribe。</p>
          </div>
          <div className="service-card">
            <Sparkles size={18} aria-hidden="true" />
            <strong>AI 模型</strong>
            <p>配置 DASHSCOPE_API_KEY 后走云端模型；没有密钥时使用本地规则兜底。</p>
          </div>
          <div className="service-card">
            <Mic size={18} aria-hidden="true" />
            <strong>方言识别</strong>
            <p>演示版先接收转写文本并规范成工单；试点时替换为真实 ASR 音频识别。</p>
          </div>
        </div>
      </section>
        </>
      )}
    </main>
  )
}

function NoticeBlock({
  title,
  text,
  copied,
  onChange,
  onCopy,
}: {
  title: string
  text: string
  copied: boolean
  onChange: (value: string) => void
  onCopy: () => void
}) {
  return (
    <div className="notice-block">
      <div className="notice-title-row">
        <span>{title}</span>
        <button type="button" onClick={onCopy}>
          <Copy size={15} aria-hidden="true" />
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <textarea
        className="notice-edit"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        rows={title === '短信版' ? 3 : 5}
        aria-label={`${title}通知草稿`}
      />
    </div>
  )
}

function createRecord(text: string, result: AnalysisResult): TicketRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    analysis: result,
    review: '待复核',
    status: '待转派',
    createdAt: formatNow(),
  }
}

function buildLocalIntake(transcript: string, dialect: DialectMode): IntakeResult {
  const normalizedText = transcript
    .replace(/介个/g, '这个')
    .replace(/嘛呀/g, '')
    .replace(/嘛/g, '')
    .replace(/老有/g, '经常有')
    .replace(/真要有急事儿/g, '如遇紧急情况')
    .replace(/说说吧/g, '协调处理')
    .trim()

  return {
    dialect,
    transcript,
    normalizedText: normalizedText || transcript,
    confidence: dialect === '天津话' ? 0.82 : 0.88,
    provider: '演示转写服务 /api/transcribe',
    notes: ['演示版接收转写文本', '试点版替换为音频 ASR', '输出会进入同一套工单分析流程'],
  }
}

function formatNow() {
  const date = new Date()
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function parseImportedTickets(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const firstCell = line.split(',')[0] || line
      return firstCell.replace(/^"|"$/g, '').trim()
    })
    .filter((line) => line.length > 5)
    .slice(0, 50)
}

function getTopCategories(records: TicketRecord[]) {
  const counts = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.analysis.category] = (acc[record.analysis.category] || 0) + 1
    return acc
  }, {})
  const max = Math.max(1, ...Object.values(counts))
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, percent: Math.round((count / max) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function buildWeeklyReport(records: TicketRecord[]) {
  const topCategories = getTopCategories(records)
  const urgentCount = records.filter((record) => record.analysis.urgency === '高').length
  const reviewed = records.filter((record) => record.review !== '待复核').length
  const correct = records.filter((record) => record.review === '正确').length
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0
  const topText = topCategories.map((item, index) => `${index + 1}. ${item.name}：${item.count}件`).join('\n')

  return [
    '社区工单周报草稿',
    '',
    `本周共处理居民诉求 ${records.length} 件，其中高优先级 ${urgentCount} 件。`,
    reviewed > 0 ? `已完成人工复核 ${reviewed} 件，当前复核准确率约 ${accuracy}%。` : '当前尚未完成人工复核，建议安排网格员抽样确认分类结果。',
    '',
    '高频问题：',
    topText || '暂无数据',
    '',
    '建议动作：',
    '1. 对高优先级工单进行现场核实，优先处理消防、安全和矛盾纠纷类问题。',
    '2. 对高频问题形成专项治理清单，明确物业、社区和相关部门责任。',
    '3. 将复核结果回填系统，用于持续优化分类准确率。',
  ].join('\n')
}

function buildLocalAnalysis(text: string): AnalysisResult {
  const normalized = text.toLowerCase()
  const isFire = /消防|通道|电动车|充电|火/.test(normalized)
  const isClean = /垃圾|异味|卫生|积水|蚊虫/.test(normalized)
  const isRepair = /维修|坏|漏水|电梯|路灯|门禁/.test(normalized)
  const isConflict = /吵|噪音|纠纷|楼上|装修|争执/.test(normalized)
  const angry = /生气|投诉|没人管|受不了|严重|一直/.test(normalized)

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

  return {
    category: '综合诉求',
    urgency: '低',
    emotion: angry ? '不满' : '平静',
    department: '社区综合服务窗口',
    summary: '该诉求需要进一步补充地点、对象和期望处理结果，建议先进行信息核实。',
    nextSteps: ['补充居民联系方式与具体位置', '确认诉求对象和期望结果', '转交对应网格员跟进'],
    confidence: 0.78,
  }
}

function buildLocalNotice(prompt: string, currentAnalysis: AnalysisResult): NoticeResult {
  return {
    formal: `各位居民：关于“${prompt}”，社区将结合近期${currentAnalysis.category}类诉求开展专项提醒与现场巡查。请大家主动配合社区及物业工作，共同维护安全、有序、整洁的居住环境。`,
    friendly: `邻居们大家好，最近社区在关注“${prompt}”。如果大家发现类似问题，可以及时联系网格员，我们会尽快协调处理，也请大家互相提醒、一起配合。`,
    sms: `社区提醒：${prompt}。如遇相关问题请联系网格员或物业，感谢理解与配合。`,
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function persistJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 演示环境下 localStorage 不可用时直接忽略，不阻断主流程。
  }
}

export default App
