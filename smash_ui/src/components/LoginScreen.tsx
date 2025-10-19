import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, User as UserIcon } from 'lucide-react';
import { authService, type User } from '../lib/auth';

// Logo Component for Login Screen
function LoginLogo() {
  return (
    <svg 
      width="120" 
      height="120" 
      viewBox="0 0 256 256" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ 
        filter: 'drop-shadow(0 4px 12px rgba(0, 204, 255, 0.3))'
      }}
    >
      <defs>
        <linearGradient id="loginLogoGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00CFFF"/>
          <stop offset="50%" stopColor="#0A84FF"/>
          <stop offset="100%" stopColor="#00FFFF"/>
        </linearGradient>
      </defs>

      {/* Circular background */}
      <circle 
        cx="128" 
        cy="128" 
        r="100" 
        fill="url(#loginLogoGradient)"
      />

      {/* Cloud shape */}
      <g transform="translate(48, 48)">
        <path 
          d="M80 60c15 0 27-12 27-27 0-14-11-26-25-27C80 20 65 8 48 8 32 8 19 19 18 36 8 37 0 46 0 55c0 12 10 22 22 22h58z"
          fill="#FFFFFF"
          opacity="0.95"
        />
        
        {/* Spark effect */}
        <path 
          d="M45 38c8 4 16 12 24 30" 
          stroke="#00FFFF" 
          strokeWidth="3" 
          strokeLinecap="round" 
          opacity="0.8"
        />
      </g>
    </svg>
  );
}

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await authService.login(email, password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        onLogin(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setEmail('');
    setPassword('');
  };

  // If user is already logged in, show welcome screen
  if (currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0F1E 0%, #1a2332 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Enhanced Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(0, 204, 255, 0.15) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(10, 132, 255, 0.12) 0%, transparent 60%),
            radial-gradient(circle at 40% 40%, rgba(0, 255, 255, 0.08) 0%, transparent 70%)
          `,
          zIndex: 1
        }} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '48px',
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            maxWidth: '420px',
            width: '90%',
            position: 'relative',
            zIndex: 2,
            color: '#1f2937'
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 24px',
            }}
          >
            <LoginLogo />
          </motion.div>

          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            marginBottom: '16px', 
            background: 'linear-gradient(135deg, #00CFFF, #0A84FF)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            SMASH Cloud
          </h1>
          
          <div style={{ marginBottom: '32px' }}>
            <p style={{ fontSize: '16px', color: '#374151', marginBottom: '8px', fontWeight: '500' }}>
              Welcome back, {currentUser.username}
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {currentUser.email}
            </p>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: currentUser.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 204, 255, 0.1)',
              color: currentUser.role === 'admin' ? '#dc2626' : '#0A84FF',
              fontSize: '12px',
              fontWeight: '600',
              marginTop: '8px',
              border: `1px solid ${currentUser.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 204, 255, 0.2)'}`
            }}>
              {currentUser.role.toUpperCase()}
            </div>
          </div>

          <button
            onClick={() => onLogin(currentUser)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #00CFFF, #0A84FF)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 204, 255, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 204, 255, 0.4)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #00FFFF, #0080FF)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 204, 255, 0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #00CFFF, #0A84FF)';
            }}
          >
            Enter Dashboard
          </button>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              background: 'transparent',
              color: '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Switch Account
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0F1E 0%, #1a2332 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Enhanced Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(0, 204, 255, 0.15) 0%, transparent 60%),
          radial-gradient(circle at 80% 20%, rgba(10, 132, 255, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 40% 40%, rgba(0, 255, 255, 0.08) 0%, transparent 70%)
        `,
        zIndex: 1
      }} />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '48px',
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          maxWidth: '420px',
          width: '90%',
          position: 'relative',
          zIndex: 2,
          color: '#1f2937'
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 32px',
          }}
        >
          <LoginLogo />
        </motion.div>

        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          marginBottom: '8px', 
          background: 'linear-gradient(135deg, #00CFFF, #0A84FF)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          textAlign: 'center',
          letterSpacing: '-0.5px'
        }}>
          SMASH Cloud
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280', 
          textAlign: 'center', 
          marginBottom: '32px',
          fontWeight: '400'
        }}>
          Sign in to access your dashboard
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '8px', fontWeight: '500' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                width: '18px', 
                height: '18px', 
                color: '#9ca3af' 
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@smash.cloud"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '12px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  color: '#1f2937',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00CFFF';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 204, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#374151', marginBottom: '8px', fontWeight: '500' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                width: '18px', 
                height: '18px', 
                color: '#9ca3af' 
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '12px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  color: '#1f2937',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00CFFF';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 204, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
                onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center',
                fontWeight: '500'
              }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: isLoading 
                ? 'linear-gradient(135deg, #9ca3af, #6b7280)' 
                : 'linear-gradient(135deg, #00CFFF, #0A84FF)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: isLoading 
                ? 'none' 
                : '0 4px 12px rgba(0, 204, 255, 0.3)'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 204, 255, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #00FFFF, #0080FF)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 204, 255, 0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #00CFFF, #0A84FF)';
              }
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '32px', 
          padding: '16px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '12px', 
          fontSize: '12px', 
          color: '#6b7280',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Demo Accounts:</div>
          <div style={{ marginBottom: '4px' }}>Admin: admin@smash.cloud / admin123</div>
          <div style={{ marginBottom: '4px' }}>User: user1@smash.cloud / user123</div>
          <div>Guest: guest@smash.cloud / guest123</div>
        </div>
      </motion.div>
    </div>
  );
}
