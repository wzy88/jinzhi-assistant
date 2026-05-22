import { type ReactNode, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Bot,
  Boxes,
  ClipboardList,
  Download,
  FileText,
  Filter,
  Gauge,
  Grid2X2,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Megaphone,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type ViewKey = 'overview' | 'tickets' | 'notice' | 'toolbox' | 'analysis' | 'settings'
type TicketStatus = '待预处理' | '待人工复核' | '已形成建议' | '已归档'
type Urgency = '高紧急' | '常规' | '低'
type DrawerKey = 'ticket' | 'notice' | 'poster' | 'flow' | 'video' | 'assistant' | null

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
}

type NoticeDraft = {
  formal: string
  friendly: string
  sms: string
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

function App() {
  const [isSignedIn, setIsSignedIn] = useState(() => readJson('jinzhi-auth', false))
  const [activeView, setActiveView] = useState<ViewKey>('overview')
  const [tickets, setTickets] = useState<Ticket[]>(ticketsSeed)
  const [selectedTicketId, setSelectedTicketId] = useState(ticketsSeed[0].id)
  const [drawer, setDrawer] = useState<DrawerKey>(null)
  const [noticeTopic, setNoticeTopic] = useState('春季社区安全防范指南')
  const [notice, setNotice] = useState<NoticeDraft>(defaultNotice)
  const [toolOutput, setToolOutput] = useState('')
  const [copied, setCopied] = useState('')

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0]
  const pendingCount = tickets.filter((ticket) => ticket.status !== '已归档').length
  const urgentCount = tickets.filter((ticket) => ticket.urgency === '高紧急').length
  const accuracy = 98

  const sortedTickets = useMemo(
    () => [...tickets].sort((a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency)),
    [tickets],
  )

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
    setDrawer('ticket')
  }

  function updateSelectedTicket(next: Partial<Ticket>) {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, ...next } : ticket)),
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

  function openTool(tool: DrawerKey, topic?: string) {
    if (topic) setNoticeTopic(topic)
    if (tool === 'poster') {
      setToolOutput('已根据通知主题生成社区海报文案与视觉草案，可下载 SVG 或复制文案继续编辑。')
    }
    if (tool === 'flow') {
      setToolOutput('1. 居民上报\n2. AI 识别类别与紧急度\n3. 网格员人工复核\n4. 形成处置建议\n5. 通知居民并归档留痕')
    }
    if (tool === 'video') {
      setToolOutput('虚拟人脚本：居民朋友们好，我是津智助理。今天提醒大家关注春季用电、通风和消防通道安全。')
    }
    setDrawer(tool)
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
          />
        )}
        {activeView === 'tickets' && (
          <TicketsCenter
            tickets={sortedTickets}
            pendingCount={pendingCount}
            accuracy={accuracy}
            openTicket={openTicket}
          />
        )}
        {activeView === 'notice' && (
          <NoticeManager
            noticeTopic={noticeTopic}
            setNoticeTopic={setNoticeTopic}
            notice={notice}
            generateNotice={generateNotice}
            copyText={copyText}
            copied={copied}
            openCompose={() => setDrawer('notice')}
          />
        )}
        {activeView === 'toolbox' && <Toolbox openTool={openTool} />}
        {activeView === 'analysis' && <PilotAnalysis tickets={tickets} />}
        {activeView === 'settings' && <SettingsView onLogout={logout} />}
      </section>

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
        />
      )}
      {(drawer === 'poster' || drawer === 'flow' || drawer === 'video') && (
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
    </main>
  )
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="brand-row">
          <div className="brand-logo">
            <ShieldCheck size={24} />
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
            <ShieldCheck size={20} />
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
        <button type="button">
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
}: {
  pendingCount: number
  urgentCount: number
  accuracy: number
  tickets: Ticket[]
  openTicket: (ticket: Ticket) => void
  openNotice: () => void
}) {
  return (
    <>
      <PageHeader
        title="津智助理 - 试点概览"
        subtitle={`实时社区治理指标与 AI 决策辅助系统，当前待处理工单 ${pendingCount} 件。`}
        action={
          <div className="header-actions">
            <button type="button">过去 30 天</button>
            <button className="primary" type="button">
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
          <button type="button">查看研判分析</button>
        </div>
        <div className="panel table-panel">
          <PanelTitle title="实时工单动态" action="查看全部" />
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
}: {
  tickets: Ticket[]
  pendingCount: number
  accuracy: number
  openTicket: (ticket: Ticket) => void
}) {
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
          <button className="active" type="button">全部</button>
          <button type="button">高紧急度</button>
          <button type="button">待审核</button>
        </div>
        <button className="filter-button" type="button">
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
        </div>
      </section>
      <section className="suggestion-grid">
        <div className="ai-suggestion">
          <h2>AI 智能调度建议</h2>
          <p>系统实时分析显示：建议将 #88291 分配至工程部处理。根据当前网格员地理位置及专业度匹配，预计可缩短响应时间约 15 分钟。</p>
          <button type="button">采纳建议</button>
          <button type="button">查看详情</button>
        </div>
        <div className="panel hotspot-card">
          <p className="breadcrumb">实时热点监测</p>
          <h2>供暖系统异常波动</h2>
          <p>AI 监测到过去 2 小时内西区集中出现 12 起相似供暖投诉。</p>
          <button type="button">生成分析报告</button>
        </div>
      </section>
    </>
  )
}

function NoticeManager({
  noticeTopic,
  setNoticeTopic,
  notice,
  generateNotice,
  copyText,
  copied,
  openCompose,
}: {
  noticeTopic: string
  setNoticeTopic: (value: string) => void
  notice: NoticeDraft
  generateNotice: () => void
  copyText: (key: string, text: string) => void
  copied: string
  openCompose: () => void
}) {
  return (
    <>
      <PageHeader
        title="通知管理"
        subtitle="多渠道通知模板、生成与发布记录"
        action={<button className="primary" type="button" onClick={openCompose}>新建通知</button>}
      />
      <section className="notice-layout">
        <div className="panel notice-editor">
          <PanelTitle title="AI 通知生成器" />
          <label>
            通知主题
            <input value={noticeTopic} onChange={(event) => setNoticeTopic(event.target.value)} />
          </label>
          <button className="primary-action" type="button" onClick={generateNotice}>
            <Sparkles size={18} />
            生成三种版本
          </button>
          <NoticeBlocks notice={notice} copyText={copyText} copied={copied} />
        </div>
        <div className="panel publish-preview">
          <PanelTitle title="发布记录" />
          {['春季社区安全防范指南', '周日停水提醒', '电梯检修通知'].map((item) => (
            <div className="history-item" key={item}>
              <strong>{item}</strong>
              <span>微信公众号 / 居民群 / 短信</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Toolbox({ openTool }: { openTool: (tool: DrawerKey, topic?: string) => void }) {
  return (
    <>
      <PageHeader title="AI 创意工具箱" subtitle="通过专业级创意资产赋能社区治理，将信息指令转化为更清晰、更易传播的社区内容。" />
      <section className="toolbox-grid">
        <div className="panel tool-panel poster">
          <PanelTitle title="AI 海报生成器" />
          <div className="poster-workspace">
            <textarea defaultValue="注意：由于季节性维护，请4区居民在3月1日至5日期间注意节约用水。" />
            <div className="poster-preview-card">
              <span>珍惜水资源</span>
              <div />
              <p>由于供水系统维护，请居民节约用水。</p>
            </div>
          </div>
          <button className="primary" type="button" onClick={() => openTool('poster', '珍惜水资源')}>开始生成</button>
        </div>
        <div className="panel tool-panel flow">
          <PanelTitle title="流程可视化工具" />
          <ol className="flow-steps">
            <li><strong>居民诉求登记</strong><span>通过统一入口核实居民信息</span></li>
            <li><strong>服务清单提取</strong><span>自动整理需要协同的部门与材料</span></li>
            <li><strong>相关机构协同</strong><span>等待区级审批确认中</span></li>
          </ol>
          <button type="button" onClick={() => openTool('flow', '服务流程')}>生成流程图表</button>
        </div>
        <div className="panel tool-panel media">
          <PanelTitle title="新媒体发布中心" />
          <div className="phone-preview">
            <div className="phone-top" />
            <div className="phone-hero" />
            <div className="phone-line long" />
            <div className="phone-line" />
            <div className="phone-line short" />
          </div>
          <button className="primary" type="button" onClick={() => openTool('notice', '春季社区安全防范指南')}>发布至公众号</button>
        </div>
        <div className="panel tool-panel video">
          <PanelTitle title="AI 宣教视频" />
          <div className="script-box">“居民朋友们好！我是您的数字社区助手。今天，让我们一起学习如何更高效地进行厨余垃圾分类...”</div>
          <button type="button" onClick={() => openTool('video', '垃圾分类宣教')}>生成并渲染科普短视频</button>
        </div>
      </section>
    </>
  )
}

function PilotAnalysis({ tickets }: { tickets: Ticket[] }) {
  return (
    <>
      <PageHeader title="试点分析" subtitle="社区治理试点运行数据、AI 准确率和高频问题趋势。" />
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
          <PanelTitle title="周报草稿" />
          <textarea
            readOnly
            value={`本周共预处理居民诉求 ${tickets.length} 类样例，其中高紧急事件 ${tickets.filter((ticket) => ticket.urgency === '高紧急').length} 件。AI 分类准确率稳定在 98% 左右，建议继续补充真实脱敏工单样本。`}
          />
        </div>
      </section>
    </>
  )
}

function SettingsView({ onLogout }: { onLogout: () => void }) {
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
          <div><span>所属部门</span><strong>南开区街道管理处</strong></div>
        </div>
        <div className="panel ai-preferences">
          <PanelTitle title="AI 智能偏好" />
          <Preference title="自动生成摘要" desc="工单处理完成后，AI 将自动生成处理简报与待办建议。" />
          <Preference title="情绪风险预警" desc="实时监测过激内容并在可能发生冲突时发出预警。" />
          <Preference title="语言模型优化" desc="天津话（地道方言版）" enabled />
        </div>
        <div className="panel privacy-panel">
          <PanelTitle title="账户安全与隐私" />
          <div className="export-row">
            <span>下载您的历史工单、分析报告及操作日志。</span>
            <button type="button">立即导出</button>
          </div>
        </div>
        <div className="danger-panel">
          <PanelTitle title="危险操作" />
          <p>注销账户将永久清除您的个人偏好和历史分析数据。此操作无法撤销。</p>
          <div>
            <button type="button">切换角色</button>
            <button type="button" onClick={onLogout}>注销账户</button>
          </div>
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
    <div className="drawer-backdrop">
      <aside className="drawer large">
        <DrawerHeader title="工单 AI 预处理" subtitle={ticket.id} close={close} />
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
          <div className="action-grid">
            <button type="button" onClick={() => completeTicket('待人工复核')}>保存为待复核</button>
            <button type="button" onClick={() => completeTicket('已形成建议')}>保存处置建议</button>
            <button type="button" onClick={openNotice}>生成居民通知</button>
            <button className="primary" type="button" onClick={() => completeTicket('已归档')}>归档工单</button>
          </div>
        </section>
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
}: {
  topic: string
  setTopic: (topic: string) => void
  notice: NoticeDraft
  generateNotice: (topic?: string) => void
  copyText: (key: string, text: string) => void
  copied: string
  close: () => void
}) {
  return (
    <div className="drawer-backdrop">
      <aside className="drawer">
        <DrawerHeader title="多渠道通知生成" subtitle="正式版 / 温馨邻里版 / 短信版" close={close} />
        <label>
          通知主题
          <input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </label>
        <button className="primary-action" type="button" onClick={() => generateNotice(topic)}>
          <Sparkles size={18} />
          重新生成
        </button>
        <NoticeBlocks notice={notice} copyText={copyText} copied={copied} />
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
  type: Exclude<DrawerKey, null | 'ticket' | 'notice' | 'assistant'>
  topic: string
  setTopic: (topic: string) => void
  output: string
  setOutput: (value: string) => void
  copyText: (key: string, text: string) => void
  copied: string
  close: () => void
}) {
  const title = type === 'poster' ? 'AI 图片物料' : type === 'flow' ? '流程可视化工具' : 'AI 宣教视频'
  return (
    <div className="drawer-backdrop">
      <aside className="drawer">
        <DrawerHeader title={title} subtitle="可复制或下载继续编辑" close={close} />
        <label>
          主题
          <input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </label>
        {type === 'poster' && (
          <div className="poster-large">
            <span>社区提示</span>
            <strong>{topic}</strong>
            <p>请居民相互转告，并配合社区与物业现场安排。</p>
          </div>
        )}
        <textarea value={output} onChange={(event) => setOutput(event.target.value)} rows={10} />
        <div className="drawer-actions">
          <button type="button" onClick={() => copyText('tool', output)}>
            {copied === 'tool' ? '已复制' : '复制内容'}
          </button>
          <button className="primary" type="button" onClick={() => downloadText(`${topic}.txt`, output)}>
            下载
          </button>
        </div>
      </aside>
    </div>
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

function NoticeBlocks({
  notice,
  copyText,
  copied,
}: {
  notice: NoticeDraft
  copyText: (key: string, text: string) => void
  copied: string
}) {
  return (
    <div className="notice-blocks">
      {[
        ['formal', '政务公文版', notice.formal],
        ['friendly', '温馨邻里版', notice.friendly],
        ['sms', '精简短信版', notice.sms],
      ].map(([key, title, text]) => (
        <div className="notice-block" key={key}>
          <div>
            <strong>{title}</strong>
            <button type="button" onClick={() => copyText(key, text)}>
              {copied === key ? '已复制' : '复制'}
            </button>
          </div>
          <textarea value={text} readOnly />
        </div>
      ))}
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

function PanelTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {action && <button type="button">{action}</button>}
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

function Preference({ title, desc, enabled }: { title: string; desc: string; enabled?: boolean }) {
  return (
    <div className="preference">
      <FileText size={18} />
      <strong>{title}</strong>
      <span>{desc}</span>
      <i className={enabled ? 'on' : ''} />
    </div>
  )
}

function urgencyWeight(urgency: Urgency) {
  return urgency === '高紧急' ? 3 : urgency === '常规' ? 2 : 1
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
