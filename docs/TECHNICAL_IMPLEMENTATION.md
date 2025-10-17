# SMASH Cloud Core - Technical Implementation Guide

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Nextcloud     │    │   MariaDB       │
│   (Port 5174)   │◄──►│   (Port 8080)   │◄──►│   (Port 3306)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • File Storage  │    │ • User Data     │
│ • Admin Panel   │    │ • API Endpoints │    │ • App Data      │
│ • AI Chat       │    │ • Web Interface │    │ • Config        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Caddy      │
                    │  (Port 80/443) │
                    │                 │
                    │ • Reverse Proxy │
                    │ • SSL/TLS       │
                    │ • Auto HTTPS    │
                    └─────────────────┘
```

## 🔧 Component Architecture

### 1. Authentication Layer (`src/lib/auth.ts`)

**Purpose:** Centralized user management and authentication

**Key Components:**
- `User` interface definition
- `AuthService` class with methods:
  - `login()` - User authentication
  - `logout()` - Session termination
  - `getCurrentUser()` - Current user retrieval
  - `isAdmin()` - Role checking
  - `hasPermission()` - Permission validation
  - `addUser()` - User creation (admin)
  - `updateUser()` - User modification (admin)
  - `deleteUser()` - User removal (admin)

**Implementation Details:**
```typescript
// Mock database for demo purposes
export const userDB: User[] = [
  {
    id: '1',
    username: 'Admin User',
    email: 'admin@smash.cloud',
    passwordHash: 'admin123', // In production: bcrypt hash
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'manage_users', 'system_control'],
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  }
];

// Local storage integration
private saveUserToLocalStorage(user: User) {
  localStorage.setItem('smashCloudUser', JSON.stringify(user));
}
```

### 2. Main Application (`src/App.tsx`)

**Purpose:** Application orchestration and routing

**State Management:**
```typescript
const [stats, setStats] = useState(generateRandomStats());
const [currentView, setCurrentView] = useState('dashboard');
const [showAdminPanel, setShowAdminPanel] = useState(false);
```

**Component Structure:**
- `TopBar` - Navigation and user info
- `Sidebar` - Main navigation menu
- `SystemStatCard` - CPU/RAM/Disk monitoring
- `StoragePie` - Storage visualization
- `AiConsole` - AI chat interface
- `UptimeWeather` - System status display
- `FileManager` - File operations
- `AdminPanel` - Administrative controls

### 3. Admin Panel (`src/components/AdminPanel.tsx`)

**Purpose:** Administrative interface for user and system management

**Features:**
- **User Management:**
  - Add new users
  - Delete existing users
  - Toggle user status (active/inactive)
  - Role assignment (admin/user/guest)

- **System Controls:**
  - Restart services
  - Run backup
  - Update system
  - Security scan
  - System status monitoring

**Implementation:**
```typescript
const handleAddUser = () => {
  if (newUser.name && newUser.email) {
    const user = {
      id: users.length + 1,
      ...newUser,
      status: 'active'
    };
    setUsers([...users, user]);
    setNewUser({ name: '', email: '', role: 'user' });
  }
};
```

### 4. AI Console (`src/components/AiConsole.tsx`)

**Purpose:** Interactive AI assistant for cloud management

**Features:**
- Real-time chat interface
- Contextual responses based on system state
- Message history with user/AI differentiation
- Input validation and error handling

**Response System:**
```typescript
const responses = [
  "Your SMASH Cloud is running optimally! All systems are green.",
  "Welcome to your fresh SMASH Cloud installation. Everything looks great!",
  "Your server uptime is excellent at 99.9%. Keep up the great maintenance!",
  // ... more contextual responses
];
```

### 5. File Management (`src/App.tsx` - FileManager)

**Purpose:** File upload and management interface

**Features:**
- File upload with drag-and-drop
- File listing with metadata
- Folder/file type differentiation
- Size and modification date display

**Upload Implementation:**
```typescript
const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    const newFile = {
      id: files.length + 1,
      name: file.name,
      type: 'file',
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      modified: new Date().toISOString().split('T')[0]
    };
    setFiles([...files, newFile]);
  }
};
```

## 🎨 Styling System

### CSS Architecture

**Base Styles (`src/index.css`):**
```css
/* Global font and background */
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, #0A0F1E 0%, #1a1f2e 100%);
}

/* Glassmorphism utility classes */
.glass {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.glass-hover {
  transition: all 0.3s ease;
}

.glass-hover:hover {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}
```

**Animation System:**
```css
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
  40%, 43% { transform: translate3d(0, -8px, 0); }
  70% { transform: translate3d(0, -4px, 0); }
  90% { transform: translate3d(0, -2px, 0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## 🐳 Docker Configuration

### Service Dependencies

```yaml
services:
  nextcloud:
    depends_on:
      - mariadb
    networks:
      - smash_network

  caddy:
    depends_on:
      - nextcloud
    networks:
      - smash_network
```

### Network Architecture

```yaml
networks:
  smash_network:
    driver: bridge
```

**Service Communication:**
- Caddy → Nextcloud: `nextcloud:80`
- Nextcloud → MariaDB: `mariadb:3306`
- External → Caddy: `localhost:80/443`

## 📊 Data Flow

### 1. User Authentication Flow

```
User Input → AuthService.login() → userDB Lookup → 
Password Validation → LocalStorage Save → UI Update
```

### 2. File Upload Flow

```
File Selection → handleFileUpload() → File Processing → 
State Update → UI Re-render
```

### 3. Admin Operations Flow

```
Admin Action → Component Handler → State Update → 
UI Re-render → User Feedback
```

## 🔒 Security Considerations

### Current Implementation (Demo)
- Plain text passwords in mock database
- Local storage for session management
- No HTTPS enforcement in development

### Production Recommendations
- Implement bcrypt password hashing
- Use secure HTTP-only cookies
- Enable HTTPS with proper certificates
- Implement CSRF protection
- Add rate limiting
- Use environment variables for secrets

## 🚀 Performance Optimizations

### React Optimizations
- `useState` for local state management
- `useEffect` with proper dependency arrays
- Component memoization where appropriate
- Efficient re-rendering patterns

### CSS Optimizations
- Hardware-accelerated animations
- Efficient backdrop-filter usage
- Minimal DOM manipulation
- Optimized transition properties

## 📱 Responsive Design

### Breakpoint Strategy
- Desktop: Full sidebar + grid layout
- Mobile: Collapsed sidebar + stacked layout
- Tablet: Hybrid approach

### Implementation
```css
/* Mobile-first approach */
@media (max-width: 1024px) {
  .sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
  }
}
```

## 🔧 Development Workflow

### 1. Local Development
```bash
# Start Docker stack
cd infra/docker-compose
docker compose up -d

# Start React dev server
cd smash_ui
npm run dev
```

### 2. Testing Strategy
- Manual testing for UI components
- Docker container health checks
- Network connectivity validation
- Cross-browser compatibility

### 3. Deployment Process
```bash
# Production deployment
sudo bash scripts/smash_bootstrap.sh
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 📈 Monitoring and Logging

### System Monitoring
- CPU usage tracking
- Memory utilization
- Disk space monitoring
- Network connectivity

### Application Logging
- User authentication events
- File upload operations
- Admin panel actions
- Error tracking

## 🎯 Future Enhancements

### Planned Features
- Real-time notifications
- Advanced file sharing
- Multi-user collaboration
- Mobile app development
- Advanced AI capabilities
- Backup automation
- Performance analytics

### Technical Debt
- Replace mock database with real backend
- Implement proper authentication
- Add comprehensive testing
- Optimize bundle size
- Add error boundaries
- Implement proper logging

---

*This technical guide provides deep insights into the implementation details of SMASH Cloud Core.*
