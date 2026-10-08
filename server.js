import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dataFile = path.join(dataDir, 'store.json')
const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const initialStore = {
  users: [
    { id: 'u-demo', name: '林女士', phone: '13800138000', password: '123456', role: 'user', verified: true, createdAt: new Date().toISOString() },
    { id: 'u-admin', name: '运营管理员', phone: 'admin', password: 'admin123', role: 'admin', verified: true, createdAt: new Date().toISOString() },
  ],
  tasks: [
    { id: 'task-1', tag: '家政服务', title: '上门做饭 · 家常菜烹饪', desc: '两位老人，准备午餐和晚餐，收拾厨房', pay: 50, unit: '次', distance: '0.8km', time: '今天 11:00 前', status: 'approved', publisherId: 'u-demo', createdAt: new Date().toISOString() },
    { id: 'task-2', tag: '老人陪诊', title: '陪同老人医院复诊', desc: '熟悉三甲医院流程，有耐心，协助取药', pay: 25, unit: '小时', distance: '1.2km', time: '明天 08:30', status: 'pending', publisherId: 'u-demo', createdAt: new Date().toISOString() },
    { id: 'task-3', tag: '跑腿代办', title: '帮忙购买超市生鲜', desc: '华洲社区附近，10公斤以内，送货上门', pay: 10, unit: '次', distance: '0.5km', time: '灵活安排', status: 'pending', publisherId: 'u-demo', createdAt: new Date().toISOString() },
  ],
  applications: [],
  sessions: {},
  auditLogs: [],
  adminNotificationsReadAt: null,
}

/** 读取本地数据仓库，不存在时初始化演示数据。 */
async function readStore() {
  try { return JSON.parse(await fs.readFile(dataFile, 'utf8')) } catch { await writeStore(initialStore); return structuredClone(initialStore) }
}
/** 将数据仓库持久化到本地 JSON 文件。 */
async function writeStore(store) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2))
}
/** 移除用户敏感字段后返回公开用户信息。 */
function publicUser(user) { const { password, ...safeUser } = user; return safeUser }
/** 创建用于接口鉴权的随机会话令牌。 */
function createToken() { return crypto.randomBytes(24).toString('hex') }
/** 校验请求中的 Bearer 令牌并注入当前用户。 */
async function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const store = await readStore()
  const userId = token && store.sessions[token]
  const user = userId && store.users.find(item => item.id === userId)
  if (!user) return res.status(401).json({ message: '请先登录' })
  req.user = user
  req.store = store
  next()
}
/** 限制接口仅允许管理员访问。 */
function adminOnly(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ message: '无管理员权限' }); next() }
/** 返回统一格式的业务错误。 */
function sendError(res, message, status = 400) { return res.status(status).json({ message }) }
/** 校验并规范化任务表单字段。 */
function normalizeTaskInput(input) {
  const task = { tag: input.tag?.trim(), title: input.title?.trim(), desc: input.desc?.trim(), pay: Number(input.pay), unit: input.unit?.trim(), distance: input.distance?.trim() || '附近', time: input.time?.trim() || '灵活安排', address: input.address?.trim() || '华洲社区', contactName: input.contactName?.trim(), contactPhone: input.contactPhone?.trim() }
  if (!task.tag || !task.title || !task.desc || !task.pay || task.pay <= 0 || !task.unit || !task.contactName || !/^1\d{10}$/.test(task.contactPhone)) throw new Error('请完善任务信息，并填写有效联系人姓名和手机号')
  return task
}
/** 根据自然语言生成结构化任务；配置 OpenAI 后优先调用模型，未配置时使用本地规则生成。 */
async function generateTaskDraft(description) {
  if (!description?.trim()) throw new Error('请描述需要发布的任务')
  if (process.env.OPENAI_API_KEY?.startsWith('sk-') && process.env.OPENAI_API_KEY.length > 20) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: '将社区兼职需求整理为JSON，只返回tag,title,desc,pay,unit,distance,time,address。tag从家政服务、老人陪诊、宠物照看、跑腿代办、家教辅导、维修帮忙中选择。' }, { role: 'user', content: description }] }) })
    if (!response.ok) throw new Error('AI 服务暂时不可用')
    const payload = await response.json(); return JSON.parse(payload.choices[0].message.content)
  }
  const rules = [['陪诊','老人陪诊'],['老人','老人陪诊'],['猫','宠物照看'],['狗','宠物照看'],['宠物','宠物照看'],['买','跑腿代办'],['送','跑腿代办'],['辅导','家教辅导'],['维修','维修帮忙'],['做饭','家政服务'],['打扫','家政服务']]
  const tag = rules.find(([keyword]) => description.includes(keyword))?.[1] || '家政服务'
  const amount = Number(description.match(/(\d+)\s*元/)?.[1] || 30)
  return { tag, title: description.slice(0, 22), desc: description, pay: amount, unit: description.includes('小时') ? '小时' : '次', distance: '附近', time: description.match(/(今天|明天|周[一二三四五六日]).{0,8}/)?.[0] || '灵活安排', address: '华洲社区' }
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: '邻里帮 API' }))
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password } = req.body
  if (!name || !phone || !password) return sendError(res, '姓名、手机号和密码不能为空')
  const store = await readStore()
  if (store.users.some(user => user.phone === phone)) return sendError(res, '手机号已注册')
  const user = { id: `u-${crypto.randomUUID()}`, name, phone, password, role: 'user', verified: false, createdAt: new Date().toISOString() }
  store.users.push(user); await writeStore(store)
  res.status(201).json({ user: publicUser(user) })
})
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body; const store = await readStore()
  const user = store.users.find(item => item.phone === phone && item.password === password)
  if (!user) return sendError(res, '手机号或密码错误', 401)
  const token = createToken(); store.sessions[token] = user.id; await writeStore(store)
  res.json({ token, user: publicUser(user) })
})
app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }))
app.post('/api/auth/logout', auth, async (req, res) => { const token = req.headers.authorization.replace('Bearer ', ''); delete req.store.sessions[token]; await writeStore(req.store); res.json({ ok: true }) })

app.get('/api/tasks', async (req, res) => {
  const store = await readStore(); const { status = 'approved', category, keyword } = req.query
  let tasks = store.tasks.filter(task => status === 'all' ? true : task.status === status)
  if (category && category !== '全部') tasks = tasks.filter(task => task.tag === category)
  if (keyword) tasks = tasks.filter(task => `${task.title}${task.desc}`.includes(keyword))
  res.json({ data: tasks.map(({ contactName, contactPhone, ...task }) => ({ ...task, publisher: publicUser(store.users.find(user => user.id === task.publisherId)) })) })
})
app.get('/api/tasks/:id', async (req, res) => { const store = await readStore(); const task = store.tasks.find(item => item.id === req.params.id); if (!task) return sendError(res, '任务不存在', 404); const { contactName, contactPhone, ...publicTask } = task; res.json({ data: publicTask }) })
app.post('/api/tasks/generate', auth, async (req, res) => {
  try { res.json({ data: await generateTaskDraft(req.body.description) }) } catch (error) { sendError(res, error.message) }
})
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const input = normalizeTaskInput(req.body)
    const task = { id: `task-${crypto.randomUUID()}`, ...input, source: req.body.source === 'ai' ? 'ai' : 'form', status: 'pending', publisherId: req.user.id, createdAt: new Date().toISOString(), submittedAt: new Date().toISOString(), reviewReason: '' }
    req.store.tasks.unshift(task); await writeStore(req.store); res.status(201).json({ data: task })
  } catch (error) { sendError(res, error.message) }
})
app.put('/api/tasks/:id', auth, async (req, res) => {
  const task = req.store.tasks.find(item => item.id === req.params.id && item.publisherId === req.user.id)
  if (!task) return sendError(res, '任务不存在', 404)
  if (task.status !== 'rejected') return sendError(res, '只有已驳回的任务可以修改后重提')
  try { Object.assign(task, normalizeTaskInput(req.body), { status: 'pending', reviewReason: '', submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); await writeStore(req.store); res.json({ data: task }) } catch (error) { sendError(res, error.message) }
})
app.get('/api/me/tasks', auth, async (req, res) => res.json({ data: req.store.tasks.filter(task => task.publisherId === req.user.id) }))
app.post('/api/tasks/:id/apply', auth, async (req, res) => {
  const task = req.store.tasks.find(item => item.id === req.params.id)
  if (!task || task.status !== 'approved') return sendError(res, '任务不可接单', 400)
  if (task.publisherId === req.user.id) return sendError(res, '不能申请自己发布的任务')
  if (req.store.applications.some(item => item.taskId === task.id && item.userId === req.user.id)) return sendError(res, '你已申请过该任务')
  const application = { id: `apply-${crypto.randomUUID()}`, taskId: task.id, userId: req.user.id, status: 'applied', createdAt: new Date().toISOString() }
  req.store.applications.push(application); await writeStore(req.store); res.status(201).json({ data: application })
})
app.get('/api/me/applications', auth, async (req, res) => res.json({ data: req.store.applications.filter(item => item.userId === req.user.id).map(application => ({ ...application, taskTitle: req.store.tasks.find(task => task.id === application.taskId)?.title || '任务已下架' })) }))

app.get('/api/admin/tasks', auth, adminOnly, async (req, res) => { res.json({ data: req.store.tasks.map(task => ({ ...task, publisher: publicUser(req.store.users.find(user => user.id === task.publisherId)) })) }) })
app.patch('/api/admin/tasks/:id/review', auth, adminOnly, async (req, res) => {
  const { status, reason = '' } = req.body; if (!['approved', 'rejected'].includes(status)) return sendError(res, '审核状态无效')
  if (status === 'rejected' && !reason.trim()) return sendError(res, '驳回任务时必须填写原因')
  const task = req.store.tasks.find(item => item.id === req.params.id); if (!task) return sendError(res, '任务不存在', 404)
  if (task.status !== 'pending') return sendError(res, '只能审核待审核任务')
  task.status = status; task.reviewReason = reason; task.reviewedAt = new Date().toISOString(); task.reviewerId = req.user.id
  req.store.auditLogs.push({ id: crypto.randomUUID(), taskId: task.id, reviewerId: req.user.id, status, reason, createdAt: new Date().toISOString() }); await writeStore(req.store); res.json({ data: task })
})
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => { const tasks = req.store.tasks; res.json({ data: { totalTasks: tasks.length, pendingTasks: tasks.filter(item => item.status === 'pending').length, approvedTasks: tasks.filter(item => item.status === 'approved').length, users: req.store.users.filter(user => user.role === 'user').length, applications: req.store.applications.length } }) })
/** 汇总任务审核事件为管理员可见的工作台通知。 */
app.get('/api/admin/notifications', auth, adminOnly, async (req, res) => {
  const notifications = req.store.auditLogs.map(log => {
    const task = req.store.tasks.find(item => item.id === log.taskId)
    return { id: log.id, title: log.status === 'approved' ? '任务审核通过' : '任务已驳回', text: `「${task?.title || '任务已删除'}」${log.status === 'approved' ? '已通过审核并发布' : `被驳回：${log.reason}`}`, createdAt: log.createdAt, read: Boolean(req.store.adminNotificationsReadAt && new Date(log.createdAt) <= new Date(req.store.adminNotificationsReadAt)) }
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  res.json({ data: notifications })
})
/** 将当前管理员工作台已有通知标记为已读。 */
app.post('/api/admin/notifications/read', auth, adminOnly, async (req, res) => {
  req.store.adminNotificationsReadAt = new Date().toISOString()
  await writeStore(req.store)
  res.json({ ok: true })
})
/** 读取或更新当前管理员的个人资料及密码。 */
app.get('/api/admin/settings', auth, adminOnly, async (req, res) => {
  const { id, name, phone } = req.user
  res.json({ data: { id, name, phone } })
})
app.put('/api/admin/settings', auth, adminOnly, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body
  if (!name?.trim()) return sendError(res, '管理员姓名不能为空')
  if (newPassword && newPassword.length < 6) return sendError(res, '新密码至少需要6位')
  if (newPassword && currentPassword !== req.user.password) return sendError(res, '当前密码不正确')
  req.user.name = name.trim()
  if (newPassword) req.user.password = newPassword
  await writeStore(req.store)
  res.json({ data: { id: req.user.id, name: req.user.name, phone: req.user.phone } })
})

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: '服务器内部错误' }) })
app.listen(port, () => console.log(`邻里帮 API running at http://localhost:${port}`))
