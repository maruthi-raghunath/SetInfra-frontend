import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../../services/api';
import { ApiErrorResponse } from '../../types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear any stale token so the app always starts fresh from the login screen
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setError('');
    setIsLoading(true);
    console.log("Login attempt started for:", username);

    try {
      console.log("Sending POST to /api/auth/login...");
      const res = await api.post('/auth/login', { username, password });
      console.log("Login successful, received token.");
      localStorage.setItem('token', res.data.access_token);
      if (res.data.username === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      console.error("Login request failed:", err);
      const apiErr = err as AxiosError<ApiErrorResponse>;
      if (apiErr.response?.data?.message) {
        setError(apiErr.response.data.message);
      } else if (apiErr.response?.status === 401) {
        setError('Invalid username or password.');
      } else if (apiErr.request) {
        setError('Cannot reach the server. Please check your connection.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="layout-container">
      <div className="window-frame" style={{ maxWidth: 440, minHeight: 'auto', padding: '32px' }}>
        <h2 className="title">SetInfra Login</h2>
        
        {error && <div className="chat-error" style={{ margin: '0 0 16px 0' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>UserName</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="submit"
              className="btn"
              disabled={isLoading || !username.trim() || !password}
              style={{ flex: 1 }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => navigate('/register')}
            >
              New User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
