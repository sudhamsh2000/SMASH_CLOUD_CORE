import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User as UserIcon, UserPlus, UserMinus, Edit, Shield, Mail, Calendar, Activity, Trash2, Save, X } from "lucide-react";
import { userDB, User, authService } from "../lib/auth";

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

  useEffect(() => {
    loadUsers();
  }, []);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass"
      style={{ padding: '24px', height: '100%', overflow: 'auto' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'white', margin: 0 }}>
          User Management
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAddUser(true)}
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
            <UserPlus style={{ width: '16px', height: '16px' }} />
            Add User
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
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
            <X style={{ width: '16px', height: '16px' }} />
            Close
          </button>
        </div>
      </div>

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
    </motion.div>
  );
}