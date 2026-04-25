import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();

  return (
    <div className="layout-container">
      <div className="window-frame">
        <button
          type="button"
          className="window-close"
          aria-label="Close window"
          onClick={() => navigate('/home')}
        >
          X
        </button>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
