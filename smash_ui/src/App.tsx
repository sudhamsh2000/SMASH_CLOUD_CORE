import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cpu, MemoryStick, HardDrive, FolderOpen, Bot, Settings, Clock, Activity, Cloud, Thermometer, Shield, Edit, Trash2, X, Monitor, Database, Bell, Palette, Wifi, Lock, Download, Upload, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
// import { authService } from "./lib/auth";
import { fileDatabaseService } from "./lib/fileDatabase";

// FileItem interface
interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: string;
  modified: string;
  permissions: string;
  uploadedBy?: string;
  mimeType?: string;
  extension?: string;
}
import AdminPanel from "./components/AdminPanel";
import AiConsole from "./components/AiConsole";

// Mock data functions
function generateRandomStats() {
  return {
    cpu: Math.floor(Math.random() * 20) + 15,
    ram: Math.floor(Math.random() * 15) + 45,
    disk: 12
  };
}

function getStorageData(diskUsed: number) {
  return [
    { name: 'Used', value: diskUsed, color: '#8b5cf6' },
    { name: 'Free', value: 100 - diskUsed, color: '#374151' }
  ];
}

function getWeatherData() {
  return { 
    city: 'Chicago', 
    temp: 68, 
    condition: 'Partly Cloudy', 
    icon: '⛅' 
  };
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Logo Component
function Logo({ theme }: { theme: string }) {
  // Define colors based on theme
  const primaryColor = theme === 'light' ? '#0F172A' : '#ffffff';
  const secondaryColor = theme === 'light' ? '#334155' : '#9ca3af';
  
  return (
    <svg 
      width="240" 
      height="60" 
      viewBox="0 0 1024 256" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ 
        maxWidth: '240px', 
        height: 'auto',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
      }}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0A84FF"/>
          <stop offset="100%" stopColor="#00CFFF"/>
        </linearGradient>
      </defs>

      {/* Logomark */}
      <g transform="translate(16,16)">
        {/* cloud base */}
        <path 
          d="M164 142c24.301 0 44-19.699 44-44 0-23.08-17.44-42.2-39.89-43.87C161.11 32.93 135.16 16 105 16 73.59 16 47.6 35.83 40.68 64.2 18.1 67.3 0 86.53 0 110c0 29.82 24.18 54 54 54h110z"
          fill="url(#logoGradient)"
        />

        {/* spark cut (negative space effect) */}
        <path 
          d="M68 76c20 8 40 28 56 70" 
          stroke="#FFFFFF" 
          strokeWidth="10" 
          strokeLinecap="round" 
          opacity="0.9"
        />
      </g>

      {/* Wordmark */}
      <g 
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        transform="translate(230,55)"
      >
        <text 
          x="0" 
          y="75" 
          fontSize="88" 
          fontWeight="800" 
          letterSpacing="-0.5"
          fill={primaryColor}
        >
          SMASH
        </text>
        <text 
          x="0" 
          y="150" 
          fontSize="74" 
          fontWeight="600" 
          letterSpacing="-0.2"
          fill={secondaryColor}
        >
          Cloud
        </text>
      </g>
    </svg>
  );
}

// TopBar Component
function TopBar({ onShowAdmin, theme }: { onShowAdmin: () => void; theme: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '24px', 
      marginBottom: '24px',
      backgroundColor: 'transparent'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Logo theme={theme} />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onShowAdmin}
          style={{
            backgroundColor: 'var(--accent-bg)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <Shield style={{ width: '16px', height: '16px' }} />
          Admin Panel
        </button>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: '500' }}>Admin User</div>
          <div style={{ fontSize: '12px' }}>admin@smash.cloud</div>
        </div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: 'linear-gradient(135deg, #ef4444, #ec4899)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          <Shield style={{ width: '20px', height: '20px', color: 'var(--text-primary)' }} />
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ currentView, onViewChange }: { currentView: string; onViewChange: (view: string) => void }) {
  const menuItems = [
    { icon: Activity, label: "Dashboard", view: "dashboard" },
    { icon: FolderOpen, label: "Files", view: "files" },
    { icon: Bot, label: "AI", view: "ai" },
    { icon: Settings, label: "Settings", view: "settings" }
  ];

  return (
    <div className="glass" style={{ 
      height: '100vh', 
      padding: '24px 12px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '24px'
    }}>
      {menuItems.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="glass-hover"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: currentView === item.view ? 'var(--accent-bg)' : 'transparent',
            border: currentView === item.view ? '1px solid var(--accent-primary)' : '1px solid transparent'
          }}
          onClick={() => onViewChange(item.view)}
        >
          <item.icon style={{ 
            width: '20px', 
            height: '20px', 
            color: currentView === item.view ? 'var(--icon-active)' : 'var(--icon-color)' 
          }} />
        </motion.div>
      ))}
    </div>
  );
}

// SystemStatCard Component
function SystemStatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <div className="glass card-hover" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          background: color, 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Icon style={{ width: '16px', height: '16px', color: 'var(--text-primary)' }} />
        </div>
      </div>
      
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
        {value}%
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: 'var(--input-bg)', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ 
            height: '100%', 
            background: color,
            borderRadius: '4px'
          }}
        />
      </div>
    </div>
  );
}

// StoragePie Component
function StoragePie({ diskUsed }: { diskUsed: number }) {
  const data = getStorageData(diskUsed);

  return (
    <div className="glass card-hover" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '24px' }}>Storage Usage</h3>
      
      <div style={{ height: '200px', marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: item.color, 
              borderRadius: '50%' 
            }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// File Manager Component with Real-time Database
function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileStats, setFileStats] = useState({ totalFiles: 0, totalSize: '0 GB', files: 0, folders: 0 });

  // Subscribe to real-time file updates
  useEffect(() => {
    const unsubscribe = fileDatabaseService.subscribe((updatedFiles) => {
      setFiles(updatedFiles);
      const stats = fileDatabaseService.getFileStats();
      setFileStats({
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        files: stats.files || 0,
        folders: stats.folders || 0
      });
    });

    // Load initial files
    setFiles(fileDatabaseService.getAllFiles());
    const stats = fileDatabaseService.getFileStats();
    setFileStats({
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      files: stats.files || 0,
      folders: stats.folders || 0
    });

    return unsubscribe;
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await fileDatabaseService.uploadFile(file, 'admin@smash.cloud');
      console.log(`✅ File uploaded successfully: ${file.name}`);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      const success = fileDatabaseService.deleteFile(id);
      if (success) {
        console.log(`✅ File deleted successfully`);
        setSelectedFile(null);
      } else {
        console.error('❌ Delete failed');
        alert('Delete failed. Please try again.');
      }
    }
  };

  const handleEditFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file) {
      setEditName(file.name);
      setEditingFile(id);
    }
  };

  const handleSaveEdit = async () => {
    if (editName.trim() && editingFile) {
      const success = fileDatabaseService.updateFile(editingFile, { name: editName.trim() });
      if (success) {
        console.log(`✅ File renamed successfully`);
        setEditingFile(null);
        setEditName('');
      } else {
        console.error('❌ Rename failed');
        alert('Rename failed. Please try again.');
      }
    }
  };


  const handleViewFile = (id: string) => {
    setViewingFile(id);
  };

  const getFileTypeColor = (file: FileItem) => {
    if (file.type === 'folder') {
      return 'var(--accent-bg)';
    }
    
    const extension = file.extension || file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'rgba(239, 68, 68, 0.2)';
      case 'docx':
      case 'doc':
        return 'rgba(59, 130, 246, 0.2)';
      case 'pptx':
      case 'ppt':
        return 'rgba(245, 158, 11, 0.2)';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'rgba(16, 185, 129, 0.2)';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'rgba(139, 92, 246, 0.2)';
      default:
        return 'rgba(107, 114, 128, 0.2)';
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return <FolderOpen style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} />;
    }
    
    const extension = file.extension || file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <HardDrive style={{ width: '24px', height: '24px', color: '#ef4444' }} />;
      case 'docx':
      case 'doc':
        return <HardDrive style={{ width: '24px', height: '24px', color: '#3b82f6' }} />;
      case 'pptx':
      case 'ppt':
        return <HardDrive style={{ width: '24px', height: '24px', color: '#f59e0b' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <HardDrive style={{ width: '24px', height: '24px', color: '#10b981' }} />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <HardDrive style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />;
      default:
        return <HardDrive style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div className="glass" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>File Manager</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {fileStats.totalFiles} items • {fileStats.totalSize} total • {fileStats.files} files, {fileStats.folders} folders
          </p>
      </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isUploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid var(--accent-primary)', 
                borderTop: '2px solid transparent', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }}></div>
              <span style={{ fontSize: '12px' }}>Uploading...</span>
            </div>
          )}
          <input
            type="file"
            id="file-upload"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          <label
            htmlFor="file-upload"
            className="glass-hover"
            style={{
              backgroundColor: isUploading ? 'var(--accent-bg)' : 'var(--accent-bg)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '8px',
              padding: '10px 16px',
              color: 'var(--text-primary)',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              opacity: isUploading ? 0.6 : 1
            }}
          >
            <Cloud style={{ width: '16px', height: '16px' }} />
            {isUploading ? 'Uploading...' : 'Upload File'}
          </label>
        </div>
      </div>

      {/* File Grid - Google Drive Style */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '16px',
          padding: '8px'
        }}>
          {files.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`card-hover ${selectedFile === file.id ? 'neon-glow' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                borderRadius: '12px',
                border: selectedFile === file.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                backgroundColor: selectedFile === file.id ? 'var(--accent-bg)' : 'var(--bg-glass)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                minHeight: '140px'
              }}
              onClick={() => setSelectedFile(selectedFile === file.id ? null : file.id)}
            >
              {/* Large Icon at Top */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: file.type === 'folder' ? 'var(--accent-bg)' : getFileTypeColor(file),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                alignSelf: 'flex-start'
              }}>
                {getFileIcon(file)}
              </div>

              {/* File Name */}
              <div style={{ flex: 1, marginBottom: '8px' }}>
                {editingFile === file.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                    onBlur={handleSaveEdit}
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '6px',
                      padding: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      width: '100%'
                    }}
                    autoFocus
                  />
                ) : (
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    marginBottom: '4px'
                  }}>
                    {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                  </div>
                )}
                
                {/* File Size and Date */}
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)',
                  lineHeight: '1.3'
                }}>
                  <div>{file.size}</div>
                  <div>{new Date(file.modified).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Action Buttons - Show on Hover */}
              {selectedFile === file.id && (
                <div style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  padding: '8px 0 0 0'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewFile(file.id);
                    }}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                    title="View"
                  >
                    <Activity style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                    View
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditFile(file.id);
                    }}
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                    title="Edit"
                  >
                    <Edit style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                    Edit
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                    title="Delete"
                  >
                    <Trash2 style={{ width: '12px', height: '12px', marginRight: '4px' }} />
                    Del
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass" style={{
            padding: '24px',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80%',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                File Viewer
              </h3>
              <button
                onClick={() => setViewingFile(null)}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            
            {(() => {
              const file = files.find(f => f.id === viewingFile);
              return file ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: file.type === 'folder' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getFileIcon(file)}
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>{file.name}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        {file.size} • Modified: {new Date(file.modified).toLocaleDateString()}
                      </div>
                      {file.uploadedBy && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Uploaded by: {file.uploadedBy}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(55, 65, 81, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    {file.type === 'folder' ? (
                      <div>
                        <FolderOpen style={{ width: '48px', height: '48px', color: 'var(--accent-primary)', marginBottom: '12px' }} />
                        <p>This is a folder containing {Math.floor(Math.random() * 50) + 10} items</p>
                      </div>
                    ) : (
                      <div>
                        <HardDrive style={{ width: '48px', height: '48px', color: '#3b82f6', marginBottom: '12px' }} />
                        <p>File preview not available</p>
                        <p style={{ fontSize: '12px', marginTop: '8px' }}>
                          Click "Download" to open this file in your default application
                        </p>
                        {file.mimeType && (
                          <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
                            Type: {file.mimeType}
                          </p>
                        )}
      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button
                      style={{
                        backgroundColor: 'var(--accent-bg)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        flex: 1
                      }}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setViewingFile(null);
                        handleEditFile(file.id);
                      }}
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        flex: 1
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Component
interface SettingsPanelProps {
  settings: any;
  onSettingsChange: (key: string, value: any) => void;
}

function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {

  const [activeTab, setActiveTab] = useState('appearance');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const settingsTabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'backup', label: 'Backup', icon: Database }
  ];

  const handleSettingChange = (key: string, value: any) => {
    onSettingsChange(key, value);
  };

  const handlePasswordChange = () => {
    if (newPassword === confirmPassword && newPassword.length >= 8) {
      alert('Password changed successfully!');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      alert('Passwords do not match or are too short!');
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smash_settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          // Apply each setting individually to trigger proper updates
          Object.keys(importedSettings).forEach(key => {
            onSettingsChange(key, importedSettings[key]);
          });
          alert('Settings imported successfully!');
        } catch (error) {
          alert('Invalid settings file!');
        }
      };
      reader.readAsText(file);
    }
  };

  const renderSettingsContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Font Size
              </label>
              <select
                value={settings.fontSize}
                onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        );

      case 'system':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="glass-hover" style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Auto Backup</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Automatically backup data daily</div>
              </div>
              <button
                onClick={() => handleSettingChange('autoBackup', !settings.autoBackup)}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.autoBackup ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--toggle-knob)',
                  position: 'absolute',
                  top: '2px',
                  left: settings.autoBackup ? '26px' : '2px',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>

            <div className="glass-hover" style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Performance Mode</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Optimize for better performance</div>
              </div>
              <button
                onClick={() => handleSettingChange('performanceMode', !settings.performanceMode)}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.performanceMode ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--toggle-knob)',
                  position: 'absolute',
                  top: '2px',
                  left: settings.performanceMode ? '26px' : '2px',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>

            <div className="glass-hover" style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Debug Mode</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Show detailed system information</div>
              </div>
              <button
                onClick={() => handleSettingChange('debugMode', !settings.debugMode)}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.debugMode ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--toggle-knob)',
                  position: 'absolute',
                  top: '2px',
                  left: settings.debugMode ? '26px' : '2px',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="glass-hover" style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Two-Factor Authentication</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add extra security to your account</div>
              </div>
              <button
                onClick={() => handleSettingChange('twoFactorAuth', !settings.twoFactorAuth)}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.twoFactorAuth ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--toggle-knob)',
                  position: 'absolute',
                  top: '2px',
                  left: settings.twoFactorAuth ? '26px' : '2px',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Session Timeout (minutes)
              </label>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '12px' }}>Change Password</div>
              {!showPasswordChange ? (
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="glass-hover"
                  style={{
                    backgroundColor: 'var(--accent-bg)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Change Password
                </button>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handlePasswordChange}
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowPasswordChange(false)}
                      style={{
                        backgroundColor: 'rgba(107, 114, 128, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'network':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="glass-hover" style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Compression</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Enable data compression</div>
              </div>
              <button
                onClick={() => handleSettingChange('compression', !settings.compression)}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.compression ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--toggle-knob)',
                  position: 'absolute',
                  top: '2px',
                  left: settings.compression ? '26px' : '2px',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Cache Size
              </label>
              <select
                value={settings.cacheSize}
                onChange={(e) => handleSettingChange('cacheSize', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="small">Small (100MB)</option>
                <option value="medium">Medium (500MB)</option>
                <option value="large">Large (1GB)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Bandwidth Limit
              </label>
              <select
                value={settings.bandwidthLimit}
                onChange={(e) => handleSettingChange('bandwidthLimit', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                <option value="unlimited">Unlimited</option>
                <option value="1mb">1 MB/s</option>
                <option value="5mb">5 MB/s</option>
                <option value="10mb">10 MB/s</option>
              </select>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="glass-hover" style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>System Notifications</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Receive system alerts and updates</div>
              </div>
              <button
                onClick={() => handleSettingChange('notifications', !settings.notifications)}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: settings.notifications ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--toggle-knob)',
                  position: 'absolute',
                  top: '2px',
                  left: settings.notifications ? '26px' : '2px',
                  transition: 'left 0.3s ease'
                }} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="glass-hover" style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Show System Stats</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Display system statistics on dashboard</div>
                </div>
                <button
                  onClick={() => handleSettingChange('showSystemStats', !settings.showSystemStats)}
                  style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: settings.showSystemStats ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--toggle-knob)',
                    position: 'absolute',
                    top: '2px',
                    left: settings.showSystemStats ? '26px' : '2px',
                    transition: 'left 0.3s ease'
                  }} />
                </button>
              </div>

              <div className="glass-hover" style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Show Weather</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Display weather information</div>
                </div>
                <button
                  onClick={() => handleSettingChange('showWeather', !settings.showWeather)}
                  style={{
                    width: '48px',
                    height: '24px',
                    borderRadius: '12px',
                    background: settings.showWeather ? 'var(--toggle-active)' : 'var(--toggle-bg)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--toggle-knob)',
                    position: 'absolute',
                    top: '2px',
                    left: settings.showWeather ? '26px' : '2px',
                    transition: 'left 0.3s ease'
                  }} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div className="glass-hover" style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Database style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>Last Backup</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>October 19, 2024 at 9:30 AM</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="glass-hover"
                  style={{
                    backgroundColor: 'var(--button-primary-bg)',
                    border: '1px solid var(--button-primary-border)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <RefreshCw style={{ width: '16px', height: '16px' }} />
                  Backup Now
                </button>
                <button
                  className="glass-hover"
                  style={{
                    backgroundColor: 'var(--button-secondary-bg)',
                    border: '1px solid var(--button-secondary-border)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Download style={{ width: '16px', height: '16px' }} />
                  Restore
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleExportSettings}
                className="glass-hover"
                style={{
                  flex: 1,
                  backgroundColor: 'var(--button-success-bg)',
                  border: '1px solid var(--button-success-border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Download style={{ width: '16px', height: '16px' }} />
                Export Settings
              </button>
              
              <input
                type="file"
                id="import-settings"
                style={{ display: 'none' }}
                onChange={handleImportSettings}
                accept=".json"
              />
              <label
                htmlFor="import-settings"
                className="glass-hover"
                style={{
                  flex: 1,
                  backgroundColor: 'var(--button-warning-bg)',
                  border: '1px solid var(--button-warning-border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textAlign: 'center'
                }}
              >
                <Upload style={{ width: '16px', height: '16px' }} />
                Import Settings
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, marginBottom: '8px' }}>
          Settings
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          Configure your SMASH Cloud preferences and system settings
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
        {/* Settings Tabs */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="glass-hover"
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: activeTab === tab.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-primary)',
                  backgroundColor: activeTab === tab.id ? 'var(--accent-bg)' : 'var(--bg-glass)',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === tab.id ? '0 2px 8px var(--accent-glow)' : 'none'
                }}
              >
                <tab.icon style={{ 
                  width: '16px', 
                  height: '16px',
                  color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--icon-color)'
                }} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderSettingsContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [stats, setStats] = useState(generateRandomStats());
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Settings state for real-time updates
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'dark',
    language: 'en',
    fontSize: 'medium',
    
    // System
    autoBackup: true,
    notifications: true,
    performanceMode: false,
    debugMode: false,
    
    // Security
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordComplexity: 'medium',
    
    // Network
    compression: true,
    cacheSize: 'medium',
    bandwidthLimit: 'unlimited',
    
    // Display
    showSystemStats: true,
    showWeather: true,
    showUptime: true
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('smashSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({ ...prevSettings, ...parsedSettings }));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  // Apply theme changes in real-time
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme using data attribute
    if (settings.theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme'); // Default to dark
    }

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.fontSize = fontSizeMap[settings.fontSize as keyof typeof fontSizeMap] || '16px';
  }, [settings.theme, settings.fontSize]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(generateRandomStats());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Settings change handler
  const handleSettingsChange = (key: string, value: any) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, [key]: value };
      localStorage.setItem('smashSettings', JSON.stringify(updatedSettings));
      
      // Show notification for certain settings
      if (settings.notifications) {
        setNotification({ 
          message: `${key.charAt(0).toUpperCase() + key.slice(1)} setting updated`, 
          type: 'success' 
        });
        setTimeout(() => setNotification(null), 2000);
      }
      
      return updatedSettings;
    });
  };

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: '72px', flexShrink: 0 }}>
          <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <TopBar onShowAdmin={() => setShowAdminPanel(true)} theme={settings.theme} />
          
          {showAdminPanel ? (
            <AdminPanel onClose={() => setShowAdminPanel(false)} />
          ) : currentView === 'files' ? (
            <FileManager />
          ) : currentView === 'ai' ? (
            <div style={{ flex: 1, height: '100%' }}>
              <AiConsole />
            </div>
          ) : currentView === 'settings' ? (
            <div style={{ flex: 1, height: '100%' }}>
              <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
            </div>
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
            {/* System Stats - conditional based on settings */}
            {settings.showSystemStats && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <SystemStatCard
                    title="CPU Usage"
                    value={stats.cpu}
                    icon={Cpu}
                    color="linear-gradient(135deg, #ef4444, #ec4899)"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <SystemStatCard
                    title="Memory Usage"
                    value={stats.ram}
                    icon={MemoryStick}
                    color="linear-gradient(135deg, #3b82f6, #06b6d4)"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <SystemStatCard
                    title="Disk Usage"
                    value={stats.disk}
                    icon={HardDrive}
                    color="linear-gradient(135deg, #8b5cf6, #6366f1)"
                  />
                </motion.div>
              </>
            )}

            {/* Storage Pie Chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <StoragePie diskUsed={stats.disk} />
            </motion.div>

            {/* AI Console */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <AiConsole />
            </motion.div>

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="glass card-hover"
              style={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Clock style={{ width: '16px', height: '16px', color: 'var(--text-primary)' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>System Status</h3>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Current Time</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{getCurrentTime()}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Date</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{getCurrentDate()}</span>
                </div>
                
                {settings.showUptime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Uptime</span>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--accent-primary)' }}>99.9%</span>
                  </div>
                )}
                
                {settings.showWeather && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Location</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{getWeatherData().icon}</span>
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{getWeatherData().city}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Weather</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Thermometer style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                        <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{getWeatherData().temp}°F</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{getWeatherData().condition}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
            </div>
          )}
        </div>
      </div>
      
      {/* Notification Toast */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: notification.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            color: 'var(--text-primary)',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {notification.message}
        </motion.div>
      )}
    </div>
  );
}