import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, MapPin, Bell, ChevronRight, Clock3, ShieldCheck, Heart, UserRound, LayoutDashboard, CheckCircle2, MoreHorizontal, ArrowUpRight, UsersRound, Sparkles, X, RotateCcw } from 'lucide-react'
import './styles.css'

const categories = [
  { name: '家政服务', icon: '⌂', tone: 'mint' },
  { name: '老人陪诊', icon: '♧', tone: 'peach' },
  { name: '宠物照看', icon: '♡', tone: 'lavender' },
  { name: '跑腿代办', icon: '↗', tone: 'yellow' },
  { name: '家教辅导', icon: '✦', tone: 'blue' },
  { name: '维修帮忙', icon: '⌁', tone: 'pink' },
]

const initialTasks = [
  { id: 'task-1', tag: '家政服务', title: '上门做饭 · 家常菜烹饪', desc: '两位老人，准备午餐和晚餐，收拾厨房', pay: '50', unit: '次', distance: '0.8km', time: '今天 11:00 前', avatar: '王', color: '#f5c9ae', hot: true },
  { id: 'task-2', tag: '老人陪诊', title: '陪同老人医院复诊', desc: '熟悉三甲医院流程，有耐心，协助取药', pay: '25', unit: '小时', distance: '1.2km', time: '明天 08:30', avatar: '陈', color: '#c8d8e8', hot: false },
  { id: 'task-3', tag: '跑腿代办', title: '帮忙购买超市生鲜', desc: '华洲社区附近，10公斤以内，送货上门', pay: '10', unit: '次', distance: '0.5km', time: '灵活安排', avatar: '李', color: '#d8e9bd', hot: false },
]

/** 请求 API 并在网络不可用时返回可用的空结果。 */
async function requestApi(path, options = {}) {
  const token = localStorage.getItem('linlibang_token')
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.message || '请求失败')
  return payload
}
/** 使用演示身份登录，便于当前原型完整体验发布与审核流程。 */
async function loginAs(role) {
  const credentials = role === 'admin' ? { phone: 'admin', password: 'admin123' } : { phone: '13800138000', password: '123456' }
  const payload = await requestApi('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
  localStorage.setItem('linlibang_token', payload.token)
  return payload.user
}

function App() {
  const [mode, setMode] = useState('user')
  const [active, setActive] = useState('首页')
  const [hotTask, setHotTask] = useState(null)
  const [category, setCategory] = useState('全部')
  const [keyword, setKeyword] = useState('')
  const [liked, setLiked] = useState([])
  const [taskList, setTaskList] = useState(initialTasks)
  const [publishOpen, setPublishOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    requestApi(`/tasks?category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}`).then(payload => setTaskList(payload.data)).catch(() => setTaskList(initialTasks))
  }, [category, keyword])
  const filteredTasks = taskList
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 1800) }
  /** 打开被驳回任务的编辑重提页面。 */
  const editRejectedTask = (task) => { setEditingTask(task); setPublishOpen(true) }

  if (mode === 'admin') return <Admin onBack={() => setMode('user')} notify={notify} />

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">邻</div><div><b>邻里帮</b><span>让邻里互助更简单</span></div></div>
      <nav><button className={active === '首页' ? 'active' : ''} onClick={() => setActive('首页')}>首页</button><button onClick={() => setActive('我的订单')}>我的订单</button><button onClick={() => setActive('消息')}>消息</button></nav>
      <div className="top-actions"><button className="location"><MapPin size={16}/> 上海市 · 华洲社区 <ChevronRight size={14}/></button><button className="avatar">林</button><button className="admin-entry" onClick={() => setMode('admin')}>管理后台</button></div>
    </header>
    <main>
      <section className="hero"><div><div className="eyebrow">邻里互助 · 安全可靠</div><h1>附近的好工作<br/><em>就在邻里帮</em></h1><p>发布你的技能，接一份靠谱的兼职。<br/>也可以把生活中的小事，交给值得信赖的邻居。</p><button className="primary" onClick={() => { setEditingTask(null); setPublishOpen(true) }}>发布一个任务 <ArrowUpRight size={18}/></button></div><div className="hero-art"><div className="sun"></div><button className="art-card card-one" onClick={() => { const featured = taskList.find(task => task.hot) || taskList[0]; if (featured) { setHotTask(featured); setActive('热单详情') } }}><span>今日热单 · 点击查看</span><b>{taskList.find(task => task.hot)?.title || taskList[0]?.title || '暂无热单'}</b><small>{taskList[0] ? `¥${taskList.find(task => task.hot)?.pay || taskList[0].pay} / ${taskList.find(task => task.hot)?.unit || taskList[0].unit}` : ''}</small></button><div className="art-card card-two"><span>邻里帮</span><b>一起把生活<br/>过得更好</b></div><div className="person">☻</div><div className="plant">♨</div></div></section>
      <section className="trust-row"><div><ShieldCheck size={22}/><span><b>实名认证</b><small>身份信息严格审核</small></span></div><div><CheckCircle2 size={22}/><span><b>平台担保</b><small>任务完成再结算</small></span></div><div><UsersRound size={22}/><span><b>邻里评价</b><small>真实服务有口碑</small></span></div><div className="stat"><strong>2,846</strong><small>位邻里正在互助</small></div></section>
      <section className="content"><div className="section-head"><div><h2>发现附近的任务</h2><p>精选优质兼职，距离近、结算快</p></div><div className="search"><Search size={18}/><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索任务关键词"/></div></div><div className="category-row"><button className={category === '全部' ? 'selected' : ''} onClick={() => setCategory('全部')}>全部任务</button>{categories.map(item => <button key={item.name} className={category === item.name ? 'selected' : ''} onClick={() => setCategory(item.name)}><span className={`cat-icon ${item.tone}`}>{item.icon}</span>{item.name}</button>)}</div><div className="task-grid">{filteredTasks.map(task => <article className="task-card" key={task.id}><div className="task-top"><span className="task-tag">{task.tag}</span>{task.hot && <span className="hot">热门</span>}<button className="heart" onClick={() => setLiked(x => x.includes(task.id) ? x.filter(id => id !== task.id) : [...x, task.id])}><Heart size={18} fill={liked.includes(task.id) ? '#e97861' : 'none'} color={liked.includes(task.id) ? '#e97861' : '#9aa5a0'}/></button></div><h3>{task.title}</h3><p>{task.desc}</p><div className="task-meta"><span><MapPin size={14}/>{task.distance}</span><span><Clock3 size={14}/>{task.time}</span></div><div className="task-bottom"><div className="publisher"><span style={{background: task.color}}>{task.avatar}</span><small>邻里发布 · <b>已认证</b></small></div><div className="price">¥{task.pay}<small> / {task.unit}</small></div></div><button className="accept" onClick={async () => { try { await requestApi(`/tasks/${task.id}/apply`, { method: 'POST' }); notify(`已申请「${task.title}」`) } catch (error) { notify(error.message === '请先登录' ? '请先登录后再接单' : error.message) } }}>立即接单 <ChevronRight size={16}/></button></article>)}</div></section>
    </main>
    <footer><span>© 2024 邻里帮 · 让每一次互助都值得信赖</span><span>用户协议　隐私政策　帮助中心</span></footer>
    {active === '我的订单' && <MyTasks onClose={() => setActive('首页')} onEdit={editRejectedTask} notify={notify}/>}
    {active === '消息' && <Messages onClose={() => setActive('首页')}/>}
    {active === '热单详情' && hotTask && <HotTask task={hotTask} onClose={() => setActive('首页')} onApply={async () => { try { await requestApi(`/tasks/${hotTask.id}/apply`, { method: 'POST' }); notify(`已申请「${hotTask.title}」`) } catch (error) { notify(error.message) } }}/>} 
    {publishOpen && <PublishTask initialTask={editingTask} onClose={() => { setPublishOpen(false); setEditingTask(null) }} onSubmitted={() => { setPublishOpen(false); setEditingTask(null); notify('任务已提交，等待后台审核') }} notify={notify}/>} 
    {toast && <div className="toast">{toast}</div>}
  </div>
}

/** 展示用户任务进度和申请记录对应的站内消息。 */
function Messages({ onClose }) {
  const [messages, setMessages] = useState([])
  useEffect(() => { loginAs('user').then(async () => { const [published, applications] = await Promise.all([requestApi('/me/tasks'), requestApi('/me/applications')]); const taskMessages = published.data.map(task => ({ id: `task-${task.id}`, title: task.status === 'approved' ? '任务审核通过' : task.status === 'rejected' ? '任务需要修改' : '任务已提交', text: task.status === 'rejected' ? `「${task.title}」被驳回：${task.reviewReason || '请修改后重新提交'}` : `「${task.title}」${task.status === 'approved' ? '已通过审核并发布' : '正在等待平台审核'}`, date: task.reviewedAt || task.submittedAt || task.createdAt })); const applicationMessages = applications.data.map(application => ({ id: application.id, title: '接单申请已提交', text: `你已成功申请任务「${application.taskTitle || '邻里兼职'}」`, date: application.createdAt })); setMessages([...taskMessages, ...applicationMessages].sort((a, b) => new Date(b.date) - new Date(a.date))) }).catch(() => setMessages([])) }, [])
  return <div className="modal-mask"><section className="publish-modal my-tasks"><div className="modal-head"><div><h2>消息通知</h2><p>查看任务审核进度和接单申请动态</p></div><button onClick={onClose}><X size={20}/></button></div><div className="my-task-list">{messages.length ? messages.map(message => <article className="my-task-item" key={message.id}><div><span className="status-pill approved">站内通知</span><h3>{message.title}</h3><p>{message.text}</p><small>{message.date ? new Date(message.date).toLocaleString('zh-CN') : ''}</small></div></article>) : <p className="empty-state">暂无消息，任务动态会显示在这里。</p>}</div></section></div>
}
/** 展示今日热单详情并支持直接申请。 */
function HotTask({ task, onClose, onApply }) {
  return <div className="modal-mask"><section className="publish-modal"><div className="modal-head"><div><h2>今日热单</h2><p>邻里精选任务，审核通过后即可申请</p></div><button onClick={onClose}><X size={20}/></button></div><div className="hot-task-detail"><span className="task-tag">{task.tag}</span><h2>{task.title}</h2><p>{task.desc}</p><p>服务时间：{task.time}　·　距离：{task.distance}</p><strong>¥{task.pay} / {task.unit}</strong><button className="primary" onClick={onApply}>立即接单 <ChevronRight size={16}/></button></div></section></div>
}

function MyTasks({ onClose, onEdit, notify }) {
  const [items, setItems] = useState([])
  const [view, setView] = useState('published')
  useEffect(() => { loginAs('user').then(() => requestApi('/me/tasks')).then(payload => setItems(payload.data)).catch(error => notify(error.message)) }, [])
  const statusText = { pending: '待审核', approved: '已发布', rejected: '已驳回' }
  return <div className="modal-mask"><div className="publish-modal my-tasks"><div className="modal-head"><div><h2>我的任务</h2><p>管理发布任务或查看已申请的兼职</p></div><button onClick={onClose}><X size={20}/></button></div><div className="review-tabs"><button className={view === 'published' ? 'active' : ''} onClick={() => setView('published')}>我发布的</button><button className={view === 'applied' ? 'active' : ''} onClick={async () => { setView('applied'); try { await loginAs('user'); const [apps, tasks] = await Promise.all([requestApi('/me/applications'), requestApi('/tasks')]); const byId = new Map(tasks.data.map(task => [task.id, task])); setItems(apps.data.map(app => ({ ...byId.get(app.taskId), applicationStatus: app.status })).filter(item => item.id)) } catch (error) { notify(error.message) } }}>我申请的</button></div><div className="my-task-list">{items.map(item => <div className="my-task-item" key={item.id}><div><span className={`status-pill ${view === 'applied' ? 'approved' : item.status}`}>{view === 'applied' ? '已申请' : statusText[item.status]}</span><h3>{item.title}</h3><p>{item.tag} · ¥{item.pay}/{item.unit} · {item.time}</p>{view === 'published' && item.status === 'rejected' && <small>驳回原因：{item.reviewReason}</small>}</div>{view === 'published' && item.status === 'rejected' && <button onClick={() => { onClose(); onEdit(item) }}><RotateCcw size={15}/> 修改重提</button>}</div>)}</div></div></div>
}

function PublishTask({ initialTask, onClose, onSubmitted, notify }) {
  const [method, setMethod] = useState(initialTask ? 'form' : 'ai')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(initialTask || { tag: '家政服务', title: '', desc: '', pay: '', unit: '次', distance: '附近', time: '', address: '华洲社区', contactName: '', contactPhone: '' })
  /** 调用 AI 将自然语言描述整理为任务表单。 */
  const generate = async () => { setLoading(true); try { if (!localStorage.getItem('linlibang_token')) await loginAs('user'); const payload = await requestApi('/tasks/generate', { method: 'POST', body: JSON.stringify({ description: prompt }) }); setForm({ ...payload.data, contactName: form.contactName || '', contactPhone: form.contactPhone || '' }); setMethod('form'); notify('AI 已生成任务信息，请确认后提交') } catch (error) { notify(error.message) } finally { setLoading(false) } }
  /** 创建任务或将驳回任务修改后重新提交审核。 */
  const submit = async (event) => { event.preventDefault(); setLoading(true); try { if (!localStorage.getItem('linlibang_token')) await loginAs('user'); await requestApi(initialTask ? `/tasks/${initialTask.id}` : '/tasks', { method: initialTask ? 'PUT' : 'POST', body: JSON.stringify({ ...form, source: method === 'ai' ? 'ai' : 'form' }) }); onSubmitted() } catch (error) { notify(error.message) } finally { setLoading(false) } }
  return <div className="modal-mask"><div className="publish-modal"><div className="modal-head"><div><h2>{initialTask ? '修改并重新提交' : '发布任务'}</h2><p>{initialTask ? `驳回原因：${initialTask.reviewReason || '请完善任务信息'}` : '提交后将进入平台审核，审核通过后正式发布'}</p></div><button onClick={onClose}><X size={20}/></button></div>{!initialTask && <div className="publish-method"><button className={method === 'ai' ? 'active' : ''} onClick={() => setMethod('ai')}><Sparkles size={18}/> AI 描述生成</button><button className={method === 'form' ? 'active' : ''} onClick={() => setMethod('form')}><CheckCircle2 size={18}/> 基本信息填写</button></div>}{method === 'ai' && !initialTask ? <div className="ai-panel"><div className="ai-tip"><Sparkles size={19}/><span><b>告诉 AI 你需要什么帮助</b><small>请尽量包含时间、地点、报酬和具体要求</small></span></div><textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="例如：明天上午陪老人去医院复诊，大约3小时，华洲社区出发，报酬每小时25元，需要有耐心并熟悉医院流程。"/><button className="primary generate" disabled={loading} onClick={generate}>{loading ? '正在生成...' : 'AI 生成任务'} <Sparkles size={16}/></button></div> : <form className="publish-form" onSubmit={submit}><label>任务类别<select value={form.tag} onChange={event => setForm({ ...form, tag: event.target.value })}>{categories.map(item => <option key={item.name}>{item.name}</option>)}</select></label><label className="wide">任务标题<input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="请输入简洁明确的任务标题"/></label><label className="wide">任务描述<textarea value={form.desc} onChange={event => setForm({ ...form, desc: event.target.value })} placeholder="说明具体工作内容和人员要求"/></label><label>任务报酬<input type="number" min="1" value={form.pay} onChange={event => setForm({ ...form, pay: event.target.value })}/></label><label>计价单位<select value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })}><option>次</option><option>小时</option><option>天</option></select></label><label>服务时间<input value={form.time} onChange={event => setForm({ ...form, time: event.target.value })} placeholder="如：明天 08:30"/></label><label>服务地址<input value={form.address} onChange={event => setForm({ ...form, address: event.target.value })}/></label><label>联系人姓名<input required value={form.contactName || ''} onChange={event => setForm({ ...form, contactName: event.target.value })} placeholder="请输入联系人姓名"/></label><label>联系电话<input required type="tel" pattern="1[0-9]{10}" value={form.contactPhone || ''} onChange={event => setForm({ ...form, contactPhone: event.target.value })} placeholder="11位手机号"/></label><div className="form-actions"><button type="button" className="cancel" onClick={onClose}>取消</button><button className="primary" disabled={loading}>{loading ? '提交中...' : initialTask ? '重新提交审核' : '提交审核'}</button></div></form>}</div></div>
}

function Admin({ onBack, notify }) {
  const [tab, setTab] = useState('待审核')
  const [adminTasks, setAdminTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [adminName, setAdminName] = useState('运营管理员')
  useEffect(() => { loginAs('admin').then(async () => { const [tasks, summary, profile] = await Promise.all([requestApi('/admin/tasks'), requestApi('/admin/stats'), requestApi('/admin/settings')]); setAdminTasks(tasks.data); setStats(summary.data); setAdminName(profile.data.name) }).catch(error => notify(error.message)) }, [])
  return <div className="admin-shell"><aside><div className="brand admin-brand"><div className="brand-mark">邻</div><div><b>邻里帮</b><span>运营管理中心</span></div></div><div className="side-label">工作台</div>{['数据概览','任务审核','用户管理','订单管理','举报与申诉'].map(item => <button className={tab === item || (item === '任务审核' && tab === '待审核') ? 'side-active' : ''} onClick={() => setTab(item)} key={item}><LayoutDashboard size={17}/>{item}</button>)}<div className="side-label">系统</div><button className={tab === '消息通知' ? 'side-active' : ''} onClick={() => setTab('消息通知')}><Bell size={17}/>消息通知</button><button className={tab === '管理员设置' ? 'side-active' : ''} onClick={() => setTab('管理员设置')}><UserRound size={17}/>管理员设置</button><button className="back" onClick={onBack}>← 返回用户端</button></aside><div className="admin-main"><div className="admin-header"><div><span className="crumb">工作台 / {tab === '待审核' ? '任务审核' : tab}</span><h1>{tab === '任务审核' || tab === '待审核' ? '任务审核' : tab}</h1></div><div className="admin-user"><span>{adminName}</span><div className="avatar dark">{adminName.slice(0, 1)}</div></div></div>{tab === '数据概览' ? <Overview stats={stats}/> : tab === '消息通知' ? <AdminNotifications notify={notify}/> : tab === '管理员设置' ? <AdminSettings notify={notify} onSaved={setAdminName}/> : <Review tab={tab} onTabChange={setTab} notify={notify} adminTasks={adminTasks} setAdminTasks={setAdminTasks}/>}</div></div>
}
/** 展示管理员任务审核动态，并支持将通知标记为已读。 */
function AdminNotifications({ notify }) {
  const [items, setItems] = useState([])
  const load = () => requestApi('/admin/notifications').then(payload => setItems(payload.data)).catch(error => notify(error.message))
  useEffect(() => { load() }, [])
  const markRead = async () => { try { await requestApi('/admin/notifications/read', { method: 'POST' }); await load(); notify('通知已全部标记为已读') } catch (error) { notify(error.message) } }
  return <section className="review"><div className="review-tabs"><b>任务动态</b><button onClick={markRead}>全部标记已读</button></div><div className="my-task-list">{items.length ? items.map(item => <article className="my-task-item" key={item.id}><div><span className={`status-pill ${item.read ? 'approved' : 'pending'}`}>{item.read ? '已读' : '未读'}</span><h3>{item.title}</h3><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('zh-CN')}</small></div></article>) : <p className="empty-state">暂无消息通知</p>}</div></section>
}
/** 读取和更新管理员资料及登录密码。 */
function AdminSettings({ notify, onSaved }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  useEffect(() => { requestApi('/admin/settings').then(({ data }) => { setName(data.name); setPhone(data.phone) }).catch(error => notify(error.message)) }, [])
  const save = async event => { event.preventDefault(); try { const { data } = await requestApi('/admin/settings', { method: 'PUT', body: JSON.stringify({ name, currentPassword, newPassword }) }); setCurrentPassword(''); setNewPassword(''); onSaved(data.name); notify('管理员设置已保存') } catch (error) { notify(error.message) } }
  return <form className="publish-form" onSubmit={save}><label>管理员姓名<input required value={name} onChange={event => setName(event.target.value)}/></label><label>登录账号<input value={phone} readOnly/></label><label>当前密码<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="修改密码时必填"/></label><label>新密码<input type="password" minLength="6" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="不修改请留空"/></label><div className="form-actions"><button className="primary">保存设置</button></div></form>
}
/** 展示后台 API 返回的实时统计数据。 */
function Overview({ stats }) { return <div className="overview"><div className="overview-card"><span>任务总数</span><strong>{stats?.totalTasks ?? '—'}</strong><small>平台累计发布任务</small></div><div className="overview-card"><span>待审核任务</span><strong>{stats?.pendingTasks ?? '—'}</strong><small>需要及时处理</small></div><div className="overview-card"><span>已通过任务</span><strong>{stats?.approvedTasks ?? '—'}</strong><small>已正式发布</small></div><div className="overview-card"><span>用户数</span><strong>{stats?.users ?? '—'}</strong><small>已注册用户</small></div><div className="overview-card"><span>任务申请数</span><strong>{stats?.applications ?? '—'}</strong><small>累计申请</small></div></div> }
function Review({ tab, onTabChange, notify, adminTasks, setAdminTasks }) {
  const items = adminTasks.filter(item => tab === '已通过' ? item.status === 'approved' : tab === '已驳回' ? item.status === 'rejected' : item.status === 'pending')
  /** 提交任务审核结果并同步审核列表。 */
  const reviewTask = async (id, status) => { const reason = status === 'rejected' ? window.prompt('请输入驳回原因，用户将根据原因修改后重提') : ''; if (status === 'rejected' && !reason?.trim()) return; try { await requestApi(`/admin/tasks/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }); setAdminTasks(adminTasks.map(item => item.id === id ? { ...item, status, reviewReason: reason } : item)); notify(status === 'approved' ? '任务已通过审核并正式发布' : '任务已驳回，等待用户修改') } catch (error) { notify(error.message === '请先登录' ? '管理员登录后才能审核' : error.message) } }
  return <div className="review"><div className="review-tabs"><button className={tab === '待审核' || tab === '任务审核' ? 'active' : ''} onClick={() => onTabChange('待审核')}>待审核 <b>{adminTasks.filter(item => item.status === 'pending').length}</b></button><button className={tab === '已通过' ? 'active' : ''} onClick={() => onTabChange('已通过')}>已通过</button><button className={tab === '已驳回' ? 'active' : ''} onClick={() => onTabChange('已驳回')}>已驳回</button><div className="review-search"><Search size={17}/> 搜索任务标题或发布人</div></div><div className="table"><div className="table-head"><span>任务信息</span><span>发布人</span><span>提交时间</span><span>状态</span><span>操作</span></div>{items.map(item => <div className="table-row" key={item.id}><div className="task-info"><div className={`mini-icon ${item.tag === '老人陪诊' ? 'blue-bg' : ''}`}>{item.tag.slice(0, 1)}</div><span><b>{item.title}</b><small>{item.tag} · ¥{item.pay}/{item.unit}</small></span></div><div className="publisher-cell"><span className="mini-avatar">{item.publisher?.name?.slice(0, 1) || '邻'}</span> {item.publisher?.name || '邻里用户'} <small>已认证</small></div><span className="date">{item.createdAt?.slice(0, 10)}<br/>已提交</span><span className={`status ${item.status === 'pending' ? 'pending' : ''}`}>{item.status === 'pending' ? '待审核' : item.status === 'approved' ? '已通过' : '已驳回'}</span><div className="row-actions">{item.status === 'pending' && <><button onClick={() => reviewTask(item.id, 'approved')}>通过</button><button onClick={() => reviewTask(item.id, 'rejected')}>驳回</button></>}<MoreHorizontal size={18}/></div></div>)}</div></div>
}

createRoot(document.getElementById('root')).render(<App />)
