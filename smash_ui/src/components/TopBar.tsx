import { User } from "lucide-react";

export default function TopBar() {
  return (
    <div className="glass glass-hover" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '24px', 
      marginBottom: '24px' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>☁️</div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#00FFFF', margin: 0 }}>SMASH Cloud</h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '14px', color: '#9ca3af' }}>
          <div style={{ fontWeight: '500' }}>Admin User</div>
          <div style={{ fontSize: '12px' }}>smash@cloud.local</div>
        </div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <User className="w-5 h-5" style={{ color: 'white' }} />
        </div>
      </div>
    </div>
  );
}
