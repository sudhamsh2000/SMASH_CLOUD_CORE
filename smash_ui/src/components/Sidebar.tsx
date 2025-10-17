import { Home, FolderOpen, Bot, Settings } from "lucide-react";

const menuItems = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: FolderOpen, label: "Files", active: false },
  { icon: Bot, label: "AI", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export default function Sidebar() {
  return (
    <div className="glass" style={{ 
      width: '72px', 
      height: '100%', 
      padding: '16px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '24px' 
    }}>
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: item.active ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
              color: item.active ? '#00FFFF' : '#9ca3af',
              boxShadow: item.active ? '0 0 20px rgba(0, 255, 255, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!item.active) {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.active) {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon style={{ width: '24px', height: '24px' }} />
          </div>
        );
      })}
    </div>
  );
}
