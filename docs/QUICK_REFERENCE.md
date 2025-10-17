# SMASH Cloud Core - Quick Reference

## 🚀 Quick Start Commands

### **Start Everything**
```bash
# Start Docker stack
cd infra/docker-compose
docker compose up -d

# Start React dashboard
cd ../../smash_ui
npm run dev
```

### **Stop Everything**
```bash
# Stop React dev server
pkill -f "vite"

# Stop Docker containers
cd infra/docker-compose
docker compose down
```

### **Access URLs**
- **Nextcloud:** http://localhost:8080
- **React Dashboard:** http://localhost:5174
- **Caddy (HTTPS):** https://localhost

## 🔑 Demo Credentials

### **Nextcloud Login**
```
Username: admin
Password: smash123
```

### **React Dashboard Login**
```
Email: admin@smash.cloud
Password: admin123
```

## 📁 Key File Locations

### **Configuration Files**
```
infra/docker-compose/
├── docker-compose.yml    # Docker services
├── Caddyfile            # Caddy configuration
└── .env                 # Environment variables

config/nginx/
└── smash.conf           # Production Nginx config

scripts/
├── smash_bootstrap.sh   # Ubuntu deployment
├── backup_local.sh      # Local backup
└── health_check.sh      # System monitoring
```

### **React Application**
```
smash_ui/
├── src/
│   ├── App.tsx          # Main application
│   ├── index.css        # Global styles
│   ├── lib/
│   │   └── auth.ts      # Authentication
│   └── components/
│       ├── AdminPanel.tsx
│       └── AiConsole.tsx
├── package.json         # Dependencies
└── vite.config.ts      # Build configuration
```

## 🛠️ Common Commands

### **Docker Management**
```bash
# View running containers
docker ps

# View logs
docker logs smash_nextcloud
docker logs smash_mariadb
docker logs smash_caddy

# Restart specific service
docker compose restart nextcloud

# Rebuild containers
docker compose up -d --build
```

### **Development**
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### **System Monitoring**
```bash
# Check system resources
bash scripts/health_check.sh

# View system stats
python3 scripts/smash_display.py

# Check service status
systemctl status nginx
systemctl status mariadb
```

## 🎨 Customization

### **Colors & Theme**
```css
/* src/index.css */
:root {
  --primary-bg: #0A0F1E;
  --secondary-bg: #1a1f2e;
  --accent-color: #00FFFF;
  --glass-bg: rgba(0, 0, 0, 0.3);
}
```

### **Add New Components**
```typescript
// 1. Create component file
// src/components/NewComponent.tsx

// 2. Import in App.tsx
import NewComponent from "./components/NewComponent";

// 3. Add to render
<NewComponent />
```

### **Modify Sidebar Navigation**
```typescript
// src/App.tsx - Sidebar component
const menuItems = [
  { icon: Activity, label: "Dashboard", view: "dashboard" },
  { icon: FolderOpen, label: "Files", view: "files" },
  { icon: Bot, label: "AI", view: "ai" },
  { icon: Settings, label: "Settings", view: "settings" },
  // Add new item here
  { icon: NewIcon, label: "New Feature", view: "new" }
];
```

## 🔧 Troubleshooting Quick Fixes

### **Blank Page**
```bash
# Restart dev server
pkill -f "vite" && npm run dev
```

### **Docker Issues**
```bash
# Reset everything
docker compose down -v
docker compose up -d
```

### **Port Conflicts**
```bash
# Check what's using ports
lsof -i :5174
lsof -i :8080
lsof -i :80
```

### **Clear Browser Cache**
```javascript
// In browser console
localStorage.clear();
location.reload();
```

## 📱 Mobile Access

### **Find Your IP**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

### **Start Network Server**
```bash
npm run dev -- --host
```

### **Access from Phone**
```
http://YOUR_IP:5174
# Example: http://192.168.1.100:5174
```

## 🚀 Production Deployment

### **Ubuntu Server Setup**
```bash
# Run bootstrap script
sudo bash scripts/smash_bootstrap.sh

# Enable services
sudo systemctl enable nginx
sudo systemctl start nginx
```

### **SSL Certificate**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com
```

## 📊 Monitoring Commands

### **System Health**
```bash
# CPU usage
top

# Memory usage
free -h

# Disk usage
df -h

# Network connections
netstat -tulpn
```

### **Application Logs**
```bash
# Nextcloud logs
tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -f

# Docker logs
docker compose logs -f
```

## 🔐 Security Checklist

### **Production Security**
- [ ] Change default passwords
- [ ] Enable HTTPS
- [ ] Configure firewall (UFW)
- [ ] Install Fail2ban
- [ ] Regular backups
- [ ] Update system packages
- [ ] Disable root login
- [ ] Use SSH keys

### **Application Security**
- [ ] Implement proper authentication
- [ ] Use environment variables for secrets
- [ ] Add CSRF protection
- [ ] Implement rate limiting
- [ ] Regular security updates

## 📈 Performance Tips

### **Docker Optimization**
```yaml
# docker-compose.yml
services:
  nextcloud:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### **React Optimization**
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(() => {
  // component code
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

## 🎯 Feature Roadmap

### **Completed ✅**
- Docker stack setup
- React dashboard
- User authentication
- Admin panel
- File management
- AI chat interface
- System monitoring
- Production deployment scripts

### **Planned 🚧**
- Real-time notifications
- Advanced file sharing
- Mobile app
- Advanced AI features
- Automated backups
- Performance analytics
- Multi-language support

---

*This quick reference provides essential commands and information for SMASH Cloud Core development and deployment.*
