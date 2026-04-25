import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ApiErrorResponse, DeleteStatusResponse, PaginatedResponse, Study } from '../../types';

const ManageStudy1Page = () => {
  const navigate = useNavigate();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStudies = async () => {
    setError('');
    try {
      const res = await api.get<PaginatedResponse<Study>>('/studies');
      setStudies(res.data.data);
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Unable to load studies.');
    }
  };

  useEffect(() => {
    fetchStudies();
  }, []);

  const handleDelete = async () => {
    if (!selectedId) {
      setError('Please select a study from the drop down list.');
      return;
    }
    setError('');
    const yes = window.confirm("All files related to this study will be permanently deleted. Are you sure (Y/N)?");
    if (!yes) return;
    
    setLoading(true);
    try {
      await api.delete<DeleteStatusResponse>(`/studies/${selectedId}`);
      setSelectedId('');
      setMessage('Study deleted successfully.');
      fetchStudies();
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Failed to delete study.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen">
      <h1 className="title">SetInfra - Manage Study</h1>
      <div className="screen-body">
        <div className="screen-wide">
          <div className="form-grid">
            <label htmlFor="study-select">Select Study</label>
            <select
              id="study-select"
              className="input-field"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              onClick={fetchStudies}
            >
              <option value="">Select Study from the list</option>
              {studies.map((study) => (
                <option key={study.id} value={study.id}>
                  {study.study_name} ({study.status})
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn"
                onClick={() => navigate(`/studies/${selectedId}/manage`, { state: { studyName: studies.find(s => s.id === selectedId)?.study_name } })}
                disabled={!selectedId}
              >
                Select
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={!selectedId || loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          {message ? <p className="message success">{message}</p> : null}
          {error ? <p className="message error">{error}</p> : null}
        </div>
      </div>
      <div className="footer-actions">
        <button className="btn" onClick={() => navigate('/home')}>Home</button>
        <button className="btn" onClick={() => navigate(-1)}>Back</button>
      </div>
    </section>
  );
};

export default ManageStudy1Page;
