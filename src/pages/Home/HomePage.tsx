import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

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
          <button className="btn" onClick={handleLogout} style={{ marginTop: '32px' }}>
            Logout
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomePage;

