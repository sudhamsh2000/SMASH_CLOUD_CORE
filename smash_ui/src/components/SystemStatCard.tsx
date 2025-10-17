import { motion } from "framer-motion";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";

interface SystemStatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export default function SystemStatCard({ title, value, icon: Icon, color }: SystemStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass card-hover"
      style={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: color
          }}>
            <Icon style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', margin: 0 }}>{title}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', margin: 0 }}>{value}%</div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>Usage</div>
        </div>
      </div>
      
      <div style={{ width: '100%', backgroundColor: '#374151', borderRadius: '4px', height: '8px', marginBottom: '8px' }}>
        <motion.div
          style={{ 
            height: '8px', 
            borderRadius: '4px',
            background: color,
            width: `${value}%`
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
        <span>0%</span>
        <span>100%</span>
      </div>
    </motion.div>
  );
}
