import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

/**
 * ChatLayout: the same outer window-frame as Layout, but with zero padding
 * so the two-panel chat screen can fill all the way to the border lines.
 */
const ChatLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="layout-container">
      <div className="window-frame" style={{ padding: 0 }}>
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

export default ChatLayout;
