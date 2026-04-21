import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { ApiErrorResponse, DeleteStatusResponse, FileRecord, PaginatedResponse } from '../../types';

const ManageStudy2Page = () => {
  const { study_id } = useParams<{ study_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [studyName, setStudyName] = useState<string>(location.state?.studyName || '');
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchFiles = async () => {
    if (!study_id) return;
    setError('');
    try {
      const res = await api.get<PaginatedResponse<FileRecord>>(`/files?study_id=${study_id}`);
      setFiles(res.data.data);
      if (!selectedId && res.data.data.length > 0) {
        setSelectedId(res.data.data[0].id);
      }
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Unable to load files.');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [study_id]);

  useEffect(() => {
    if (location.state?.studyName) return;
    const fetchStudyName = async () => {
      if (!study_id) return;
      try {
        const res = await api.get<PaginatedResponse<{ id: string; study_name: string }>>('/studies');
        const selectedStudy = res.data.data.find((study) => study.id === study_id);
        setStudyName(selectedStudy?.study_name ?? '');
      } catch {
        setStudyName('');
      }
    };
    fetchStudyName();
  }, [study_id]);

  const handleDelete = async () => {
    if (!selectedId) {
      setError('Please select a file.');
      return;
    }
    setError('');
    const yes = window.confirm("The file will be permanently deleted. Are you sure (Y/N)?");
    if (!yes) return;
    
    setLoading(true);
    try {
      await api.delete<DeleteStatusResponse>(`/files/${selectedId}`);
      setSelectedId('');
      setMessage('File deleted successfully.');
      fetchFiles();
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Failed to delete file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen">
      <h1 className="title">SetInfra - Manage Study - {studyName || 'Unknown Study'}</h1>
      <div className="screen-body">
        <div className="screen-wide">
          <div className="form-grid">
            <label htmlFor="file-select">Select File</label>
            <select
              id="file-select"
              className="input-field"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              onClick={fetchFiles}
            >
              <option value="">-- Select a File --</option>
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.file_name} ({file.file_type})
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={!selectedId || loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                className="btn"
                onClick={() => navigate(`/studies/${study_id}/upload`, { state: { studyName } })}
                disabled={!study_id}
              >
                Add files
              </button>
            </div>
          </div>

          {message ? <p className="message success">{message}</p> : null}
          {error ? <p className="message error">{error}</p> : null}
        </div>
      </div>
      <div className="footer-actions">
        <button className="btn" onClick={() => navigate('/')}>Home</button>
        <button className="btn" onClick={() => navigate('/studies/manage-1')}>Back</button>
      </div>
    </section>
  );
};

export default ManageStudy2Page;
