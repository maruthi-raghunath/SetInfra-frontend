import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../../services/api';
import { ApiErrorResponse, PaginatedResponse } from '../../types';

interface User {
  id: string;
  username: string;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get<{ data: User[] }>('/auth/users');
      setUsers(res.data.data);
    } catch (err) {
      const apiErr = err as AxiosError<ApiErrorResponse>;
      if (apiErr.response?.status === 401 || apiErr.response?.status === 403) {
        handleLogout();
      } else {
        setError(apiErr.response?.data?.message || 'Failed to load users.');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    if (!selectedUserId) {
      setError('Please select a user first.');
      return;
    }
    setError('');
    setMessage('');
    
    const confirmDelete = window.confirm('Are you sure you want to delete (Y/N)?');
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await api.delete(`/auth/users/${selectedUserId}`);
      setMessage('User deleted successfully.');
      setSelectedUserId('');
      fetchUsers();
    } catch (err) {
      const apiErr = err as AxiosError<ApiErrorResponse>;
      setError(apiErr.response?.data?.message || 'Failed to delete user.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/', { replace: true });
  };

  return (
    <div className="layout-container">
      <div className="window-frame" style={{ maxWidth: 500, minHeight: 'auto', padding: '32px' }}>
        <h2 className="title" style={{ fontSize: '20px' }}>Admin Dashboard</h2>
        
        {message && <div className="chat-error" style={{ margin: '0 0 16px 0', backgroundColor: '#e6ffe6', color: '#006600', border: '1px solid #ccffcc' }}>{message}</div>}
        {error && <div className="chat-error" style={{ margin: '0 0 16px 0' }}>{error}</div>}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>Select user:</label>
            <select
              className="input-field"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">-- Choose User --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              className="btn btn-danger"
              disabled={loading || !selectedUserId}
              onClick={handleDelete}
              style={{ flex: 1 }}
            >
              {loading ? 'Deleting...' : 'Delete user'}
            </button>
            <button
              className="btn"
              onClick={handleLogout}
              style={{ flex: 1 }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
