import React, { useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ApiErrorResponse, CreateStudyResponse } from '../../types';

const CreateStudyPage = () => {
  const [studyName, setStudyName] = useState('');
  const [studyId, setStudyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const successMessage = useMemo(() => {
    if (!studyId) {
      return '';
    }
    return 'Study created successfully. You can continue to file upload.';
  }, [studyId]);

  const handleSave = async () => {
    if (!studyName.trim()) {
      setError('Study name is required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await api.post<CreateStudyResponse>('/studies', { study_name: studyName });
      setStudyId(response.data.study_id);
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Error saving study.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen">
      <h1 className="title">SetInfra - Create Study</h1>
      <div className="screen-body">
        <div className="screen-wide">
          <div className="form-grid">
            <label htmlFor="study-name">Study Name</label>
            <input
              id="study-name"
              className="input-field"
              value={studyName}
              onChange={(e) => setStudyName(e.target.value)}
              disabled={!!studyId || loading}
            />
            <button className="btn" onClick={handleSave} disabled={!!studyId || loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>

            <span>Study ID</span>
            <input
              className="input-field"
              value={studyId ? `Study ID: ${studyId}` : ''}
              readOnly
              placeholder="Save the study name first"
            />
            <button
              className="btn"
              onClick={() => navigate(`/studies/${studyId}/upload`, { state: { studyName } })}
              disabled={!studyId}
            >
              Upload Files
            </button>
          </div>

          {error ? <p className="message error">{error}</p> : null}
          {successMessage ? <p className="message success">{successMessage}</p> : null}
        </div>
      </div>
      <div className="footer-actions">
        <button className="btn" onClick={() => navigate('/')}>Home</button>
        <button className="btn" onClick={() => navigate(-1)}>Back</button>
      </div>
    </section>
  );
};

export default CreateStudyPage;
