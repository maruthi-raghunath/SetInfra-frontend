import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../../services/api';
import { ApiErrorResponse } from '../../types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  
  const [errorUsername, setErrorUsername] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorRepeat, setErrorRepeat] = useState('');
  const [globalError, setGlobalError] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Standard constraints: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const isValidPassword = (pwd: string) => {
    const minLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleUsernameBlur = async () => {
    if (!username.trim()) return;
    setErrorUsername('');
    try {
      const res = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
      if (!res.data.is_unique) {
        setErrorUsername('User name not available. Choose another user name.');
      }
    } catch {
      setErrorUsername('Could not verify username availability.');
    }
  };

  const handlePasswordBlur = () => {
    if (!password) return;
    if (!isValidPassword(password)) {
      setErrorPassword('Password must be 8+ chars and contain uppercase, lowercase, number, and special character. Please re-enter password.');
    } else {
      setErrorPassword('');
    }
  };

  const handleRepeatBlur = () => {
    if (!repeatPassword) return;
    if (password !== repeatPassword) {
      setErrorRepeat('Passwords do not match.');
    } else {
      setErrorRepeat('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (errorUsername || errorPassword || errorRepeat) return;
    if (!username.trim() || !password || !repeatPassword) {
      setGlobalError('Please fill out all fields correctly.');
      return;
    }

    setIsLoading(true);
    setGlobalError('');

    try {
      await api.post('/auth/register', { username, password });
      setIsSuccess(true);
    } catch (err) {
      const apiErr = err as AxiosError<ApiErrorResponse>;
      setGlobalError(apiErr.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="layout-container">
        <div className="window-frame" style={{ maxWidth: 440, minHeight: 'auto', padding: '32px', textAlign: 'center' }}>
          <h2 className="title">Success</h2>
          <p className="message success">Sign Up is successful</p>
          <button className="btn" style={{ marginTop: '20px' }} onClick={() => navigate('/login')}>
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <div className="window-frame" style={{ maxWidth: 440, minHeight: 'auto', padding: '32px' }}>
        <h2 className="title" style={{ fontSize: '20px' }}>SetInfra New User Sign Up</h2>
        
        {globalError && <div className="chat-error" style={{ margin: '0 0 16px 0' }}>{globalError}</div>}
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>User Name</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={handleUsernameBlur}
              placeholder="Choose a username"
            />
            {errorUsername && <span style={{ fontSize: '11px', color: '#9a2d2d' }}>{errorUsername}</span>}
          </div>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handlePasswordBlur}
              placeholder="Choose a password"
            />
            {errorPassword && <span style={{ fontSize: '11px', color: '#9a2d2d', lineHeight: 1.4 }}>{errorPassword}</span>}
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Re-enter password</label>
            <input
              type="password"
              className="input-field"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              onBlur={handleRepeatBlur}
              placeholder="Confirm your password"
            />
            {errorRepeat && <span style={{ fontSize: '11px', color: '#9a2d2d' }}>{errorRepeat}</span>}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="submit"
              className="btn"
              disabled={isLoading || !!errorUsername || !!errorPassword || !!errorRepeat || !username || !password || !repeatPassword}
              style={{ flex: 1 }}
            >
              Sign up
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => navigate('/login')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
