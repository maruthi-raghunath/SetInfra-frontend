import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ChatLayout from './components/ChatLayout';
import HomePage from './pages/Home/HomePage';
import CreateStudyPage from './pages/CreateStudy/CreateStudyPage';
import UploadFilesPage from './pages/UploadFiles/UploadFilesPage';
import ManageStudy1Page from './pages/ManageStudy/ManageStudy1Page';
import ManageStudy2Page from './pages/ManageStudy/ManageStudy2Page';
import NewChatPage from './pages/Chat/NewChatPage';
import RecentChatPage from './pages/Chat/RecentChatPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import AdminPage from './pages/Admin/AdminPage';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

        {/* Standard pages — padded window-frame */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<HomePage />} />
          <Route path="studies/create" element={<CreateStudyPage />} />
          <Route path="studies/:study_id/upload" element={<UploadFilesPage />} />
          <Route path="studies/manage-1" element={<ManageStudy1Page />} />
          <Route path="studies/:study_id/manage" element={<ManageStudy2Page />} />
        </Route>

        {/* Chat pages — zero-padding ChatLayout for full two-panel fill */}
        <Route path="/chat" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>}>
          <Route path="new" element={<NewChatPage />} />
          <Route path=":chat_id" element={<RecentChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
