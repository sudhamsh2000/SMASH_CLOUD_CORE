import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { getStorageData } from "../lib/mock";

interface StoragePieProps {
  diskUsed: number;
}

export default function StoragePie({ diskUsed }: StoragePieProps) {
  const data = getStorageData(diskUsed);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass card-hover"
      style={{ padding: '24px' }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', marginBottom: '24px', margin: 0 }}>Storage Usage</h3>
      
      <div style={{ height: '256px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value}%`, '']}
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%',
                backgroundColor: item.color
              }}
            />
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
