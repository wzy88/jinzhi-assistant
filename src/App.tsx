import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Bot,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileDown,
  FileText,
  Filter,
  Gauge,
  Grid2X2,
  HelpCircle,
  Home,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPinned,
  Megaphone,
  MessageSquareText,
  PlayCircle,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Target,
  Upload,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type ViewKey = 'overview' | 'tickets' | 'notice' | 'toolbox' | 'analysis' | 'settings' | 'help'
type TicketStatus = '待预处理' | '待人工复核' | '已形成建议' | '已归档'
type Urgency = '高紧急' | '常规' | '低'
type ToolKey = 'poster' | 'flow' | 'video' | 'media'
type DrawerKey = 'ticket' | 'notice' | ToolKey | 'assistant' | 'advancedFilter' | 'judgement' | 'hotspot' | null
type NoticeChannel = '工作群' | '社区群' | '短信'
type UserRole = '管理员' | '网格员' | '物业客服'

type Ticket = {
  id: string
  location: string
  content: string
  category: string
  urgency: Urgency
  emotion: string
  status: TicketStatus
  department: string
  summary: string
  source?: string
  createdAt?: string
  review?: '待复核' | '正确' | '需调整'
  masked?: boolean
}

type NoticeDraft = {
  formal: string
  friendly: string
  sms: string
}

type PublishRecord = {
  id: string
  title: string
  channels: NoticeChannel[]
  audience: string
  status: '草稿' | '已分发' | '待确认'
  time: string
}

type SettingsState = {
  autoSummary: boolean
  emotionAlert: boolean
  dialectMode: boolean
  twoFactor: boolean
  retainLocalRecords: boolean
}

const ticketsSeed: Ticket[] = [
  {
    id: '#88291',
    location: '西城区中心街3号',
    content: '夜间道路照明损坏，居民出行极其不便，存在安全隐患，希望尽快协调维修。',
    category: '市政设施',
    urgency: '高紧急',
    emotion: '焦虑',
    status: '待预处理',
    department: '工程维修组',
    summary: '夜间照明故障影响居民安全通行，建议优先核实点位并转交工程维修组。',
  },
  {
    id: '#88285',
    location: '名诚社区长者饭堂',
    content: '老人用餐高峰期排队时间久，希望增加志愿者或调整发餐窗口。',
    category: '社会福利',
    urgency: '常规',
    emotion: '中性',
    status: '待人工复核',
    department: '民生服务岗',
    summary: '长者饭堂服务效率诉求，建议核实高峰时段并优化窗口动线。',
  },
  {
    id: '#20231024-003',
    location: '南门入口',
    content: '入口处生活垃圾堆积，天气升温后异味明显，影响居民进出体验。',
    category: '环境卫生',
    urgency: '常规',
    emotion: '不满',
    status: '已形成建议',
    department: '物业保洁组',
    summary: '南门垃圾堆积影响公共环境，建议物业保洁组当天清理并拍照留档。',
  },
  {
    id: '#20231024-004',
    location: '幸福小区2号楼',
    content: '电梯故障停运，老人上下楼困难，希望尽快安排维修。',
    category: '设施报修',
    urgency: '高紧急',
    emotion: '焦虑',
    status: '已归档',
    department: '电梯维保单位',
    summary: '电梯停运影响老人通行，已形成维保协调建议并归档跟踪。',
  },
]

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: 'overview', label: '工作看板', icon: LayoutDashboard },
  { key: 'tickets', label: '工单中心', icon: ClipboardList },
  { key: 'notice', label: '通知管理', icon: Bell },
  { key: 'toolbox', label: '创意工具箱', icon: Wand2 },
  { key: 'analysis', label: '试点分析', icon: Gauge },
  { key: 'settings', label: '设置', icon: Settings },
  { key: 'help', label: '帮助中心', icon: HelpCircle },
]

const categoryData = [
  { label: '环境卫生', current: 128, previous: 96 },
  { label: '设施报修', current: 80, previous: 64 },
  { label: '噪音投诉', current: 156, previous: 128 },
  { label: '安全隐患', current: 64, previous: 48 },
  { label: '咨询服务', current: 112, previous: 80 },
]

const defaultNotice: NoticeDraft = {
  formal:
    '各位居民：为保障社区公共秩序与居民生活安全，社区将于本周开展专项提醒与现场巡查。请大家积极配合社区及物业安排，共同维护安全、整洁、有序的居住环境。',
  friendly:
    '邻居们大家好，最近社区会开展一次专项提醒和巡查。请大家互相转告、一起配合，有问题也可以及时联系网格员或物业。',
  sms: '社区提醒：近期将开展专项巡查，请居民留意通知并配合现场安排，感谢理解。',
}

const defaultSettings: SettingsState = {
  autoSummary: true,
  emotionAlert: true,
  dialectMode: true,
  twoFactor: false,
  retainLocalRecords: true,
}

function App() {
  const [isSignedIn, setIsSignedIn] = useState(() => readJson('jinzhi-auth', false))
  const [activeView, setActiveView] = useState<ViewKey>('overview')
  const [tickets, setTickets] = useState<Ticket[]>(() => readJson('jinzhi-tickets', ticketsSeed))
  const [selectedTicketId, setSelectedTicketId] = useState(ticketsSeed[0].id)
  const [drawer, setDrawer] = useState<DrawerKey>(null)
  const [noticeTopic, setNoticeTopic] = useState('春季社区安全防范指南')
  const [notice, setNotice] = useState<NoticeDraft>(defaultNotice)
  const [toolOutput, setToolOutput] = useState('')
  const [copied, setCopied] = useState('')
  const [noticeReturnTicketId, setNoticeReturnTicketId] = useState<string | null>(null)
  const [ticketFilter, setTicketFilter] = useState<'全部' | '高紧急度' | '待审核'>('全部')
  const [selectedChannels, setSelectedChannels] = useState<NoticeChannel[]>(['工作群', '社区群', '短信'])
  const [publishRecords, setPublishRecords] = useState<PublishRecord[]>([
    { id: 'NT-1024', title: '春季社区安全防范指南', channels: ['社区群', '短信'], audience: '全体居民', status: '已分发', time: '今日 09:32' },
    { id: 'NT-1023', title: '周日停水提醒', channels: ['工作群', '社区群'], audience: '12号楼至15号楼', status: '待确认', time: '昨日 16:45' },
    { id: 'NT-1022', title: '电梯检修通知', channels: ['社区群'], audience: '幸福小区2号楼', status: '草稿', time: '周三 14:10' },
  ])
  const [settings, setSettings] = useState<SettingsState>(() => readJson('jinzhi-settings', defaultSettings))
  const [role, setRole] = useState<UserRole>(() => readJson('jinzhi-role', '管理员' as UserRole))
  const [toast, setToast] = useState('')
  const modalOpen = drawer !== null

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0]
  const pendingCount = tickets.filter((ticket) => ticket.status !== '已归档').length
  const urgentCount = tickets.filter((ticket) => ticket.urgency === '高紧急').length
  const reviewedTickets = tickets.filter((ticket) => ticket.review && ticket.review !== '待复核')
  const accuracy =
    reviewedTickets.length > 0
      ? Math.round((reviewedTickets.filter((ticket) => ticket.review === '正确').length / reviewedTickets.length) * 100)
      : 98

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency)),
    [tickets],
  )

  const visibleTickets = useMemo(() => {
    if (ticketFilter === '高紧急度') return sortedTickets.filter((ticket) => ticket.urgency === '高紧急')
    if (ticketFilter === '待审核') return sortedTickets.filter((ticket) => ticket.status === '待人工复核')
    return sortedTickets
  }, [sortedTickets, ticketFilter])

  useEffect(() => {
    if (!modalOpen) return

    const scrollY = window.scrollY
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.body.style.overflow = previous.overflow
      document.body.style.position = previous.position
      document.body.style.top = previous.top
      document.body.style.width = previous.width
      window.scrollTo(0, scrollY)
    }
  }, [modalOpen])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }

  function loginDemo() {
    setIsSignedIn(true)
    persistJson('jinzhi-auth', true)
  }

  function logout() {
    setIsSignedIn(false)
    persistJson('jinzhi-auth', false)
  }

  function openTicket(ticket: Ticket) {
    setSelectedTicketId(ticket.id)
    setNoticeReturnTicketId(null)
    setDrawer('ticket')
  }

  function updateSelectedTicket(next: Partial<Ticket>) {
    setTickets((current) =>
      persistTickets(current.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, ...next } : ticket))),
    )
  }

  function completeTicket(nextStatus: TicketStatus) {
    updateSelectedTicket({ status: nextStatus })
    setDrawer(null)
  }

  function generateNotice(topic = noticeTopic) {
    setNotice({
      formal: `各位居民：关于“${topic}”，社区将根据近期居民诉求和现场情况开展提醒、巡查与协同处置。请大家主动配合社区及物业工作，共同维护安全、有序、整洁的生活环境。`,
      friendly: `邻居们大家好，最近社区在关注“${topic}”。如果您发现相关情况，可以及时联系网格员，我们会尽快协调处理，也请大家互相提醒、一起配合。`,
      sms: `社区提醒：${topic}。如遇相关问题请联系网格员或物业，感谢理解与配合。`,
    })
  }

  function openTool(tool: ToolKey | 'notice', topic?: string) {
    if (topic) setNoticeTopic(topic)
    setNoticeReturnTicketId(null)
    if (tool === 'poster') {
      setToolOutput('已根据通知主题生成社区海报文案与视觉草案，可下载 SVG 或复制文案继续编辑。')
    }
    if (tool === 'flow') {
      setToolOutput('1. 居民上报\n2. AI 识别类别与紧急度\n3. 网格员人工复核\n4. 形成处置建议\n5. 通知居民并归档留痕')
    }
    if (tool === 'video') {
      setToolOutput('虚拟人脚本：居民朋友们好，我是津智助理。今天提醒大家关注春季用电、通风和消防通道安全。')
    }
    if (tool === 'media') {
      setToolOutput('Notice: Community Health & Wellness Seminar\n\nDear residents, we are excited to announce a special seminar focusing on modern health practices. Our district medical experts will be present to share insights on digital health management and seasonal wellness.')
    }
    setDrawer(tool)
  }

  function persistTickets(nextTickets: Ticket[]) {
    if (settings.retainLocalRecords) persistJson('jinzhi-tickets', nextTickets)
    return nextTickets
  }

  function toggleChannel(channel: NoticeChannel) {
    setSelectedChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel],
    )
  }

  function publishNotice() {
    if (selectedChannels.length === 0) {
      showToast('请至少选择一个分发渠道')
      return
    }
    const record: PublishRecord = {
      id: `NT-${String(1024 + publishRecords.length).padStart(4, '0')}`,
      title: noticeTopic,
      channels: selectedChannels,
      audience: urgentCount > 0 ? '高风险楼栋与社区工作群' : '全体居民',
      status: '已分发',
      time: '刚刚',
    }
    setPublishRecords((current) => [record, ...current])
    showToast('通知已模拟分发并写入发布记录')
  }

  function applySuggestion() {
    const target = tickets.find((ticket) => ticket.id === '#88291') || tickets[0]
    setTickets((current) =>
      persistTickets(
        current.map((ticket) =>
          ticket.id === target.id ? { ...ticket, status: '待人工复核', department: '工程维修组 · 张工' } : ticket,
        ),
      ),
    )
    showToast(`${target.id} 已采纳 AI 调度建议`)
  }

  function maskAllTickets() {
    setTickets((current) =>
      persistTickets(
        current.map((ticket) => ({
          ...ticket,
          location: maskSensitive(ticket.location),
          content: maskSensitive(ticket.content),
          summary: maskSensitive(ticket.summary),
          masked: true,
        })),
      ),
    )
    showToast('已完成本地自动脱敏')
  }

  function exportTickets() {
    downloadText('jinzhi-tickets.csv', ticketsToCsv(tickets))
    showToast('工单 CSV 已生成')
  }

  function exportReport() {
    const weeklyReport = buildWeeklyReport(tickets, accuracy)
    downloadText('jinzhi-weekly-report.txt', weeklyReport)
    showToast('试点报告草稿已生成')
  }

  async function importTickets(file: File) {
    const text = await file.text()
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)
      .slice(0, 50)
    if (rows.length === 0) {
      showToast('未识别到可导入的诉求文本')
      return
    }
    const imported = rows.map((row, index) => analyzeImportedTicket(row, tickets.length + index + 1))
    setTickets((current) => persistTickets([...imported, ...current]))
    setSelectedTicketId(imported[0].id)
    setTicketFilter('全部')
    showToast(`已导入 ${imported.length} 条工单`)
  }

  function updateSettings(next: Partial<SettingsState>) {
    const updated = { ...settings, ...next }
    setSettings(updated)
    persistJson('jinzhi-settings', updated)
    if (!updated.retainLocalRecords) window.localStorage.removeItem('jinzhi-tickets')
  }

  function switchRole() {
    const roles: UserRole[] = ['管理员', '网格员', '物业客服']
    const nextRole = roles[(roles.indexOf(role) + 1) % roles.length]
    setRole(nextRole)
    persistJson('jinzhi-role', nextRole)
    showToast(`已切换为${nextRole}视角`)
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied(''), 1500)
    } catch {
      setCopied('')
    }
  }

  if (!isSignedIn) {
    return <LoginScreen onLogin={loginDemo} />
  }

  return (
    <main className="gc-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={logout} />
      <TopBar activeView={activeView} />

      <section className="gc-main">
        {activeView === 'overview' && (
          <Overview
            pendingCount={pendingCount}
            urgentCount={urgentCount}
            accuracy={accuracy}
            tickets={sortedTickets}
            openTicket={openTicket}
            openNotice={() => openTool('notice', '社区安全提醒')}
            openJudgement={() => setDrawer('judgement')}
            exportReport={exportReport}
            goTickets={() => setActiveView('tickets')}
          />
        )}
        {activeView === 'tickets' && (
          <TicketsCenter
            tickets={visibleTickets}
            pendingCount={pendingCount}
            accuracy={accuracy}
            openTicket={openTicket}
            filter={ticketFilter}
            setFilter={setTicketFilter}
            importTickets={importTickets}
            exportTickets={exportTickets}
            maskAllTickets={maskAllTickets}
            applySuggestion={applySuggestion}
            openAdvancedFilter={() => setDrawer('advancedFilter')}
            openHotspotReport={() => setDrawer('hotspot')}
          />
        )}
        {activeView === 'notice' && (
          <NoticeManager
            openCompose={() => setDrawer('notice')}
            publishRecords={publishRecords}
            tickets={tickets}
          />
        )}
        {activeView === 'toolbox' && <Toolbox openTool={openTool} />}
        {activeView === 'analysis' && <PilotAnalysis tickets={tickets} accuracy={accuracy} exportReport={exportReport} copyText={copyText} copied={copied} />}
        {activeView === 'settings' && (
          <SettingsView
            onLogout={logout}
            settings={settings}
            updateSettings={updateSettings}
            exportTickets={exportTickets}
            role={role}
            switchRole={switchRole}
          />
        )}
        {activeView === 'help' && <HelpCenter setActiveView={setActiveView} />}
      </section>

      {toast && <div className="toast">{toast}</div>}

      <button className="ai-float" type="button" onClick={() => setDrawer('assistant')} aria-label="打开 AI 助手">
        <Bot size={25} />
      </button>

      {drawer === 'ticket' && (
        <TicketDrawer
          ticket={selectedTicket}
          updateTicket={updateSelectedTicket}
          completeTicket={completeTicket}
          close={() => setDrawer(null)}
          openNotice={() => {
            setNoticeTopic(`${selectedTicket.category}处置进展提醒`)
            generateNotice(`${selectedTicket.category}处置进展提醒`)
            setNoticeReturnTicketId(selectedTicket.id)
            setDrawer('notice')
          }}
        />
      )}
      {drawer === 'notice' && (
        <NoticeDrawer
          topic={noticeTopic}
          setTopic={setNoticeTopic}
          notice={notice}
          generateNotice={generateNotice}
          copyText={copyText}
          copied={copied}
          close={() => setDrawer(null)}
          selectedChannels={selectedChannels}
          toggleChannel={toggleChannel}
          publishNotice={publishNotice}
          publishRecords={publishRecords}
          tickets={tickets}
          sourceTicket={noticeReturnTicketId ? selectedTicket : undefined}
          backToTicket={
            noticeReturnTicketId
              ? () => {
                  setSelectedTicketId(noticeReturnTicketId)
                  setNoticeReturnTicketId(null)
                  setDrawer('ticket')
                }
              : undefined
          }
        />
      )}
      {(drawer === 'poster' || drawer === 'flow' || drawer === 'video' || drawer === 'media') && (
        <ToolDrawer
          type={drawer}
          topic={noticeTopic}
          setTopic={setNoticeTopic}
          output={toolOutput}
          setOutput={setToolOutput}
          copyText={copyText}
          copied={copied}
          close={() => setDrawer(null)}
        />
      )}
      {drawer === 'assistant' && (
        <AssistantDrawer
          urgentCount={urgentCount}
          close={() => setDrawer(null)}
          openTickets={() => {
            setDrawer(null)
            setActiveView('tickets')
          }}
        />
      )}
      {drawer === 'advancedFilter' && (
        <AdvancedFilterDrawer
          filter={ticketFilter}
          setFilter={setTicketFilter}
          close={() => setDrawer(null)}
        />
      )}
      {drawer === 'judgement' && (
        <JudgementDrawer
          tickets={tickets}
          accuracy={accuracy}
          close={() => setDrawer(null)}
          openHotspotReport={() => setDrawer('hotspot')}
          goTickets={() => {
            setDrawer(null)
            setActiveView('tickets')
          }}
        />
      )}
      {drawer === 'hotspot' && (
        <HotspotReportDrawer
          tickets={tickets}
          accuracy={accuracy}
          exportReport={exportReport}
          close={() => setDrawer(null)}
        />
      )}
    </main>
  )
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-row">
          <div className="brand-logo">
            <img src="/jinzhi-logo.svg" alt="津智助理" />
          </div>
          <div>
            <strong>津智助理</strong>
            <span>社区治理智脑</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">演示登录</p>
          <h1>进入 AI 工单预处理中心</h1>
          <p>手机号与验证码仅用于演示。点击登录后直接进入区级管理端。</p>
        </div>
        <label>
          手机号
          <input value="138 0000 8888" readOnly />
        </label>
        <label>
          验证码
          <div className="inline-field">
            <input value="246810" readOnly />
            <button type="button">获取验证码</button>
          </div>
        </label>
        <button className="primary-action" type="button" onClick={onLogin}>
          <LogIn size={18} />
          进入工作台
        </button>
      </section>
    </main>
  )
}

function Sidebar({
  activeView,
  setActiveView,
  onLogout,
}: {
  activeView: ViewKey
  setActiveView: (view: ViewKey) => void
  onLogout: () => void
}) {
  return (
    <aside className="gc-sidebar">
      <div>
        <div className="brand-row sidebar-brand">
          <div className="brand-logo">
            <img src="/jinzhi-logo.svg" alt="津智助理" />
          </div>
          <div>
            <strong>津智助理</strong>
            <span>社区治理智脑</span>
          </div>
        </div>
        <nav className="side-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeView === item.key ? 'active' : ''}
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="side-footer">
        <button
          className={activeView === 'help' ? 'active' : ''}
          type="button"
          onClick={() => setActiveView('help')}
        >
          <HelpCircle size={18} />
          帮助中心
        </button>
        <div className="user-card">
          <div className="avatar">张</div>
          <div>
            <strong>张建国</strong>
            <span>管理员</span>
          </div>
          <button type="button" onClick={onLogout} aria-label="退出登录">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function TopBar({ activeView }: { activeView: ViewKey }) {
  const placeholder: Record<ViewKey, string> = {
    overview: '搜索工单、通知或数据...',
    tickets: '搜索工单、关键词或处理人...',
    notice: '搜索通知、模板或发布渠道...',
    toolbox: '搜索创意素材...',
    analysis: '搜索指标、社区或周期...',
    settings: '搜索设置项...',
    help: '搜索帮助、流程或常见问题...',
  }

  return (
    <header className="gc-topbar">
      <div className="search-box">
        <Search size={18} />
        <span>{placeholder[activeView]}</span>
      </div>
      <div className="top-actions">
        <button type="button" aria-label="消息">
          <Bell size={18} />
          <i />
        </button>
        <button type="button" aria-label="刷新">
          <RefreshCcw size={18} />
        </button>
        <span className="engine-pill">AI 引擎已就绪</span>
      </div>
    </header>
  )
}

function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {kicker && <p className="breadcrumb">{kicker}</p>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Overview({
  pendingCount,
  urgentCount,
  accuracy,
  tickets,
  openTicket,
  openNotice,
  openJudgement,
  exportReport,
  goTickets,
}: {
  pendingCount: number
  urgentCount: number
  accuracy: number
  tickets: Ticket[]
  openTicket: (ticket: Ticket) => void
  openNotice: () => void
  openJudgement: () => void
  exportReport: () => void
  goTickets: () => void
}) {
  return (
    <>
      <PageHeader
        title="津智助理 - 试点概览"
        subtitle={`实时社区治理指标与 AI 决策辅助系统，当前待处理工单 ${pendingCount} 件。`}
        action={
          <div className="header-actions">
            <button type="button">过去 30 天</button>
            <button className="primary" type="button" onClick={exportReport}>
              <Download size={16} />
              导出报告
            </button>
          </div>
        }
      />
      <section className="stats-grid">
        <StatCard icon={<Boxes />} label="总工单量" value="1,284" trend="+12%" />
        <StatCard icon={<AlertTriangle />} label="高优先级事件" value={String(urgentCount)} tone="danger" trend="高危" />
        <StatCard icon={<Sparkles />} label="AI 识别准确率" value={`${accuracy}.2%`} badge="AI 增强识别" tone="ai" />
        <StatCard icon={<Gauge />} label="平均响应时间" value="1.4h" hint="平均处理" />
      </section>
      <section className="overview-grid">
        <div className="panel chart-panel">
          <PanelTitle title="各类工单频率分布" />
          <BarChart />
        </div>
        <div className="panel alert-panel">
          <div className="alert-icon">
            <Bot size={20} />
          </div>
          <h2>AI 智能预警</h2>
          <p>根据过去72小时的数据趋势，北苑社区的环境报修工单增长了30%。</p>
          <div className="alert-suggestion">
            <strong>建议行动：</strong>
          <span>增派社区区域巡检频次，核查垃圾清运商周执勤情况。</span>
          </div>
          <button type="button" onClick={openJudgement}>查看研判分析</button>
        </div>
        <div className="panel table-panel">
          <PanelTitle title="实时工单动态" action="查看全部" onAction={goTickets} />
          <MiniTable tickets={tickets.slice(0, 3)} openTicket={openTicket} />
        </div>
        <div className="panel notice-card">
          <Megaphone size={22} />
          <h2>快速发布社区通知</h2>
          <p>需要单独发停水、检修、安全提醒时，可直接生成多渠道通知。</p>
          <button type="button" onClick={openNotice}>发布通知</button>
        </div>
      </section>
    </>
  )
}

function TicketsCenter({
  tickets,
  pendingCount,
  accuracy,
  openTicket,
  filter,
  setFilter,
  importTickets,
  exportTickets,
  maskAllTickets,
  applySuggestion,
  openAdvancedFilter,
  openHotspotReport,
}: {
  tickets: Ticket[]
  pendingCount: number
  accuracy: number
  openTicket: (ticket: Ticket) => void
  filter: '全部' | '高紧急度' | '待审核'
  setFilter: (filter: '全部' | '高紧急度' | '待审核') => void
  importTickets: (file: File) => void
  exportTickets: () => void
  maskAllTickets: () => void
  applySuggestion: () => void
  openAdvancedFilter: () => void
  openHotspotReport: () => void
}) {
  const recommendedTicket = tickets.find((ticket) => ticket.id === '#88291') || tickets[0]

  return (
    <>
      <PageHeader
        kicker="工单中心 > AI 智能预处理"
        title="工单预处理中心"
        action={
          <div className="mini-metrics">
            <StatInline label="待处理" value={pendingCount} />
            <StatInline label="智能分类率" value={`${accuracy}%`} />
          </div>
        }
      />
      <section className="toolbar panel">
        <div className="segmented">
          {(['全部', '高紧急度', '待审核'] as const).map((item) => (
            <button className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
        <label className="file-button">
          <Upload size={16} />
          导入样例
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) importTickets(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
        <button className="filter-button" type="button" onClick={maskAllTickets}>
          <ShieldCheck size={16} />
          自动脱敏
        </button>
        <button className="filter-button" type="button" onClick={exportTickets}>
          <FileDown size={16} />
          导出 CSV
        </button>
        <button className="filter-button" type="button" onClick={openAdvancedFilter}>
          <Filter size={16} />
          高级筛选
        </button>
        <span>最后更新: 14:32:05</span>
      </section>
      <section className="panel ticket-table-panel">
        <div className="ticket-table">
          <div className="ticket-row head">
            <span>ID</span>
            <span>工单内容</span>
            <span>AI 分类</span>
            <span>紧急度</span>
            <span>情绪分析</span>
            <span>当前状态</span>
            <span>操作</span>
          </div>
          {tickets.map((ticket) => (
            <button className="ticket-row" key={ticket.id} type="button" onClick={() => openTicket(ticket)}>
              <span>{ticket.id}</span>
              <span>
                <strong>{ticket.location}</strong>
                <small>{ticket.content}</small>
              </span>
              <span className="category-cell">
                <Zap size={16} />
                {ticket.category}
              </span>
              <span>
                <Badge type={ticket.urgency}>{ticket.urgency}</Badge>
              </span>
              <span>{ticket.emotion}</span>
              <span>
                <StatusBadge status={ticket.status} />
              </span>
              <span>
                <i className="review-button">审核处理</i>
              </span>
            </button>
          ))}
          {tickets.length === 0 && <div className="empty-row">当前筛选下暂无工单</div>}
        </div>
      </section>
      <section className="suggestion-grid">
        <div className="ai-suggestion">
          <h2>AI 智能调度建议</h2>
          <p>系统实时分析显示：建议将 #88291 分配至工程部处理。根据当前网格员地理位置及专业度匹配，预计可缩短响应时间约 15 分钟。</p>
          <button type="button" onClick={applySuggestion}>采纳建议</button>
          <button type="button" onClick={() => recommendedTicket && openTicket(recommendedTicket)}>查看详情</button>
        </div>
        <div className="panel hotspot-card">
          <p className="breadcrumb">实时热点监测</p>
          <h2>供暖系统异常波动</h2>
          <p>AI 监测到过去 2 小时内西区集中出现 12 起相似供暖投诉。</p>
          <button type="button" onClick={openHotspotReport}>生成分析报告</button>
        </div>
      </section>
    </>
  )
}

function NoticeManager({
  openCompose,
  publishRecords,
  tickets,
}: {
  openCompose: () => void
  publishRecords: PublishRecord[]
  tickets: Ticket[]
}) {
  const distributedCount = publishRecords.filter((item) => item.status === '已分发').length
  const draftCount = publishRecords.filter((item) => item.status === '草稿').length
  const pendingCount = publishRecords.filter((item) => item.status === '待确认').length
  const urgentTicket = tickets.find((ticket) => ticket.urgency === '高紧急')

  return (
    <>
      <PageHeader
        title="通知管理"
        subtitle="管理已发布通知、待确认草稿和通用社区通知；具体事件通知从工单详情中生成。"
        action={<button className="primary" type="button" onClick={openCompose}>新建通知</button>}
      />
      <section className="notice-ledger-grid">
        <div className="panel notice-compose-card">
          <div>
            <p className="breadcrumb">推荐入口</p>
            <h2>从工单生成通知更可靠</h2>
            <p>通知发布需要事件事实、影响范围、责任部门和协助方案。优先从工单详情进入，可自动带出上下文并形成发布留痕。</p>
          </div>
          {urgentTicket && (
            <div className="notice-linked-ticket">
              <span>当前建议处理</span>
              <strong>{urgentTicket.id} · {urgentTicket.category}</strong>
              <p>{urgentTicket.summary}</p>
            </div>
          )}
          <button className="primary-action" type="button" onClick={openCompose}>
            <Megaphone size={18} />
            新建通用通知
          </button>
        </div>

        <div className="panel notice-ledger-stats">
          <StatInline label="全部通知" value={publishRecords.length} />
          <StatInline label="已分发" value={distributedCount} />
          <StatInline label="待确认" value={pendingCount} />
          <StatInline label="草稿" value={draftCount} />
        </div>

        <div className="panel notice-records-panel">
          <PanelTitle title="通知台账" />
          <div className="notice-record-list">
            {publishRecords.map((item) => (
              <button className="notice-record-row" type="button" key={item.id} onClick={openCompose}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.id} · {item.time} · {item.audience}</span>
                </div>
                <small>{item.channels.join(' / ')}</small>
                <StatusLabel status={item.status} />
              </button>
            ))}
          </div>
        </div>

        <div className="panel notice-channel-overview">
          <PanelTitle title="常用发布渠道" />
          {[
            ['政务号', '适合正式公告、可归档版本', '已接入'],
            ['社区群', '适合居民提醒、志愿者协同', '需人工确认'],
            ['短信', '适合重点楼栋和紧急触达', '批量模拟'],
          ].map(([title, desc, status]) => (
            <div className="channel-overview-row" key={title}>
              <strong>{title}</strong>
              <span>{desc}</span>
              <b>{status}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function NoticeWorkbench({
  topic,
  setTopic,
  notice,
  generateNotice,
  copyText,
  copied,
  selectedChannels,
  toggleChannel,
  publishNotice,
  publishRecords,
  tickets,
  sourceTicket,
}: {
  topic: string
  setTopic: (value: string) => void
  notice: NoticeDraft
  generateNotice: () => void
  copyText: (key: string, text: string) => void
  copied: string
  selectedChannels: NoticeChannel[]
  toggleChannel: (channel: NoticeChannel) => void
  publishNotice: () => void
  publishRecords: PublishRecord[]
  tickets: Ticket[]
  sourceTicket?: Ticket
}) {
  const impacted = tickets.filter((ticket) => ticket.urgency === '高紧急').length
  const activeTicket = sourceTicket || tickets.find((ticket) => ticket.urgency === '高紧急') || tickets[0]
  const coreStatement = activeTicket
    ? `关于${activeTicket.location}${activeTicket.category}事项的通知。${activeTicket.summary} 请相关居民留意社区后续安排，重点人群可联系网格员获取协助。`
    : `关于${topic}的社区通知。请居民留意社区后续安排，如需帮助可联系网格员或物业。`
  const selectedChannelText = selectedChannels.length > 0 ? selectedChannels.join(' / ') : '暂未选择渠道'

  return (
    <>
      <section className="notice-workbench">
        <aside className="panel notice-context-panel">
          <PanelTitle title={activeTicket ? '工单背景' : '通用通知'} action={activeTicket?.id || '新建'} />
          {activeTicket && (
            <>
              <div className="notice-source-card">
                <div>
                  <span>事件位置</span>
                  <strong>{activeTicket.location}</strong>
                </div>
                <div>
                  <span>事项类型</span>
                  <strong>{activeTicket.category}</strong>
                </div>
                <div>
                  <span>建议部门</span>
                  <strong>{activeTicket.department}</strong>
                </div>
                <p>{activeTicket.content}</p>
              </div>
              <div className="notice-scene-image">
                <span>现场核查图</span>
              </div>
            </>
          )}
          <div className="ai-strategy-card">
            <Bot size={18} />
            <div>
              <strong>AI 策略洞察</strong>
              <p>监测到 {impacted || 3} 个高优先级事项，建议在社区群补充“重点人群协助”说明，并同步短信触达重点楼栋。</p>
              <button type="button">采纳并添加附件</button>
            </div>
          </div>
        </aside>

        <div className="notice-main-column">
          <section className="panel notice-editor">
            <div className="notice-editor-heading">
              <div>
                <PanelTitle title="通知核心口径" />
                <p>先统一事实、影响范围和协助方式，再由 AI 适配不同渠道。</p>
              </div>
              <button className="primary-action" type="button" onClick={generateNotice}>
                <Sparkles size={18} />
                AI 重新润色所有渠道
              </button>
            </div>
            <label>
              通知标题
              <input value={topic} onChange={(event) => setTopic(event.target.value)} />
            </label>
            <label>
              发布口径
              <textarea defaultValue={coreStatement} rows={6} />
            </label>
          </section>

          <section className="notice-channel-cards">
            <NoticeChannelCard
              title="官方政务模板"
              channel="工作群"
              icon={<FileText size={18} />}
              tone="正式、完整、可归档"
              text={notice.formal}
              action="发布政务号"
              selected={selectedChannels.includes('工作群')}
              onToggle={() => toggleChannel('工作群')}
              onCopy={() => copyText('formal', notice.formal)}
              copied={copied === 'formal'}
              onPublish={publishNotice}
            />
            <NoticeChannelCard
              title="社群服务模板"
              channel="社区群"
              icon={<MessageSquareText size={18} />}
              tone="温和、易转发、带协助说明"
              text={notice.friendly}
              action="推送到群聊"
              selected={selectedChannels.includes('社区群')}
              onToggle={() => toggleChannel('社区群')}
              onCopy={() => copyText('friendly', notice.friendly)}
              copied={copied === 'friendly'}
              onPublish={publishNotice}
            />
            <NoticeChannelCard
              title="精简短信模板"
              channel="短信"
              icon={<Smartphone size={18} />}
              tone="短句、时间优先、重点触达"
              text={notice.sms}
              action="批量发送"
              selected={selectedChannels.includes('短信')}
              onToggle={() => toggleChannel('短信')}
              onCopy={() => copyText('sms', notice.sms)}
              copied={copied === 'sms'}
              onPublish={publishNotice}
            />
          </section>

          <section className="panel notice-release-bar">
            <div className="release-summary">
              <strong>发布前确认</strong>
              <p>已选择 {selectedChannels.length} 个渠道：{selectedChannelText}</p>
              <p>目标受众：{impacted > 0 ? '高风险楼栋、社区工作群与重点居民' : '全体居民'} · 操作人：张建国 · 发布后写入通知台账</p>
            </div>
            <div className="release-actions">
              <button type="button">存为待定草稿</button>
              <button className="primary" type="button" onClick={publishNotice}>
                <Send size={18} />
                一键全渠道发布
              </button>
            </div>
          </section>
        </div>

        <aside className="panel publish-preview">
          <PanelTitle title="发布记录" />
          <div className="audience-box">
            <span>目标受众</span>
            <strong>{impacted > 0 ? '高风险楼栋、社区工作群与重点居民' : '全体居民'}</strong>
          </div>
          {publishRecords.map((item) => (
            <div className="history-item" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.id} · {item.time}</span>
              <small>{item.channels.join(' / ')}</small>
              <StatusLabel status={item.status} />
            </div>
          ))}
          <div className="notice-audit-card">
            <CheckCircle2 size={18} />
            <span>已保留生成口径、分发渠道和人工确认记录。</span>
          </div>
        </aside>
      </section>
    </>
  )
}

function NoticeChannelCard({
  title,
  channel,
  icon,
  tone,
  text,
  action,
  selected,
  onToggle,
  onCopy,
  copied,
  onPublish,
}: {
  title: string
  channel: NoticeChannel
  icon: ReactNode
  tone: string
  text: string
  action: string
  selected: boolean
  onToggle: () => void
  onCopy: () => void
  copied: boolean
  onPublish: () => void
}) {
  return (
    <article className={`notice-channel-card ${selected ? 'selected' : ''}`}>
      <div className="notice-channel-head">
        <span>{icon}</span>
        <div>
          <strong>{title}</strong>
          <small>{tone}</small>
        </div>
        <button type="button" onClick={onToggle}>{selected ? '已选择' : '选择'}</button>
      </div>
      <div className="notice-channel-body">
        <p>{text}</p>
      </div>
      <div className="notice-channel-foot">
        <span>{channel}</span>
        <button type="button" onClick={onCopy}>{copied ? '已复制' : '复制全文'}</button>
        <button className="primary" type="button" onClick={onPublish}>{action}</button>
      </div>
    </article>
  )
}

function Toolbox({ openTool }: { openTool: (tool: ToolKey, topic?: string) => void }) {
  const tools: Array<{
    title: string
    desc: string
    meta: string
    action: string
    icon: typeof Wand2
    tool: ToolKey
    topic: string
  }> = [
    {
      title: 'AI 海报生成器',
      desc: '把停水、检修、安全提醒转成可发布的社区海报文案和视觉草案。',
      meta: '通知转海报',
      action: '生成海报',
      icon: Wand2,
      tool: 'poster',
      topic: '珍惜水资源',
    },
    {
      title: '流程可视化工具',
      desc: '把居民诉求处理步骤整理成清晰流程图，适合汇报和跨部门协同。',
      meta: '流程图表',
      action: '生成流程',
      icon: Grid2X2,
      tool: 'flow',
      topic: '服务流程',
    },
    {
      title: '新媒体发布中心',
      desc: '基于通知主题生成公众号、居民群和短信版本，并进入分发留痕流程。',
      meta: '图文排版',
      action: '进入排版',
      icon: Megaphone,
      tool: 'media',
      topic: '社区健康与安全讲座',
    },
    {
      title: 'AI 宣教视频',
      desc: '生成社区宣教短视频脚本，可用于垃圾分类、安全用电等科普主题。',
      meta: '脚本与分镜',
      action: '生成视频脚本',
      icon: PlayCircle,
      tool: 'video',
      topic: '垃圾分类宣教',
    },
  ]

  return (
    <>
      <PageHeader title="AI 创意工具箱" subtitle="通过专业级创意资产赋能社区治理，将信息指令转化为更清晰、更易传播的社区内容。" />
      <section className="toolbox-grid">
        {tools.map((tool) => (
          <ToolboxCard key={tool.title} {...tool} openTool={openTool} />
        ))}
      </section>
    </>
  )
}

function ToolboxCard({
  title,
  desc,
  meta,
  action,
  icon: Icon,
  tool,
  topic,
  openTool,
}: {
  title: string
  desc: string
  meta: string
  action: string
  icon: typeof Wand2
  tool: ToolKey
  topic: string
  openTool: (tool: ToolKey, topic?: string) => void
}) {
  return (
    <article className="panel toolbox-card">
      <div className="tool-card-icon">
        <Icon size={22} />
      </div>
      <div>
        <span>{meta}</span>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      <button className="primary" type="button" onClick={() => openTool(tool, topic)}>
        {action}
      </button>
    </article>
  )
}

function PilotAnalysis({
  tickets,
  accuracy,
  exportReport,
  copyText,
  copied,
}: {
  tickets: Ticket[]
  accuracy: number
  exportReport: () => void
  copyText: (key: string, text: string) => void
  copied: string
}) {
  const report = buildWeeklyReport(tickets, accuracy)
  return (
    <>
      <PageHeader
        title="试点分析"
        subtitle="社区治理试点运行数据、AI 准确率和高频问题趋势。"
        action={
          <button className="primary" type="button" onClick={exportReport}>
            <FileDown size={16} />
            导出报告
          </button>
        }
      />
      <section className="analysis-grid">
        <div className="panel">
          <PanelTitle title="准确率趋势" />
          <div className="line-chart">
            {[42, 56, 48, 70, 76, 88, 82].map((height, index) => (
              <i style={{ height: `${height}%` }} key={index} />
            ))}
          </div>
        </div>
        <div className="panel">
          <PanelTitle title="高频问题 Top 5" />
          {categoryData.map((item) => (
            <div className="rank-row" key={item.label}>
              <span>{item.label}</span>
              <b>{item.current}</b>
            </div>
          ))}
        </div>
        <div className="panel report-panel">
          <PanelTitle title="周报草稿" action={copied === 'weekly' ? '已复制' : '复制周报'} onAction={() => copyText('weekly', report)} />
          <textarea
            readOnly
            value={report}
          />
        </div>
      </section>
    </>
  )
}

function SettingsView({
  onLogout,
  settings,
  updateSettings,
  exportTickets,
  role,
  switchRole,
}: {
  onLogout: () => void
  settings: SettingsState
  updateSettings: (next: Partial<SettingsState>) => void
  exportTickets: () => void
  role: UserRole
  switchRole: () => void
}) {
  return (
    <>
      <PageHeader title="系统设置" subtitle="配置您的个人偏好、AI 智能助手及账户安全选项。" />
      <section className="settings-grid">
        <div className="panel profile-panel">
          <PanelTitle title="个人资料" />
          <div className="profile-fields">
            <Field label="姓名" value="张建国" />
            <Field label="工号" value="TJ-9527334" />
            <Field label="手机号码" value="138 **** 8888" action="修改" />
            <Field label="工作邮箱" value="zhang.jg@tj.gov.cn" action="验证" />
          </div>
        </div>
        <div className="account-status">
          <h2>账户状态</h2>
          <p><ShieldCheck size={16} /> 正式授权用户</p>
          <div><span>最近登录</span><strong>2023-11-24 09:15:22</strong></div>
          <div><span>当前角色</span><strong>{role}</strong></div>
          <div><span>所属部门</span><strong>南开区街道管理处</strong></div>
        </div>
        <div className="panel ai-preferences">
          <PanelTitle title="AI 智能偏好" />
          <Preference
            title="自动生成摘要"
            desc="工单处理完成后，AI 将自动生成处理简报与待办建议。"
            enabled={settings.autoSummary}
            onToggle={() => updateSettings({ autoSummary: !settings.autoSummary })}
          />
          <Preference
            title="情绪风险预警"
            desc="实时监测过激内容并在可能发生冲突时发出预警。"
            enabled={settings.emotionAlert}
            onToggle={() => updateSettings({ emotionAlert: !settings.emotionAlert })}
          />
          <Preference
            title="语言模型优化"
            desc={settings.dialectMode ? '天津话（地道方言版）' : '普通话政务表达版'}
            enabled={settings.dialectMode}
            onToggle={() => updateSettings({ dialectMode: !settings.dialectMode })}
          />
        </div>
        <div className="panel privacy-panel">
          <PanelTitle title="账户安全与隐私" />
          <div className="export-row">
            <span>下载您的历史工单、分析报告及操作日志。</span>
            <button type="button" onClick={exportTickets}>立即导出</button>
          </div>
          <Preference
            title="二次身份验证"
            desc="登录或修改敏感设置时，模拟通过手机验证码确认。"
            enabled={settings.twoFactor}
            onToggle={() => updateSettings({ twoFactor: !settings.twoFactor })}
            icon={<LockKeyhole size={18} />}
          />
          <Preference
            title="本地保留处理记录"
            desc="在浏览器本地保留演示工单、复核状态和导入数据。"
            enabled={settings.retainLocalRecords}
            onToggle={() => updateSettings({ retainLocalRecords: !settings.retainLocalRecords })}
            icon={<Database size={18} />}
          />
        </div>
        <div className="danger-panel">
          <PanelTitle title="危险操作" />
          <p>注销账户将永久清除您的个人偏好和历史分析数据。此操作无法撤销。</p>
          <div>
            <button type="button" onClick={switchRole}>
              <Users size={16} />
              切换角色
            </button>
            <button type="button" onClick={onLogout}>注销账户</button>
          </div>
        </div>
      </section>
    </>
  )
}

function HelpCenter({ setActiveView }: { setActiveView: (view: ViewKey) => void }) {
  return (
    <>
      <PageHeader
        title="今天我们能为您提供什么帮助？"
        subtitle="围绕工单预处理、通知分发、创意工具和试点数据留痕提供操作指引。"
      />
      <section className="help-search panel">
        <Search size={20} />
        <input defaultValue="" placeholder="搜索帮助、流程或常见问题" />
        <button className="primary" type="button">搜索帮助</button>
      </section>
      <section className="help-grid">
        {[
          { title: '工单 AI 预处理', desc: '从居民诉求到分类、紧急度、部门建议和人工复核的完整流程。', icon: ClipboardList, view: 'tickets' as const },
          { title: '通知推送说明', desc: '掌握正式版、居民群版、短信版的生成和分发留痕方式。', icon: Send, view: 'notice' as const },
          { title: 'AI 海报与宣教视频', desc: '把社区通知转化为海报、流程图和短视频脚本。', icon: Wand2, view: 'toolbox' as const },
          { title: '数据导出与试点周报', desc: '导出 CSV、复制周报草稿，并形成比赛证据链。', icon: FileDown, view: 'analysis' as const },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button className="help-card" type="button" key={item.title} onClick={() => setActiveView(item.view)}>
              <Icon size={22} />
              <strong>{item.title}</strong>
              <span>{item.desc}</span>
            </button>
          )
        })}
      </section>
      <section className="help-columns">
        <div className="panel">
          <PanelTitle title="常见问题" />
          {[
            '如何使用 AI 助手自动分类待办事项？',
            '导入 CSV 后为什么要先做脱敏确认？',
            '通知分发记录会保存在哪里？',
            '比赛演示时如何快速展示准确率证据？',
          ].map((item) => (
            <div className="faq-row" key={item}>
              <CheckCircle2 size={17} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <PanelTitle title="快速上手路径" />
          <ol className="help-steps">
            <li>导入或打开一条居民诉求</li>
            <li>查看 AI 分类、紧急度和部门建议</li>
            <li>人工复核并形成处置建议</li>
            <li>生成通知，选择渠道并分发留痕</li>
            <li>导出周报或工单 CSV</li>
          </ol>
          <button className="primary-action" type="button" onClick={() => setActiveView('tickets')}>
            <PlayCircle size={18} />
            开始演示流程
          </button>
        </div>
      </section>
    </>
  )
}

function TicketDrawer({
  ticket,
  updateTicket,
  completeTicket,
  close,
  openNotice,
}: {
  ticket: Ticket
  updateTicket: (next: Partial<Ticket>) => void
  completeTicket: (nextStatus: TicketStatus) => void
  close: () => void
  openNotice: () => void
}) {
  return (
    <div className="drawer-backdrop modal-backdrop">
      <aside className="drawer large modal-panel ticket-modal">
        <DrawerHeader title="工单 AI 预处理" subtitle={ticket.id} close={close} />
        <div className="modal-scroll-content">
          <div className="drawer-grid">
            <section className="panel">
              <PanelTitle title="原始诉求" />
              <p className="ticket-location">{ticket.location}</p>
              <textarea value={ticket.content} onChange={(event) => updateTicket({ content: event.target.value })} />
            </section>
            <section className="panel">
              <PanelTitle title="AI 分析结果" />
              <div className="analysis-tags">
                <Badge type={ticket.urgency}>{ticket.urgency}</Badge>
                <StatusBadge status={ticket.status} />
                <span>{ticket.emotion}</span>
                {ticket.review && <span>{ticket.review}</span>}
              </div>
              <label>
                AI 分类
                <input value={ticket.category} onChange={(event) => updateTicket({ category: event.target.value })} />
              </label>
              <label>
                建议部门
                <input value={ticket.department} onChange={(event) => updateTicket({ department: event.target.value })} />
              </label>
              <label>
                处理摘要
                <textarea value={ticket.summary} onChange={(event) => updateTicket({ summary: event.target.value })} />
              </label>
            </section>
          </div>
          <section className="panel timeline-panel">
            <PanelTitle title="处理动作" />
            <div className="action-sections">
              <div className="action-section review-actions">
                <span>复核结论</span>
                <div className="action-grid">
                  <button type="button" onClick={() => updateTicket({ status: '待人工复核', review: '待复核' })}>标记待复核</button>
                  <button type="button" onClick={() => updateTicket({ status: '已形成建议', review: '正确' })}>复核正确</button>
                  <button type="button" onClick={() => updateTicket({ status: '待人工复核', review: '需调整' })}>标记需调整</button>
                </div>
              </div>
              <div className="action-section next-actions">
                <span>后续动作</span>
                <div className="action-grid">
                  <button className="primary" type="button" onClick={() => completeTicket('已形成建议')}>保存处置建议</button>
                  <button className="secondary-action" type="button" onClick={openNotice}>生成居民通知</button>
                </div>
              </div>
              <div className="action-section archive-actions">
                <span>完成处理</span>
                <button className="archive-action" type="button" onClick={() => completeTicket('已归档')}>归档工单</button>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}

function NoticeDrawer({
  topic,
  setTopic,
  notice,
  generateNotice,
  copyText,
  copied,
  close,
  selectedChannels,
  toggleChannel,
  publishNotice,
  publishRecords,
  tickets,
  sourceTicket,
  backToTicket,
}: {
  topic: string
  setTopic: (topic: string) => void
  notice: NoticeDraft
  generateNotice: (topic?: string) => void
  copyText: (key: string, text: string) => void
  copied: string
  close: () => void
  selectedChannels: NoticeChannel[]
  toggleChannel: (channel: NoticeChannel) => void
  publishNotice: () => void
  publishRecords: PublishRecord[]
  tickets: Ticket[]
  sourceTicket?: Ticket
  backToTicket?: () => void
}) {
  return (
    <div className="drawer-backdrop modal-backdrop">
      <aside className="drawer modal-panel notice-modal notice-workbench-modal">
        {backToTicket && (
          <div className="modal-action-bar">
            <button className="back-button" type="button" onClick={backToTicket}>
              返回工单
            </button>
            <button className="modal-close-button" type="button" onClick={close} aria-label="关闭">
              <X size={18} />
            </button>
          </div>
        )}
        {backToTicket && (
          <div className="drawer-title-block">
            <h2>通知发布工作台</h2>
            <p>已带入 {sourceTicket?.id} 工单上下文，可编辑口径后分渠道发布。</p>
          </div>
        )}
        {!backToTicket && <DrawerHeader title="通知发布工作台" subtitle="通用通知 / 渠道预览 / 发布留痕" close={close} />}
        <div className="modal-scroll-content notice-workbench-scroll">
          <NoticeWorkbench
            topic={topic}
            setTopic={setTopic}
            notice={notice}
            generateNotice={() => generateNotice(topic)}
            copyText={copyText}
            copied={copied}
            selectedChannels={selectedChannels}
            toggleChannel={toggleChannel}
            publishNotice={publishNotice}
            publishRecords={publishRecords}
            tickets={tickets}
            sourceTicket={sourceTicket}
          />
        </div>
      </aside>
    </div>
  )
}

function ToolDrawer({
  type,
  topic,
  setTopic,
  output,
  setOutput,
  copyText,
  copied,
  close,
}: {
  type: ToolKey
  topic: string
  setTopic: (topic: string) => void
  output: string
  setOutput: (value: string) => void
  copyText: (key: string, text: string) => void
  copied: string
  close: () => void
}) {
  const title =
    type === 'poster'
      ? 'AI Poster Generator'
      : type === 'video'
        ? 'AI Video Creation'
        : type === 'media'
          ? '新媒体排版中心'
          : '流程可视化工具'
  const subtitle =
    type === 'poster'
      ? 'Powered by Jinzhi Assistant 1.4.2'
      : type === 'video'
        ? 'Jinzhi Assistant Toolbox · Intelligent Synthesis'
        : type === 'media'
          ? 'Smart Community Notice'
          : '可复制或下载继续编辑'

  return (
    <div className="drawer-backdrop modal-backdrop">
      <aside className={`drawer modal-panel tool-modal tool-modal-${type}`}>
        <DrawerHeader title={title} subtitle={subtitle} close={close} />
        <div className="modal-scroll-content tool-modal-content">
          {type === 'poster' && (
            <PosterToolModal
              topic={topic}
              setTopic={setTopic}
              output={output}
              setOutput={setOutput}
              copyText={copyText}
              copied={copied}
            />
          )}
          {type === 'video' && (
            <VideoToolModal topic={topic} setTopic={setTopic} output={output} setOutput={setOutput} />
          )}
          {type === 'media' && (
            <MediaToolModal
              topic={topic}
              setTopic={setTopic}
              output={output}
              setOutput={setOutput}
              copyText={copyText}
              copied={copied}
            />
          )}
          {type === 'flow' && (
            <FlowToolModal
              topic={topic}
              setTopic={setTopic}
              output={output}
              setOutput={setOutput}
              copyText={copyText}
              copied={copied}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

function PosterToolModal({
  topic,
  setTopic,
  output,
  setOutput,
  copyText,
  copied,
}: {
  topic: string
  setTopic: (topic: string) => void
  output: string
  setOutput: (value: string) => void
  copyText: (key: string, text: string) => void
  copied: string
}) {
  const posterText = output || 'District Water Authority Notice: Due to ongoing drought conditions in the northern sector, residents are advised to reduce non-essential water usage.'

  return (
    <>
      <section className="poster-modal-grid">
        <div className="tool-side-panel">
          <label>
            Poster Title
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>
          <label>
            Content Input
            <textarea value={posterText} onChange={(event) => setOutput(event.target.value)} rows={7} />
          </label>
          <div className="tool-field-group">
            <span>Poster Style</span>
            {['Modern', 'Traditional', 'Minimalist'].map((item) => (
              <button className={item === 'Modern' ? 'selected' : ''} type="button" key={item}>
                {item}
              </button>
            ))}
          </div>
          <div className="tool-field-group compact">
            <span>Dimensions</span>
            <div>
              <button type="button">Mobile Story</button>
              <button className="selected" type="button">Square (1:1)</button>
              <button type="button">Banner</button>
            </div>
          </div>
        </div>
        <div className="poster-preview-stage">
          <div className="poster-art">
            <div className="water-drop">
              <span />
            </div>
            <strong>{topic}</strong>
            <p>节约用水，从每一次提醒开始。</p>
          </div>
          <span>Previewing at 1080 x 1080</span>
        </div>
        <div className="tool-side-panel refine-panel">
          <p className="tool-kicker">AI Refinement</p>
          {[
            ['Change Theme Color', 'Update palette intelligently'],
            ['Regenerate Layout', 'Try a different composition'],
            ['Edit Text Overlays', 'Adjust font and placement'],
          ].map(([title, desc]) => (
            <button type="button" key={title}>
              <strong>{title}</strong>
              <span>{desc}</span>
            </button>
          ))}
          <div className="palette-row">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="ai-note">
            <strong>AI Note:</strong> 已为“节水提醒”匹配冷静蓝色调，提升公共服务信息的可信度。
          </div>
        </div>
      </section>
      <div className="tool-modal-footer">
        <button type="button">Undo</button>
        <button type="button">Redo</button>
        <span />
        <button type="button" onClick={() => copyText('tool', posterText)}>{copied === 'tool' ? '已复制' : 'Save to Drafts'}</button>
        <button className="primary" type="button" onClick={() => downloadText(`${topic}-poster.txt`, posterText)}>Download Image</button>
      </div>
    </>
  )
}

function VideoToolModal({
  topic,
  setTopic,
  output,
  setOutput,
}: {
  topic: string
  setTopic: (topic: string) => void
  output: string
  setOutput: (value: string) => void
}) {
  return (
    <>
      <section className="video-modal-grid">
        <div className="tool-side-panel">
          <label>
            Script Input
            <textarea value={output} onChange={(event) => setOutput(event.target.value)} placeholder="Type or paste your video script here..." rows={7} />
          </label>
          <div className="tool-counter-row">
            <span>{output.length}/3000 characters</span>
            <button type="button">AI Polish</button>
          </div>
          <div className="tool-field-group">
            <span>AI Voiceover Selection</span>
            {['Professional (Female)', 'Warm (Female)', 'Authoritative (Male)', 'Professional (Male)'].map((item, index) => (
              <button className={index === 0 ? 'selected' : ''} type="button" key={item}>
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="video-preview-panel">
          <div className="video-preview">
            <div className="skyline" />
            <strong>"{topic} 正在生成智能宣教视频..."</strong>
            <span>PREVIEW ONLY</span>
          </div>
          <div className="asset-library">
            <div>
              <p className="tool-kicker">Asset Library</p>
              <button type="button">Upload</button>
              <button type="button">Stock Footage</button>
            </div>
            <div className="asset-strip">
              <i className="selected" />
              <i />
              <i />
              <i />
              <button type="button">+</button>
            </div>
          </div>
        </div>
      </section>
      <div className="render-row">
        <span>Rendering Progress</span>
        <div><i style={{ width: '0%' }} /></div>
        <b>0%</b>
      </div>
      <div className="tool-modal-footer">
        <span />
        <button type="button">Save Draft</button>
        <button className="primary" type="button" onClick={() => setTopic(topic || '社区宣教视频')}>Generate & Render</button>
      </div>
    </>
  )
}

function MediaToolModal({
  topic,
  setTopic,
  output,
  setOutput,
  copyText,
  copied,
}: {
  topic: string
  setTopic: (topic: string) => void
  output: string
  setOutput: (value: string) => void
  copyText: (key: string, text: string) => void
  copied: string
}) {
  return (
    <>
      <section className="media-modal-grid">
        <div className="media-editor">
          <div className="ai-polish-row">
            <button type="button">One-click AI Polish</button>
            <span>Selected content: 124 words</span>
          </div>
          <div className="tone-row">
            {['Official Tone', 'Friendly Tone', 'Concise Version', 'AI Poster Tool'].map((item) => (
              <button className={item === 'AI Poster Tool' ? 'selected' : ''} type="button" key={item}>{item}</button>
            ))}
          </div>
          <div className="editor-toolbar">
            {['B', 'I', 'U', '≡', '•', '🔗'].map((item) => (
              <button type="button" key={item}>{item}</button>
            ))}
          </div>
          <label>
            文章标题
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>
          <textarea value={output} onChange={(event) => setOutput(event.target.value)} rows={9} />
          <div className="media-inline-image">
            <span>Generated by AI Poster Tool</span>
          </div>
        </div>
        <div className="platform-preview">
          <div className="preview-heading">
            <span>Platform Preview</span>
            <b>WeChat Official</b>
          </div>
          <div className="wechat-phone">
            <div className="phone-top" />
            <strong>{topic || 'Notice: Community Health & Wellness Seminar'}</strong>
            <small>2023-10-18 · GridConnect Authority</small>
            <div className="phone-card-art" />
            <p>{output.slice(0, 150)}...</p>
            <em>Read More</em>
          </div>
        </div>
      </section>
      <div className="tool-modal-footer">
        <label className="footer-check"><input type="checkbox" /> Immediate Release</label>
        <label className="footer-check"><input type="checkbox" /> Sync to District Portal</label>
        <span />
        <button type="button" onClick={() => copyText('tool', output)}>{copied === 'tool' ? '已复制' : 'Save Draft'}</button>
        <button className="primary" type="button">Publish to Official Account</button>
      </div>
    </>
  )
}

function FlowToolModal({
  topic,
  setTopic,
  output,
  setOutput,
  copyText,
  copied,
}: {
  topic: string
  setTopic: (topic: string) => void
  output: string
  setOutput: (value: string) => void
  copyText: (key: string, text: string) => void
  copied: string
}) {
  return (
    <>
      <label>
        主题
        <input value={topic} onChange={(event) => setTopic(event.target.value)} />
      </label>
      <ol className="flow-steps">
        <li><strong>居民诉求登记</strong><span>通过统一入口核实居民信息</span></li>
        <li><strong>服务清单提取</strong><span>自动整理需要协同的部门与材料</span></li>
        <li><strong>相关机构协同</strong><span>等待区级审批确认中</span></li>
      </ol>
      <textarea value={output} onChange={(event) => setOutput(event.target.value)} rows={8} />
      <div className="drawer-actions">
        <button type="button" onClick={() => copyText('tool', output)}>
          {copied === 'tool' ? '已复制' : '复制内容'}
        </button>
        <button className="primary" type="button" onClick={() => downloadText(`${topic}.txt`, output)}>
          下载
        </button>
      </div>
    </>
  )
}

function AssistantDrawer({
  urgentCount,
  close,
  openTickets,
}: {
  urgentCount: number
  close: () => void
  openTickets: () => void
}) {
  return (
    <div className="drawer-backdrop">
      <aside className="drawer assistant">
        <DrawerHeader title="津智 AI 助手" subtitle="正在分析您的工作流" close={close} />
        <p>您好，王管理员。系统检测到 {urgentCount} 个紧急工单需要您优先处理。</p>
        <button className="primary-action" type="button" onClick={openTickets}>立即查看</button>
      </aside>
    </div>
  )
}

function AdvancedFilterDrawer({
  filter,
  setFilter,
  close,
}: {
  filter: '全部' | '高紧急度' | '待审核'
  setFilter: (filter: '全部' | '高紧急度' | '待审核') => void
  close: () => void
}) {
  const options: Array<{ label: '全部' | '高紧急度' | '待审核'; desc: string; icon: ReactNode }> = [
    { label: '全部', desc: '保留当前全量工单视图', icon: <ClipboardList size={18} /> },
    { label: '高紧急度', desc: '优先排查夜间照明、电梯停运等高风险事项', icon: <AlertTriangle size={18} /> },
    { label: '待审核', desc: '聚焦需要人工复核的 AI 分类与处置建议', icon: <ShieldCheck size={18} /> },
  ]

  return (
    <div className="drawer-backdrop modal-backdrop">
      <aside className="drawer modal-panel filter-modal">
        <DrawerHeader title="工单高级筛选" subtitle="按 Stitch 筛选稿补齐的二级筛选入口" close={close} />
        <div className="modal-scroll-content">
          <section className="filter-summary">
            <div>
              <SlidersHorizontal size={22} />
              <span>当前筛选</span>
              <strong>{filter}</strong>
            </div>
            <p>筛选不会改变原始工单，仅调整演示台账的聚焦范围，便于比赛现场快速切换“风险优先”和“待复核”视角。</p>
          </section>
          <section className="filter-option-grid">
            {options.map((item) => (
              <button
                className={filter === item.label ? 'selected' : ''}
                type="button"
                key={item.label}
                onClick={() => setFilter(item.label)}
              >
                {item.icon}
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </section>
          <section className="panel filter-section">
            <PanelTitle title="组合条件" />
            <div className="filter-fields">
              <label>
                工单来源
                <input value="居民热线 / 社区群 / 物业上报" readOnly />
              </label>
              <label>
                所属片区
                <input value="南开区示范街道 · 北苑 / 幸福小区" readOnly />
              </label>
              <label>
                时间范围
                <input value="近 72 小时" readOnly />
              </label>
              <label>
                AI 置信度
                <input value="≥ 85%，低置信自动进入人工复核" readOnly />
              </label>
            </div>
          </section>
          <div className="drawer-actions">
            <button type="button" onClick={() => setFilter('全部')}>重置</button>
            <button className="primary" type="button" onClick={close}>应用筛选</button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function JudgementDrawer({
  tickets,
  accuracy,
  close,
  openHotspotReport,
  goTickets,
}: {
  tickets: Ticket[]
  accuracy: number
  close: () => void
  openHotspotReport: () => void
  goTickets: () => void
}) {
  const urgent = tickets.filter((ticket) => ticket.urgency === '高紧急')

  return (
    <div className="drawer-backdrop modal-backdrop">
      <aside className="drawer modal-panel insight-modal">
        <DrawerHeader title="研判分析详情" subtitle="北苑环境报修异常增长 · AI 趋势研判" close={close} />
        <div className="modal-scroll-content">
          <section className="insight-hero panel">
            <div>
              <p className="breadcrumb">AI 智能预警</p>
              <h2>北苑社区环境类诉求 72 小时内增长 30%</h2>
              <p>系统将相似文本、空间点位、处理时段和居民情绪合并研判，判断为“清运频次不足 + 高温异味放大”的短期热点。</p>
            </div>
            <div className="insight-score">
              <span>置信度</span>
              <strong>{accuracy}%</strong>
              <b>建议立即复核</b>
            </div>
          </section>
          <section className="insight-grid">
            <div className="panel">
              <PanelTitle title="风险证据" />
              <div className="evidence-list">
                <div><MapPinned size={18} /><span>集中点位</span><strong>北苑南门、中心街 3 号周边</strong></div>
                <div><CalendarClock size={18} /><span>高发时段</span><strong>18:00 - 23:00</strong></div>
                <div><MessageSquareText size={18} /><span>情绪变化</span><strong>不满、焦虑类表述上升</strong></div>
              </div>
            </div>
            <div className="panel">
              <PanelTitle title="建议动作" />
              <ol className="help-steps">
                <li>将 {urgent.length || 2} 条高紧急工单置顶复核</li>
                <li>通知物业保洁组补充现场照片</li>
                <li>生成居民群提醒，说明清运安排和反馈入口</li>
                <li>在试点周报中记录处置前后变化</li>
              </ol>
            </div>
          </section>
          <section className="panel trend-panel">
            <PanelTitle title="趋势切片" />
            <div className="micro-bars">
              {[32, 42, 38, 58, 70, 82, 88, 76].map((height, index) => (
                <i style={{ height: `${height}%` }} key={index} />
              ))}
            </div>
          </section>
          <div className="drawer-actions">
            <button type="button" onClick={goTickets}>查看关联工单</button>
            <button className="primary" type="button" onClick={openHotspotReport}>生成专题报告</button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function HotspotReportDrawer({
  tickets,
  accuracy,
  exportReport,
  close,
}: {
  tickets: Ticket[]
  accuracy: number
  exportReport: () => void
  close: () => void
}) {
  const report = buildWeeklyReport(tickets, accuracy)

  return (
    <div className="drawer-backdrop modal-backdrop">
      <aside className="drawer modal-panel report-modal">
        <DrawerHeader title="热点专题分析报告" subtitle="供暖系统异常波动 / 社区治理专题稿" close={close} />
        <div className="modal-scroll-content">
          <section className="report-cover panel">
            <div>
              <p className="breadcrumb">专题报告</p>
              <h2>西区供暖诉求异常波动</h2>
              <p>过去 2 小时内出现 12 起相似投诉，建议同步物业、热力站与网格员形成联合核查闭环。</p>
            </div>
            <Target size={44} />
          </section>
          <section className="report-section-grid">
            <article className="panel">
              <span>影响范围</span>
              <strong>3 个楼栋 / 约 420 户</strong>
              <p>重点关注老人、儿童及低温敏感住户，优先安排电话回访。</p>
            </article>
            <article className="panel">
              <span>处置窗口</span>
              <strong>2 小时内完成首轮核实</strong>
              <p>报告生成后自动附带通知口径，可直接进入通知发布工作台。</p>
            </article>
            <article className="panel">
              <span>证据链</span>
              <strong>工单、趋势、复核结果</strong>
              <p>适合用于试点复盘和比赛材料中的“真实场景闭环”说明。</p>
            </article>
          </section>
          <section className="panel report-panel">
            <PanelTitle title="可导出的报告草稿" />
            <textarea readOnly value={report} />
          </section>
          <div className="drawer-actions">
            <button type="button" onClick={close}>稍后处理</button>
            <button className="primary" type="button" onClick={exportReport}>
              <FileDown size={16} />
              导出报告
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function DrawerHeader({ title, subtitle, close }: { title: string; subtitle?: string; close: () => void }) {
  return (
    <div className="drawer-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button type="button" onClick={close} aria-label="关闭">
        <X size={18} />
      </button>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  trend,
  hint,
  badge,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  trend?: string
  hint?: string
  badge?: string
  tone?: 'danger' | 'ai'
}) {
  return (
    <article className={`stat-card ${tone || ''}`}>
      <div>
        <span className="stat-icon">{icon}</span>
        {trend && <b>{trend}</b>}
        {badge && <em>{badge}</em>}
        {hint && <small>{hint}</small>}
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}

function StatInline({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-inline">
      <Grid2X2 size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PanelTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {action && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  )
}

function BarChart() {
  return (
    <div className="bar-chart">
      {categoryData.map((item) => (
        <div className="bar-group" key={item.label}>
          <div>
            <i style={{ height: item.previous }} />
            <b style={{ height: item.current }} />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function MiniTable({ tickets, openTicket }: { tickets: Ticket[]; openTicket: (ticket: Ticket) => void }) {
  return (
    <div className="mini-table">
      {tickets.map((ticket) => (
        <button type="button" key={ticket.id} onClick={() => openTicket(ticket)}>
          <span>{ticket.id}</span>
          <span>{ticket.category}</span>
          <span>{ticket.content}</span>
          <StatusBadge status={ticket.status} />
          <Badge type={ticket.urgency}>{ticket.urgency}</Badge>
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`status-badge status-${status}`}>{status}</span>
}

function StatusLabel({ status }: { status: PublishRecord['status'] }) {
  return <span className={`status-label status-label-${status}`}>{status}</span>
}

function Badge({ type, children }: { type: Urgency; children: ReactNode }) {
  return <span className={`badge urgency-${type}`}>{children}</span>
}

function Field({ label, value, action }: { label: string; value: string; action?: string }) {
  return (
    <div className="field-display">
      <span>{label}</span>
      <strong>{value}</strong>
      {action && <button type="button">{action}</button>}
    </div>
  )
}

function Preference({
  title,
  desc,
  enabled,
  onToggle,
  icon,
}: {
  title: string
  desc: string
  enabled?: boolean
  onToggle?: () => void
  icon?: ReactNode
}) {
  return (
    <button className="preference" type="button" onClick={onToggle}>
      {icon || <FileText size={18} />}
      <strong>{title}</strong>
      <span>{desc}</span>
      <i className={enabled ? 'on' : ''} />
    </button>
  )
}

function urgencyWeight(urgency: Urgency) {
  return urgency === '高紧急' ? 3 : urgency === '常规' ? 2 : 1
}

function analyzeImportedTicket(rawRow: string, index: number): Ticket {
  const text = extractTicketText(rawRow)
  const category = classifyCategory(text)
  const urgency = classifyUrgency(text)
  const emotion = /投诉|影响|烦|气|危险|隐患|故障|异味/.test(text) ? '不满' : '中性'
  const departmentMap: Record<string, string> = {
    市政设施: '工程维修组',
    社会福利: '民生服务岗',
    环境卫生: '物业保洁组',
    设施报修: '工程维修组',
    矛盾纠纷: '社区调解岗',
    咨询服务: '综合服务窗口',
  }

  return {
    id: `#IMP-${String(index).padStart(3, '0')}`,
    location: inferLocation(text),
    content: text,
    category,
    urgency,
    emotion,
    status: '待人工复核',
    department: departmentMap[category] || '综合服务窗口',
    summary: `${category}类诉求，建议先核实现场情况，再转交${departmentMap[category] || '综合服务窗口'}处理。`,
    source: '批量导入',
    createdAt: new Date().toLocaleString('zh-CN'),
    review: '待复核',
  }
}

function extractTicketText(row: string) {
  const columns = row.split(',').map((item) => item.trim().replace(/^"|"$/g, ''))
  const meaningful = columns.find((item) => item.length > 8 && !/^(text|content|诉求|居民诉求)$/i.test(item))
  return meaningful || row
}

function classifyCategory(text: string) {
  if (/垃圾|保洁|异味|卫生|堆积/.test(text)) return '环境卫生'
  if (/电梯|照明|水管|供暖|维修|故障|路灯|设施/.test(text)) return '设施报修'
  if (/老人|长者|饭堂|补贴|困难|帮扶/.test(text)) return '社会福利'
  if (/吵|噪音|纠纷|邻里|争执/.test(text)) return '矛盾纠纷'
  if (/咨询|办理|证件|材料/.test(text)) return '咨询服务'
  return '市政设施'
}

function classifyUrgency(text: string): Urgency {
  if (/消防|安全|危险|隐患|停运|漏水|老人|儿童|夜间|高空|电/.test(text)) return '高紧急'
  if (/咨询|建议|希望|优化/.test(text)) return '低'
  return '常规'
}

function inferLocation(text: string) {
  const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9]+(?:小区|社区|楼|门|街|路|入口|饭堂|广场))/)
  return match?.[1] || '待核实点位'
}

function maskSensitive(text: string) {
  return text
    .replace(/1[3-9]\d{9}/g, '1**********')
    .replace(/\d{3,4}-?\d{7,8}/g, '***-********')
    .replace(/\d+号楼/g, '**号楼')
    .replace(/\d+号/g, '**号')
    .replace(/[东西南北中]城区/g, '某片区')
}

function ticketsToCsv(tickets: Ticket[]) {
  const header = ['id', 'location', 'content', 'category', 'urgency', 'emotion', 'status', 'department', 'summary', 'review', 'source']
  const rows = tickets.map((ticket) =>
    [
      ticket.id,
      ticket.location,
      ticket.content,
      ticket.category,
      ticket.urgency,
      ticket.emotion,
      ticket.status,
      ticket.department,
      ticket.summary,
      ticket.review || '',
      ticket.source || '演示样例',
    ].map(escapeCsv).join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function buildWeeklyReport(tickets: Ticket[], accuracy: number) {
  const urgent = tickets.filter((ticket) => ticket.urgency === '高紧急').length
  const pending = tickets.filter((ticket) => ticket.status !== '已归档').length
  const topCategories = Array.from(
    tickets.reduce((map, ticket) => map.set(ticket.category, (map.get(ticket.category) || 0) + 1), new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => `${category}${count}件`)
    .join('、')

  return `本周共预处理居民诉求 ${tickets.length} 件，其中高紧急事件 ${urgent} 件，待继续跟进 ${pending} 件。AI 分类复核准确率当前为 ${accuracy}%。高频问题集中在 ${topCategories || '暂无分类数据'}。建议下周优先复核高紧急工单、补充真实脱敏样例，并对重复出现的问题形成专项巡查清单。`
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
    // 演示环境中 localStorage 不可用时不阻断主流程。
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default App
