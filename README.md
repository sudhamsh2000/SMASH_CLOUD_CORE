# SMASH Cloud Core

A portable, self-hosted personal cloud built from the ground up with a focus on reliability, security, and AI‑ready expansion.

## 🚀 Features

### Core Infrastructure
- **Nextcloud** (files, calendar, contacts) with custom SMASH branding
- **Nginx** (production) / **Caddy** (local HTTPS with automatic certificates)
- **MariaDB** (database)
- **Certbot + Let's Encrypt** (automatic SSL certificates)
- **UFW, Fail2ban** (security hardening)
- **Python dashboard** (Rich + Psutil for system monitoring)

### Modern Dashboard UI
- **React + TypeScript + Vite** frontend
- **Glassmorphism design** with dark theme
- **Real-time system monitoring** (CPU, RAM, Disk usage)
- **Interactive AI chat assistant** for cloud management
- **Functional admin panel** with user management
- **File upload interface** with drag-and-drop support
- **Responsive sidebar navigation**

### Admin Controls
- **User Management**: Add, edit, delete users with role-based access
- **System Controls**: Restart services, run backups, security scans
- **Real-time Status**: Monitor Nextcloud, Database, Nginx, SSL certificates
- **Role-based Access**: Admin, User, Guest permissions

### AI Integration
- **SMASH Cloud AI Assistant**: Intelligent chat interface
- **Smart Responses**: Context-aware cloud management advice
- **Real-time Chat**: Interactive AI support for system administration

## 🏗️ Stack

### Backend
- Nextcloud 29 (Apache)
- MariaDB 11
- Nginx (production)
- Caddy 2 (local development)
- PHP-FPM 8.2

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Framer Motion (animations)
- Recharts (data visualization)
- Lucide React (icons)
- Custom CSS (glassmorphism effects)

### Security
- UFW (firewall)
- Fail2ban (intrusion prevention)
- Let's Encrypt SSL certificates
- Role-based access control

## 🌍 Environments

### Local Development
- **Docker Compose**: Fast iteration with Caddy `tls internal`
- **Hot reload**: React development server
- **Mock data**: Realistic system statistics
- **Port**: `http://localhost:5173` (Vite dev server)

### Production (Ubuntu 22.04)
- **Bash bootstrap**: Automated installation script
- **Systemd services**: Background monitoring and backups
- **Nginx**: Production web server with SSL
- **Automated setup**: One-command deployment

## 💾 Storage

- **Single data mount**: `/mnt/smash_data` for app data and snapshots
- **Backup system**: Local rsync snapshots + encrypted offsite sync
- **Health monitoring**: Automated disk usage alerts

## 🚀 Quick Start (Local)

1. **Clone repository**:
   ```bash
   git clone https://github.com/sudhamsh2000/SMASH_CLOUD_CORE.git
   cd SMASH_CLOUD_CORE
   ```

2. **Setup environment**:
   ```bash
   cp infra/docker-compose/.env.sample infra/docker-compose/.env
   # Edit .env with your values
   ```

3. **Start services**:
   ```bash
   cd infra/docker-compose && docker compose up -d
   ```

4. **Start dashboard**:
   ```bash
   cd smash_ui && npm install && npm run dev
   ```

5. **Access**:
   - **Nextcloud**: `https://localhost` (trust local CA)
   - **Dashboard**: `http://localhost:5173`

## 🎯 Project Goals

- **Clean architecture** with clear separation of infra, config, scripts, and docs
- **Secure by default** with automated security hardening
- **Reproducible** and portable across different hardware
- **AI-ready** with integrated chat assistant and smart monitoring
- **User-friendly** with modern React dashboard and intuitive controls

## 📁 Repo Layout

```
SMASH_CLOUD_CORE/
├── docs/                    # Documentation and setup guides
├── infra/                   # Infrastructure configurations
│   ├── docker-compose/      # Local development stack
│   └── nginx/              # Production web server config
├── config/                  # System configurations
│   ├── nginx/              # Nginx virtual hosts
│   └── systemd/            # Service definitions
├── scripts/                # Automation and maintenance
│   ├── smash_bootstrap.sh  # Ubuntu deployment script
│   ├── smash_display.py     # Python system monitor
│   ├── backup_*.sh         # Backup automation
│   └── health_check.sh     # System health monitoring
├── smash_ui/               # React dashboard application
│   ├── src/                # React components and logic
│   ├── public/             # Static assets
│   └── package.json        # Dependencies and scripts
└── README.md               # This file
```

## 🔧 Development

### Dashboard Development
```bash
cd smash_ui
npm install
npm run dev
```

### Docker Services
```bash
cd infra/docker-compose
docker compose up -d
docker compose logs -f
```

### Production Deployment
```bash
# On Ubuntu 22.04 Server
sudo bash scripts/smash_bootstrap.sh
```

## 🛡️ Security Features

- **Automatic SSL**: Let's Encrypt certificates with auto-renewal
- **Firewall**: UFW with restrictive rules
- **Intrusion Prevention**: Fail2ban with custom rules
- **User Management**: Role-based access control
- **Secure Defaults**: Hardened configurations

## 🤖 AI Features

- **Smart Assistant**: Context-aware cloud management help
- **System Monitoring**: Intelligent health checks and alerts
- **Automated Responses**: Pre-configured helpful responses
- **Real-time Chat**: Interactive AI support interface

## 📊 Monitoring

- **System Stats**: Real-time CPU, RAM, Disk monitoring
- **Service Status**: Nextcloud, Database, Nginx health checks
- **Uptime Tracking**: System availability monitoring
- **Weather Integration**: Location-based weather display

## 🔄 Backup & Recovery

- **Local Snapshots**: Rsync-based incremental backups
- **Offsite Sync**: Encrypted cloud storage integration
- **Automated Scheduling**: Cron-based backup automation
- **Health Checks**: Automated backup verification

## 📚 Documentation

See `docs/` directory for:
- Detailed setup guides
- Hardware deployment checklists
- Troubleshooting guides
- Security hardening procedures

## 🎉 Recent Updates

- ✅ **Functional Admin Panel** with user management controls
- ✅ **AI Chat Assistant** with smart cloud management responses
- ✅ **Modern React Dashboard** with glassmorphism design
- ✅ **File Upload Interface** with drag-and-drop support
- ✅ **Real-time System Monitoring** with animated charts
- ✅ **Role-based Access Control** (Admin/User/Guest)
- ✅ **Chicago Weather Integration** (configurable location)
- ✅ **Responsive Navigation** with sidebar controls

## 🚀 Ready for Production

The SMASH Cloud Core is now **production-ready** with:
- Complete admin controls
- AI-powered assistance
- Modern, responsive UI
- Automated security hardening
- Comprehensive monitoring
- Backup and recovery systems

Perfect for deployment on your Beelink mini-PC or any Ubuntu 22.04 server!