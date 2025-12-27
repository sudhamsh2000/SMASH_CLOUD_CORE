// Admin panel component for user and system management
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  User as UserIcon, UserPlus, Edit, Shield, Mail, Calendar, Activity, Trash2, X,
  Server, Monitor, Database, Container, Network, RefreshCw,
  Play, Square, RotateCcw
} from "lucide-react";
import { userDB, type User } from "../lib/auth";
import { systemService, type SystemInfo } from "../lib/systemService";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);

  // New user form state
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest',
    password: ''
  });

  // Edit user form state
  const [editUser, setEditUser] = useState({
    username: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'guest',
    isActive: true,
    permissions: [] as string[]
  });

  // System information state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'server' | 'docker'>('users');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
    initializeSystemInfo();
    
    // Start real-time updates
    systemService.startRealTimeUpdates(3000);
    systemService.addUpdateListener(handleSystemUpdate);
    
    return () => {
      systemService.stopRealTimeUpdates();
      systemService.removeUpdateListener(handleSystemUpdate);
    };
  }, []);

  const initializeSystemInfo = async () => {
    try {
      const info = {
        server: await systemService.getServerInfo(),
        containers: await systemService.getDockerContainers(),
        images: await systemService.getDockerImages(),
        volumes: await systemService.getDockerVolumes(),
        networks: await systemService.getDockerNetworks()
      };
      setSystemInfo(info);
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const handleSystemUpdate = (data: SystemInfo) => {
    setSystemInfo(data);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadUsers(),
      initializeSystemInfo()
    ]);
    setIsRefreshing(false);
  };

  const handleContainerAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
    // In a real implementation, this would call Docker API
    console.log(`Performing ${action} on container ${containerId}`);
    // For now, just refresh the data to simulate the action
    await initializeSystemInfo();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userList = await userDB.getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userDB.createUser({
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        permissions: getDefaultPermissions(newUser.role),
        isActive: true
      }, newUser.password);
      
      setNewUser({ username: '', email: '', role: 'user', password: '' });
      setShowAddUser(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      await userDB.updateUser(selectedUser.id, editUser);
      setIsEditing(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userDB.deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const getDefaultPermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'delete', 'admin', 'manage_users', 'system_control'];
      case 'user':
        return ['read', 'write'];
      case 'guest':
        return ['read'];
      default:
        return ['read'];
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'user': return '#3b82f6';
      case 'guest': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'user': return <UserIcon className="w-4 h-4" />;
      case 'guest': return <UserIcon className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="glass" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid transparent', borderTop: '3px solid #00FFFF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#d1d5db' }}>Loading users...</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return renderUsersTab();
      case 'server':
        return renderServerTab();
      case 'docker':
        return renderDockerTab();
      default:
        return renderUsersTab();
    }
  };

  const renderUsersTab = () => (
    <>
      {/* Users List */}
      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        {users.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-hover"
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: selectedUser?.id === user.id ? '2px solid #00FFFF' : '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer'
            }}
            onClick={() => {
              setSelectedUser(user);
              setEditUser({
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                permissions: user.permissions
              });
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: getRoleColor(user.role),
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {getRoleIcon(user.role)}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', margin: '0 0 4px 0' }}>
                    {user.username}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                    {user.email}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  backgroundColor: getRoleColor(user.role),
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {user.role.toUpperCase()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id);
                  }}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass"
          style={{ padding: '24px', marginBottom: '24px' }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
            Add New User
          </h3>
          <form onSubmit={handleAddUser}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' | 'guest' })}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="guest">Guest</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: 'rgba(0, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                style={{
                  backgroundColor: 'rgba(107, 114, 128, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* User Details */}
      {selectedUser && !showAddUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass"
          style={{ padding: '24px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>
              User Details
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                backgroundColor: 'rgba(0, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Edit style={{ width: '16px', height: '16px' }} />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleEditUser}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUser.username}
                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid #4b5563',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid #4b5563',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                    Role
                  </label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as 'admin' | 'user' | 'guest' })}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: '1px solid #4b5563',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  >
                    <option value="guest">Guest</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'rgba(0, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span style={{ color: '#d1d5db' }}>{selectedUser.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span style={{ color: '#d1d5db' }}>{selectedUser.role.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span style={{ color: '#d1d5db' }}>Created: {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Activity style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span style={{ color: '#d1d5db' }}>Last Login: {new Date(selectedUser.lastLogin).toLocaleDateString()}</span>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>Permissions:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedUser.permissions.map((permission) => (
                    <span
                      key={permission}
                      style={{
                        backgroundColor: 'rgba(0, 255, 255, 0.2)',
                        color: '#00FFFF',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </>
  );

  const renderServerTab = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      {systemInfo && (
        <>
          {/* Server Overview */}
          <div style={{ 
            padding: '24px', 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.6) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Server style={{ width: '24px', height: '24px', color: '#00FFFF' }} />
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                margin: 0,
                letterSpacing: '-0.3px'
              }}>Server Overview</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(10, 15, 30, 0.6) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Hostname</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: 'white' }}>{systemInfo.server.hostname}</div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(10, 15, 30, 0.6) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>OS</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'white' }}>{systemInfo.server.os}</div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(10, 15, 30, 0.6) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Uptime</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'white' }}>{systemInfo.server.uptime}</div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(10, 15, 30, 0.6) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>CPU</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'white' }}>{systemInfo.server.cpuUsage}%</div>
              </div>
            </div>
          </div>

          {/* System Resources */}
          <div style={{ 
            padding: '24px', 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.6) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Monitor style={{ width: '24px', height: '24px', color: '#00FFFF' }} />
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                margin: 0,
                letterSpacing: '-0.3px'
              }}>System Resources</h3>
            </div>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* CPU Usage */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#d1d5db' }}>CPU Usage</span>
                  <span style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>{systemInfo.server.cpuUsage}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(55, 65, 81, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${systemInfo.server.cpuUsage}%`, 
                    backgroundColor: '#00FFFF',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Memory Usage */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#d1d5db' }}>Memory Usage</span>
                  <span style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>{systemInfo.server.memoryUsed}/{systemInfo.server.memoryTotal}</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(55, 65, 81, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${systemInfo.server.memoryUsage}%`, 
                    backgroundColor: '#3b82f6',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              {/* Disk Usage */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#d1d5db' }}>Disk Usage</span>
                  <span style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>{systemInfo.server.diskUsed}/{systemInfo.server.diskTotal}</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'rgba(55, 65, 81, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${systemInfo.server.diskUsage}%`, 
                    backgroundColor: '#ef4444',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Network Interfaces */}
          <div style={{ 
            padding: '24px', 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.6) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Network style={{ width: '24px', height: '24px', color: '#00FFFF' }} />
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                margin: 0,
                letterSpacing: '-0.3px'
              }}>Network</h3>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {systemInfo.server.networkInterfaces.map((iface, index) => (
                <div key={index} style={{ 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(10, 15, 30, 0.6) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>{iface.name}</div>
                  <div style={{ fontSize: '14px', color: '#d1d5db' }}>IP: {iface.ip}</div>
                  <div style={{ fontSize: '14px', color: '#d1d5db' }}>MAC: {iface.mac}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderDockerTab = () => (
    <div style={{ display: 'grid', gap: '24px' }}>
      {systemInfo && (
        <>
          {/* Docker Containers */}
          <div className="glass-hover" style={{ 
            padding: '24px', 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.6) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Container style={{ width: '24px', height: '24px', color: '#00FFFF' }} />
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                margin: 0,
                letterSpacing: '-0.3px'
              }}>Docker Containers</h3>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {systemInfo.containers.map((container) => (
                <div key={container.id} className="glass-hover" style={{ 
                  padding: '20px', 
                  background: container.status === 'running'
                    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(10, 15, 30, 0.4) 100%)',
                  borderRadius: '16px',
                  border: container.status === 'running' 
                    ? '1px solid rgba(0, 255, 255, 0.3)' 
                    : '1px solid rgba(239, 68, 68, 0.4)',
                  backdropFilter: 'blur(15px)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  boxShadow: container.status === 'running'
                    ? '0 4px 15px rgba(0, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 4px 15px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = container.status === 'running' 
                    ? 'rgba(0, 255, 255, 0.5)' 
                    : 'rgba(239, 68, 68, 0.6)';
                  e.currentTarget.style.background = container.status === 'running'
                    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(10, 15, 30, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(10, 15, 30, 0.6) 100%)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = container.status === 'running' 
                    ? 'rgba(0, 255, 255, 0.3)' 
                    : 'rgba(239, 68, 68, 0.4)';
                  e.currentTarget.style.background = container.status === 'running'
                    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.4) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(10, 15, 30, 0.4) 100%)';
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>{container.name}</div>
                      <div style={{ fontSize: '14px', color: '#00FFFF', opacity: 0.8 }}>{container.image}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: container.status === 'running' 
                          ? 'rgba(0, 255, 255, 0.2)' 
                          : 'rgba(239, 68, 68, 0.2)',
                        color: container.status === 'running' ? '#00FFFF' : '#ff6b6b',
                        border: container.status === 'running' 
                          ? '1px solid rgba(0, 255, 255, 0.3)' 
                          : '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {container.status.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleContainerAction(container.id, container.status === 'running' ? 'stop' : 'start')}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: container.status === 'running' 
                              ? 'rgba(239, 68, 68, 0.2)' 
                              : 'rgba(0, 255, 255, 0.2)',
                            color: container.status === 'running' ? '#ff6b6b' : '#00FFFF',
                            cursor: 'pointer',
                            border: container.status === 'running' 
                              ? '1px solid rgba(239, 68, 68, 0.3)' 
                              : '1px solid rgba(0, 255, 255, 0.3)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = container.status === 'running' 
                              ? 'rgba(239, 68, 68, 0.3)' 
                              : 'rgba(0, 255, 255, 0.3)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = container.status === 'running' 
                              ? 'rgba(239, 68, 68, 0.2)' 
                              : 'rgba(0, 255, 255, 0.2)';
                          }}
                        >
                          {container.status === 'running' ? <Square size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleContainerAction(container.id, 'restart')}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 204, 255, 0.3)',
                            backgroundColor: 'rgba(0, 204, 255, 0.1)',
                            color: '#00CFFF',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 204, 255, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(0, 204, 255, 0.5)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 204, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(0, 204, 255, 0.3)';
                          }}
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '20px', 
                    fontSize: '13px'
                  }}>
                    <div style={{ 
                      padding: '12px',
                      backgroundColor: 'rgba(0, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 255, 0.1)'
                    }}>
                      <div style={{ color: '#00FFFF', marginBottom: '6px', fontWeight: '500' }}>CPU Usage</div>
                      <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{container.cpuUsage.toFixed(1)}%</div>
                    </div>
                    <div style={{ 
                      padding: '12px',
                      backgroundColor: 'rgba(0, 132, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 132, 255, 0.1)'
                    }}>
                      <div style={{ color: '#0A84FF', marginBottom: '6px', fontWeight: '500' }}>Memory</div>
                      <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{container.memoryUsage}/{container.memoryLimit}</div>
                    </div>
                    <div style={{ 
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ color: '#9ca3af', marginBottom: '6px', fontWeight: '500' }}>Created</div>
                      <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{new Date(container.created).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Docker Images */}
          <div className="glass-hover" style={{ 
            padding: '24px', 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 15, 30, 0.6) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Database style={{ width: '24px', height: '24px', color: '#00FFFF' }} />
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                margin: 0,
                letterSpacing: '-0.3px'
              }}>Docker Images</h3>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {systemInfo.images.map((image) => (
                <div key={image.id} className="glass-hover" style={{ 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  backdropFilter: 'blur(15px)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(0, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(10, 15, 30, 0.6) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.06) 0%, rgba(10, 15, 30, 0.4) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
                        {image.repository}:{image.tag}
                      </div>
                      <div style={{ fontSize: '12px', color: '#00FFFF', opacity: 0.7 }}>{image.id.substring(0, 12)}...</div>
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#00FFFF', 
                      fontWeight: '500',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(0, 255, 255, 0.1)',
                      borderRadius: '6px'
                    }}>{image.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        padding: '24px', 
        height: '100%', 
        overflow: 'auto',
        background: 'linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(26, 32, 50, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 255, 0.1)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          margin: 0,
          letterSpacing: '-0.5px'
        }}>
          Admin Panel
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              background: isRefreshing 
                ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.3), rgba(75, 85, 99, 0.2))' 
                : 'linear-gradient(135deg, rgba(0, 204, 255, 0.2), rgba(59, 130, 246, 0.15))',
              border: '1px solid rgba(0, 204, 255, 0.3)',
              borderRadius: '12px',
              padding: '10px 16px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing ? 0.6 : 1,
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 204, 255, 0.3), rgba(59, 130, 246, 0.25))';
                e.currentTarget.style.borderColor = 'rgba(0, 204, 255, 0.5)';
              }
            }}
            onMouseOut={(e) => {
              if (!isRefreshing) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 204, 255, 0.2), rgba(59, 130, 246, 0.15))';
                e.currentTarget.style.borderColor = 'rgba(0, 204, 255, 0.3)';
              }
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {activeTab === 'users' && (
            <button
              onClick={() => setShowAddUser(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 204, 255, 0.15))',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '12px',
                padding: '10px 16px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 204, 255, 0.25))';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 204, 255, 0.15))';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)';
              }}
            >
              <UserPlus style={{ width: '16px', height: '16px' }} />
              Add User
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Close button clicked');
              onClose();
            }}
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15))',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '10px 16px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500',
              position: 'relative',
              zIndex: 1
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.25))';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15))';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
            Close
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'users', label: 'Users', icon: UserIcon },
          { id: 'server', label: 'Server', icon: Server },
          { id: 'docker', label: 'Docker', icon: Container }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Tab clicked:', tab.id);
              setActiveTab(tab.id as any);
            }}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: activeTab === tab.id 
                ? '1px solid rgba(0, 255, 255, 0.4)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 204, 255, 0.1))' 
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(10, 15, 30, 0.3))',
              color: activeTab === tab.id ? '#00FFFF' : '#d1d5db',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 1
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 255, 0.12), rgba(0, 204, 255, 0.08))';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.3)';
                e.currentTarget.style.color = '#00FFFF';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(10, 15, 30, 0.3))';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#d1d5db';
              }
            }}
          >
            <tab.icon style={{ width: '16px', height: '16px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </motion.div>
  );
}
