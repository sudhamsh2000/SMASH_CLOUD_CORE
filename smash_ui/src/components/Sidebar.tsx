import { Home, FolderOpen, Bot, Settings } from "lucide-react";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { icon: Home, label: "Dashboard", view: "dashboard" },
  { icon: FolderOpen, label: "Files", view: "files" },
  { icon: Bot, label: "AI", view: "ai" },
  { icon: Settings, label: "Settings", view: "settings" },
];

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
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
        const isActive = currentView === item.view;
        
        return (
          <div
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Sidebar navigation clicked:', item.view);
              onViewChange(item.view);
            }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: isActive ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
              color: isActive ? '#00FFFF' : '#9ca3af',
              boxShadow: isActive ? '0 0 20px rgba(0, 255, 255, 0.3)' : 'none',
              position: 'relative',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
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
