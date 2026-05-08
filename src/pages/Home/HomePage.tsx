import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const HomePage = () => {
  const navigate = useNavigate();
  const [useLocal, setUseLocal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get<{use_local_embedding: boolean}>('/health');
        setUseLocal(res.data.use_local_embedding);
      } catch (err) {
        console.error('Failed to fetch config', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleToggle = async () => {
    const newValue = !useLocal;
    try {
      await api.post('/health/config', { use_local_embedding: newValue });
      setUseLocal(newValue);
    } catch (err) {
      alert('Failed to update config');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/', { replace: true });
  };

  return (
    <section className="screen">
      <h1 className="title">SetInfra</h1>
      <div className="screen-body">
        <div className="button-stack">
          <button className="btn" onClick={() => navigate('/studies/create')}>
            Create Study
          </button>
          <button className="btn" onClick={() => navigate('/studies/manage-1')}>
            Manage Study
          </button>
          <button id="btn-run-analytics" className="btn" onClick={() => navigate('/chat/new')}>
            Run Analytics
          </button>

          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Embedding Mode:</span>
              <button 
                className="btn-small" 
                onClick={handleToggle}
                disabled={loading}
                style={{ backgroundColor: useLocal ? '#f7d8d8' : '#d8ecd8', minWidth: '120px' }}
              >
                {loading ? '...' : (useLocal ? 'Local (CPU)' : 'Gemini API')}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#888', maxWidth: '300px', textAlign: 'center' }}>
              Gemini API is recommended for Render Free Tier to prevent crashes.
            </p>
          </div>

          <button className="btn" onClick={handleLogout} style={{ marginTop: '20px' }}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomePage;
