// Sample readings for the overview. Every value here is demonstration data,
// shaped like what smash-api /api/system/stats will eventually return.

export type Health = 'healthy' | 'updating' | 'degraded'

export const metrics = {
  cpu: { percent: 23, detail: '8 cores at 3.4 GHz', series: [18, 21, 19, 24, 31, 27, 22, 20, 26, 34, 29, 23, 21, 19, 22, 28, 25, 21, 24, 23] },
  memory: { usedGb: 18.4, totalGb: 32, series: [15.2, 15.8, 16.1, 16.0, 16.9, 17.4, 17.2, 17.8, 18.1, 17.9, 18.3, 18.4] },
  storage: { usedTb: 1.24, totalTb: 4, series: [1.02, 1.05, 1.07, 1.08, 1.12, 1.13, 1.15, 1.18, 1.19, 1.21, 1.23, 1.24] },
  services: { running: 12, total: 12, series: [140, 162, 155, 171, 168, 190, 214, 201, 188, 196, 220, 208] },
}

export type Service = {
  id: string
  name: string
  description: string
  icon: 'friday' | 'gateway' | 'database' | 'api' | 'deploy'
  health: Health
  statusText: string
  reading: string
}

export const services: Service[] = [
  { id: 'friday-core', name: 'FRIDAY Core', description: 'Assistant runtime and conversation memory', icon: 'friday', health: 'healthy', statusText: 'Healthy', reading: '14 days up' },
  { id: 'model-gateway', name: 'Model Gateway', description: 'Routes requests to GPT, Claude and local models', icon: 'gateway', health: 'healthy', statusText: 'Healthy', reading: '142 ms' },
  { id: 'postgres', name: 'PostgreSQL', description: 'Primary database, backed up nightly', icon: 'database', health: 'healthy', statusText: 'Healthy', reading: '2.1 GB' },
  { id: 'api-gateway', name: 'API Gateway', description: 'TLS and request routing for every service', icon: 'api', health: 'healthy', statusText: 'Healthy', reading: '38 req/s' },
  { id: 'deploy-manager', name: 'Deployment Manager', description: 'Builds and rolls out containers', icon: 'deploy', health: 'updating', statusText: 'Rolling out', reading: '1 update' },
]

export const veronica = {
  version: 'v0.4-exp',
  params: '1.3B parameters',
  step: 18_400,
  totalSteps: 30_000,
  checkpoint: 'ckpt-18000',
  checkpointAge: '41 min ago',
  valLoss: 1.82,
  valDelta: -0.06,
  gpu: 'RTX 4090',
  gpuUse: 'busy, 21.3 of 24 GB',
  // validation loss, sampled every 1,000 steps
  val: [3.92, 3.31, 2.94, 2.71, 2.55, 2.43, 2.33, 2.26, 2.19, 2.13, 2.08, 2.03, 1.99, 1.95, 1.92, 1.9, 1.87, 1.85, 1.82],
  train: [3.88, 3.2, 2.83, 2.6, 2.44, 2.31, 2.21, 2.13, 2.06, 2.0, 1.94, 1.9, 1.85, 1.81, 1.78, 1.75, 1.72, 1.7, 1.67],
}

export const intelligence = [
  { name: 'FRIDAY', value: 'Ready', tone: 'mint', page: 'friday' },
  { name: 'Model Gateway', value: 'Connected', tone: 'mint', page: 'friday' },
  { name: 'VERONICA', value: 'Development', tone: 'violet', page: 'ai-lab' },
  { name: 'Cloud Services', value: 'Healthy', tone: 'mint', page: 'applications' },
] as const

export const activity = [
  { title: 'Application deployment successful', detail: 'notes-app v2.3 is live', time: '12 min' },
  { title: 'VERONICA checkpoint saved', detail: 'ckpt-18000, validation loss 1.82', time: '41 min' },
  { title: 'Database backup completed', detail: 'PostgreSQL, 2.1 GB to offsite storage', time: '2 h' },
  { title: 'Model gateway connected', detail: 'GPT, Claude and Local available', time: '6 h' },
  { title: 'FRIDAY initialized', detail: 'Memory restored from 214 conversations', time: '6 h' },
]

// ---------- Page data (sample) ----------

export type ChatMessage = { role: 'user' | 'friday'; text: string; tools?: { id: string; name: string; is_error?: boolean }[] }

export const conversations: { id: string; title: string; time: string; messages: ChatMessage[] }[] = [
  {
    id: 'c1',
    title: 'Why did the deploy pause last night?',
    time: 'Today',
    messages: [
      { role: 'user', text: 'Why did the notes-app deploy pause last night?' },
      { role: 'friday', text: 'Deployment Manager paused the rollout at 23:40 because the new container failed its first health check: the database migration took 41 seconds, longer than the 30-second limit. It retried at 23:52 and the rollout finished cleanly. I’d raise the health-check grace period to 60 seconds for this app.' },
    ],
  },
  {
    id: 'c2',
    title: 'Plan the VERONICA v0.5 dataset',
    time: 'Yesterday',
    messages: [
      { role: 'user', text: 'What should change in the dataset for VERONICA v0.5?' },
      { role: 'friday', text: 'Validation loss is flattening near 1.8, which suggests v0.4 is data-limited rather than size-limited. For v0.5 I’d add about 2B tokens of code and technical writing, deduplicate the web crawl more aggressively, and hold out a cleaner validation split so the numbers are easier to trust.' },
    ],
  },
  {
    id: 'c3',
    title: 'Summarise this week’s backups',
    time: 'Oct 9',
    messages: [
      { role: 'user', text: 'Summarise this week’s backups.' },
      { role: 'friday', text: 'Seven nightly backups ran this week and all succeeded. PostgreSQL averaged 2.1 GB, and file backups were incremental at 3 to 6 GB each. Offsite sync finished every night before 03:30. The oldest restore point is now 30 days old.' },
    ],
  },
  {
    id: 'c4',
    title: 'Set up a photo library',
    time: 'Oct 7',
    messages: [
      { role: 'user', text: 'I want a private photo library. What do you recommend?' },
      { role: 'friday', text: 'Immich fits well here: it runs in containers, uses PostgreSQL, which you already run, and can use the GPU for face and object search. I’ve drafted a deployment that stores originals on bulk storage and thumbnails on fast storage.' },
    ],
  },
  {
    id: 'c5',
    title: 'Compare models for code review',
    time: 'Oct 5',
    messages: [
      { role: 'user', text: 'Which model should I use for code review?' },
      { role: 'friday', text: 'For long diffs, Claude gave the most thorough reviews in your last 20 requests. GPT was faster on short questions. Local is best when the code shouldn’t leave smash-01. Auto mode already routes reviews to Claude.' },
    ],
  },
]

export const providers = [
  { id: 'claude', name: 'Claude', note: 'Anthropic', tokens: 182_400, share: 0.63 },
  { id: 'gpt', name: 'GPT', note: 'OpenAI', tokens: 64_100, share: 0.22 },
  { id: 'local', name: 'Local', note: 'Ollama on smash-01', tokens: 41_900, share: 0.15 },
]

export type App = {
  id: string
  name: string
  description: string
  kind: 'app' | 'core'
  version: string
  cpu: number
  memory: string
  uptime: string
  health: Health
  statusText: string
}

export const applications: App[] = [
  { id: 'notes', name: 'Notes', description: 'Markdown notes with sync', kind: 'app', version: '2.3.0', cpu: 0.4, memory: '180 MB', uptime: '12 min', health: 'healthy', statusText: 'Running' },
  { id: 'nextcloud', name: 'Nextcloud', description: 'Files, calendar and contacts', kind: 'app', version: '29.0.4', cpu: 1.4, memory: '890 MB', uptime: '14 days', health: 'healthy', statusText: 'Running' },
  { id: 'immich', name: 'Immich Photos', description: 'Private photo library with search', kind: 'app', version: '1.112', cpu: 3.2, memory: '2.4 GB', uptime: '4 days', health: 'healthy', statusText: 'Running' },
  { id: 'home-assistant', name: 'Home Assistant', description: 'Home automation hub', kind: 'app', version: '2026.10', cpu: 0.9, memory: '420 MB', uptime: '14 days', health: 'healthy', statusText: 'Running' },
  { id: 'grafana', name: 'Grafana', description: 'Long-term metrics and dashboards', kind: 'app', version: '11.2', cpu: 0.3, memory: '160 MB', uptime: '14 days', health: 'healthy', statusText: 'Running' },
  { id: 'friday-core', name: 'FRIDAY Core', description: 'Assistant runtime and conversation memory', kind: 'core', version: '0.9.2', cpu: 1.8, memory: '612 MB', uptime: '14 days', health: 'healthy', statusText: 'Healthy' },
  { id: 'model-gateway', name: 'Model Gateway', description: 'Routes requests to GPT, Claude and local models', kind: 'core', version: '0.6.0', cpu: 0.7, memory: '210 MB', uptime: '6 hours', health: 'healthy', statusText: 'Healthy' },
  { id: 'postgres', name: 'PostgreSQL', description: 'Primary database with pgvector', kind: 'core', version: '16.4', cpu: 2.3, memory: '1.1 GB', uptime: '14 days', health: 'healthy', statusText: 'Healthy' },
  { id: 'api-gateway', name: 'API Gateway', description: 'TLS and request routing for every service', kind: 'core', version: '2.8', cpu: 0.6, memory: '48 MB', uptime: '14 days', health: 'healthy', statusText: 'Healthy' },
  { id: 'deploy-manager', name: 'Deployment Manager', description: 'Builds and rolls out containers', kind: 'core', version: '0.4.1', cpu: 1.1, memory: '140 MB', uptime: '14 days', health: 'updating', statusText: 'Rolling out' },
  { id: 'backup-agent', name: 'Backup Agent', description: 'Nightly local and offsite backups', kind: 'core', version: '1.3', cpu: 0.1, memory: '36 MB', uptime: '14 days', health: 'healthy', statusText: 'Healthy' },
  { id: 'veronica-trainer', name: 'VERONICA Trainer', description: 'Runs training jobs on the GPU', kind: 'core', version: '0.4-exp', cpu: 6.1, memory: '4.2 GB', uptime: '2 days', health: 'healthy', statusText: 'Training' },
]

export const compute = {
  cores: [31, 18, 27, 12, 24, 36, 15, 21],
  model: 'AMD Ryzen 7 7700',
  clock: '3.4 GHz base, 5.3 GHz boost',
  load: [1.84, 1.62, 1.4],
  uptime: '14 days, 6 hours',
  temperature: 58,
  memory: [
    { label: 'Applications', gb: 11.2, color: 'var(--blue)' },
    { label: 'VERONICA', gb: 4.2, color: 'var(--violet)' },
    { label: 'Cache', gb: 3.0, color: 'rgba(145,151,165,0.55)' },
  ],
  gpu: { name: 'NVIDIA RTX 4090', util: 92, vramUsed: 21.3, vramTotal: 24, temperature: 71, power: 380, series: [88, 91, 90, 93, 92, 94, 91, 92, 90, 93, 92, 92] },
}

export const storage = {
  totalTb: 4,
  categories: [
    { label: 'Files', gb: 520, color: 'var(--blue)' },
    { label: 'Photos', gb: 310, color: '#9fc9ff' },
    { label: 'Models and checkpoints', gb: 210, color: 'var(--violet)' },
    { label: 'Local backups', gb: 120, color: 'var(--mint)' },
    { label: 'System and apps', gb: 42, color: 'rgba(145,151,165,0.7)' },
    { label: 'Databases', gb: 38, color: '#e0d2ff' },
  ],
  volumes: [
    { name: 'Fast storage', detail: 'NVMe SSD, databases, apps and models', usedTb: 0.83, totalTb: 2, health: 'Healthy', temp: '44 °C' },
    { name: 'Bulk storage', detail: 'Mirrored hard drives, files and photos', usedTb: 0.41, totalTb: 2, health: 'Healthy', temp: '36 °C' },
  ],
  backups: [
    { what: 'PostgreSQL', where: 'Offsite', size: '2.1 GB', when: 'Today, 02:00', ok: true },
    { what: 'Files', where: 'Offsite', size: '4.8 GB', when: 'Today, 02:14', ok: true },
    { what: 'VERONICA checkpoints', where: 'Local', size: '5.2 GB', when: 'Today, 02:31', ok: true },
    { what: 'PostgreSQL', where: 'Offsite', size: '2.1 GB', when: 'Yesterday, 02:00', ok: true },
    { what: 'Files', where: 'Offsite', size: '3.6 GB', when: 'Yesterday, 02:12', ok: true },
  ],
}

export const automations = [
  { id: 'a1', name: 'Nightly database backup', trigger: 'Every day at 02:00', last: 'Succeeded today at 02:00', on: true, system: 'SMASH Cloud' },
  { id: 'a2', name: 'Offsite sync', trigger: 'Every day at 03:00', last: 'Succeeded today at 03:21', on: true, system: 'SMASH Cloud' },
  { id: 'a3', name: 'Save VERONICA checkpoints', trigger: 'Every 1,000 training steps', last: 'Saved 41 min ago', on: true, system: 'VERONICA' },
  { id: 'a4', name: 'Restart unhealthy containers', trigger: 'When a health check fails 3 times', last: 'Last restarted Grafana on Oct 3', on: true, system: 'SMASH Cloud' },
  { id: 'a5', name: 'Renew TLS certificates', trigger: '30 days before expiry', last: 'Renewed on Oct 2', on: true, system: 'SMASH Cloud' },
  { id: 'a6', name: 'Weekly security updates', trigger: 'Sundays at 04:00', last: 'Installed 6 updates on Oct 5', on: true, system: 'SMASH Cloud' },
  { id: 'a7', name: 'Morning brief', trigger: 'Weekdays at 08:00', last: 'FRIDAY summarises overnight activity', on: false, system: 'FRIDAY' },
]

export type ActivityEvent = { title: string; detail: string; time: string; day: 'Today' | 'Yesterday' | 'Friday, October 9'; system: 'SMASH Cloud' | 'FRIDAY' | 'VERONICA' | 'Security'; tone?: 'ok' | 'info' | 'warn' }

export const events: ActivityEvent[] = [
  { title: 'Application deployment successful', detail: 'Notes 2.3.0 is live', time: '15:48', day: 'Today', system: 'SMASH Cloud', tone: 'ok' },
  { title: 'Deployment Manager started a rollout', detail: 'Notes 2.2.4 to 2.3.0', time: '15:44', day: 'Today', system: 'SMASH Cloud', tone: 'info' },
  { title: 'VERONICA checkpoint saved', detail: 'ckpt-18000, validation loss 1.82', time: '15:19', day: 'Today', system: 'VERONICA', tone: 'ok' },
  { title: 'Sign-in from a new device', detail: 'Safari on macOS, home network', time: '12:02', day: 'Today', system: 'Security', tone: 'warn' },
  { title: 'Model gateway connected', detail: 'GPT, Claude and Local available', time: '10:05', day: 'Today', system: 'FRIDAY', tone: 'ok' },
  { title: 'FRIDAY initialized', detail: 'Memory restored from 214 conversations', time: '10:04', day: 'Today', system: 'FRIDAY', tone: 'ok' },
  { title: 'Offsite sync completed', detail: '7.9 GB uploaded in 21 minutes', time: '03:21', day: 'Today', system: 'SMASH Cloud', tone: 'ok' },
  { title: 'Database backup completed', detail: 'PostgreSQL, 2.1 GB', time: '02:00', day: 'Today', system: 'SMASH Cloud', tone: 'ok' },
  { title: 'Deployment paused, then resumed', detail: 'Notes health check exceeded 30 seconds', time: '23:40', day: 'Yesterday', system: 'SMASH Cloud', tone: 'warn' },
  { title: 'VERONICA checkpoint saved', detail: 'ckpt-17000, validation loss 1.85', time: '21:02', day: 'Yesterday', system: 'VERONICA', tone: 'ok' },
  { title: 'Blocked 214 sign-in attempts', detail: 'From 3 addresses, now on the block list', time: '14:37', day: 'Yesterday', system: 'Security', tone: 'info' },
  { title: 'VERONICA run v0.4-exp started', detail: '1.3B parameters, 30,000 steps planned', time: '09:15', day: 'Friday, October 9', system: 'VERONICA', tone: 'info' },
  { title: 'Immich Photos updated', detail: '1.111 to 1.112', time: '04:10', day: 'Friday, October 9', system: 'SMASH Cloud', tone: 'ok' },
]

export const runs = [
  { version: 'v0.4-exp', params: '1.3B', status: 'Training', steps: '18,400 / 30,000', loss: '1.82', started: 'Oct 9' },
  { version: 'v0.3', params: '780M', status: 'Completed', steps: '24,000', loss: '2.04', started: 'Sep 21' },
  { version: 'v0.2', params: '350M', status: 'Completed', steps: '16,000', loss: '2.41', started: 'Sep 2' },
  { version: 'v0.1', params: '125M', status: 'Completed', steps: '8,000', loss: '3.02', started: 'Aug 18' },
]

export const checkpoints = [
  { name: 'ckpt-18000', loss: '1.82', age: '41 min ago', size: '5.2 GB' },
  { name: 'ckpt-17000', loss: '1.85', age: '18 hours ago', size: '5.2 GB' },
  { name: 'ckpt-16000', loss: '1.87', age: 'Yesterday', size: '5.2 GB' },
  { name: 'ckpt-15000', loss: '1.90', age: '2 days ago', size: '5.2 GB' },
]

export const dataset = [
  { label: 'Web text, filtered', tokens: 14.2, color: 'var(--blue)' },
  { label: 'Books and long-form', tokens: 4.1, color: 'var(--violet)' },
  { label: 'Code', tokens: 2.6, color: '#9fc9ff' },
  { label: 'Technical writing', tokens: 1.3, color: '#e0d2ff' },
]
