# SMASH Cloud Core - Troubleshooting & FAQ

## 🚨 Common Issues & Solutions

### 1. Blank Page Issues

#### **Problem:** Dashboard shows blank page
**Symptoms:**
- White/blank screen
- No console errors
- React app loads but nothing renders

**Solutions:**
1. **Check component exports:**
   ```typescript
   // Ensure all components have proper exports
   export default function App() {
     // component code
   }
   ```

2. **Verify imports:**
   ```typescript
   // Check for naming conflicts
   import { User as UserIcon } from "lucide-react";
   import { User } from "./lib/auth";
   ```

3. **Restart development server:**
   ```bash
   cd smash_ui
   pkill -f "vite"
   npm run dev
   ```

#### **Problem:** Admin Panel shows blank page
**Solutions:**
1. **Check AdminPanel import in App.tsx:**
   ```typescript
   import AdminPanel from "./components/AdminPanel";
   ```

2. **Verify component structure:**
   ```typescript
   function AdminPanel({ onClose }: { onClose: () => void }) {
     return (
       <div className="glass">
         {/* component content */}
       </div>
     );
   }
   export default AdminPanel;
   ```

### 2. Docker Issues

#### **Problem:** Caddy container keeps restarting
**Error:** `caddy.logging.encoders.single_field: module not registered`

**Solution:**
```caddy
# Remove invalid logging format
{
    auto_https off
    log {
        output stdout
        format console  # Use console instead of single_field
    }
}
```

#### **Problem:** Nextcloud connection refused
**Error:** `502 Bad Gateway` or `Connection refused`

**Solutions:**
1. **Check Nextcloud status:**
   ```bash
   docker logs smash_nextcloud
   ```

2. **Verify port configuration:**
   ```yaml
   # docker-compose.yml
   nextcloud:
     ports:
       - "8080:80"  # Ensure port mapping is correct
   ```

3. **Wait for initialization:**
   ```bash
   # Nextcloud takes time to initialize
   docker logs -f smash_nextcloud
   # Wait for "Initial setup finished" message
   ```

#### **Problem:** Database connection issues
**Error:** `SQLSTATE[HY000] [2002] Connection refused`

**Solutions:**
1. **Check MariaDB status:**
   ```bash
   docker logs smash_mariadb
   ```

2. **Verify environment variables:**
   ```bash
   # Check .env file
   cat infra/docker-compose/.env
   ```

3. **Restart services in order:**
   ```bash
   docker compose down
   docker compose up -d mariadb
   sleep 10
   docker compose up -d nextcloud
   docker compose up -d caddy
   ```

### 3. Authentication Issues

#### **Problem:** Cannot sign in
**Error:** Login form doesn't work

**Solutions:**
1. **Check demo credentials:**
   ```
   Email: admin@smash.cloud
   Password: admin123
   ```

2. **Clear browser storage:**
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```

3. **Verify auth service:**
   ```typescript
   // Check if userDB is populated
   console.log(userDB);
   ```

#### **Problem:** Admin panel not accessible
**Solutions:**
1. **Check user role:**
   ```typescript
   // Ensure user has admin role
   const user = authService.getCurrentUser();
   console.log(user?.role); // Should be 'admin'
   ```

2. **Verify permissions:**
   ```typescript
   // Check if user has admin permissions
   const hasAdminAccess = authService.hasPermission('manage_users');
   ```

### 4. File Upload Issues

#### **Problem:** File upload not working
**Solutions:**
1. **Check file input:**
   ```typescript
   // Ensure file input is properly configured
   <input
     type="file"
     id="file-upload"
     onChange={handleFileUpload}
     style={{ display: 'none' }}
   />
   ```

2. **Verify file handling:**
   ```typescript
   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       // Process file
     }
   };
   ```

### 5. Styling Issues

#### **Problem:** TailwindCSS not working
**Error:** `Cannot apply unknown utility class`

**Solutions:**
1. **Complete TailwindCSS removal:**
   ```bash
   npm uninstall tailwindcss postcss autoprefixer @tailwindcss/postcss @tailwindcss/vite
   rm tailwind.config.js postcss.config.js
   ```

2. **Use pure CSS approach:**
   ```css
   /* Use custom utility classes */
   .glass {
     background: rgba(0, 0, 0, 0.3);
     backdrop-filter: blur(10px);
   }
   ```

#### **Problem:** Animations not working
**Solutions:**
1. **Check Framer Motion imports:**
   ```typescript
   import { motion, AnimatePresence } from "framer-motion";
   ```

2. **Verify animation props:**
   ```typescript
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.5 }}
   >
   ```

## 📱 Mobile Access Issues

### **Problem:** Cannot access from phone
**Solutions:**

1. **Find computer IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig | findstr "IPv4"
   ```

2. **Start dev server with network access:**
   ```bash
   npm run dev -- --host
   ```

3. **Access from phone:**
   ```
   http://YOUR_IP:5174
   # Example: http://192.168.1.100:5174
   ```

4. **Check firewall settings:**
   ```bash
   # macOS - Allow incoming connections
   sudo pfctl -f /etc/pf.conf
   ```

## 🔧 Development Issues

### **Problem:** npm install fails
**Error:** `npm error code 1`

**Solutions:**
1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node.js version:**
   ```bash
   node --version  # Should be 16+ for React 18
   ```

### **Problem:** TypeScript errors
**Error:** `Identifier 'User' has already been declared`

**Solutions:**
1. **Use import aliases:**
   ```typescript
   import { User as UserIcon } from "lucide-react";
   import { User } from "./lib/auth";
   ```

2. **Check for duplicate imports:**
   ```typescript
   // Remove duplicate imports
   import { User, UserPlus } from "lucide-react"; // ❌
   import { User as UserIcon, UserPlus } from "lucide-react"; // ✅
   ```

## 🐛 Debugging Tips

### 1. Browser Developer Tools
```javascript
// Check React state
console.log(React.useState);

// Check localStorage
console.log(localStorage.getItem('smashCloudUser'));

// Check component props
console.log(props);
```

### 2. Docker Debugging
```bash
# Check container logs
docker logs smash_nextcloud
docker logs smash_mariadb
docker logs smash_caddy

# Check container status
docker ps -a

# Execute commands in container
docker exec -it smash_nextcloud bash
```

### 3. Network Debugging
```bash
# Check port availability
lsof -i :5174
lsof -i :8080
lsof -i :80

# Test connectivity
curl http://localhost:8080
curl http://localhost:5174
```

## ❓ Frequently Asked Questions

### **Q: Why did we remove TailwindCSS?**
**A:** TailwindCSS v4 had compatibility issues with our setup. We switched to pure CSS for better control and fewer dependencies.

### **Q: Is this production-ready?**
**A:** The current version is a demo/prototype. For production, you'd need:
- Real database backend
- Proper authentication (bcrypt, JWT)
- HTTPS enforcement
- Error handling
- Testing suite

### **Q: Can I customize the UI?**
**A:** Yes! All styling is in `src/index.css` and component inline styles. You can modify colors, animations, and layouts easily.

### **Q: How do I add new features?**
**A:** 
1. Create new components in `src/components/`
2. Add routes in `src/App.tsx`
3. Update sidebar navigation
4. Add any required state management

### **Q: What's the difference between local and production?**
**A:** 
- **Local:** Uses Docker Compose, Caddy for HTTPS, development React server
- **Production:** Uses Ubuntu server, Nginx, Let's Encrypt, compiled React build

### **Q: How do I backup my data?**
**A:** Use the provided backup scripts:
```bash
# Local backup
bash scripts/backup_local.sh

# Offsite backup (configure rclone first)
bash scripts/backup_offsite_rclone.sh
```

### **Q: Can I run this on other operating systems?**
**A:** 
- **macOS:** ✅ Current setup
- **Linux:** ✅ Use production scripts
- **Windows:** ⚠️ Requires WSL2 or Docker Desktop

## 🆘 Getting Help

### 1. Check Logs
```bash
# Application logs
cd smash_ui && npm run dev

# Docker logs
docker compose logs -f

# System logs (Linux)
sudo journalctl -u nginx
```

### 2. Common Commands
```bash
# Restart everything
docker compose down && docker compose up -d
cd smash_ui && npm run dev

# Reset to clean state
docker compose down -v  # Removes volumes
docker compose up -d
```

### 3. Debug Mode
```bash
# Enable verbose logging
export DEBUG=*
npm run dev
```

---

*This troubleshooting guide covers the most common issues encountered during SMASH Cloud Core development and deployment.*
