import React, { useRef, useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { ApiErrorResponse, ProcessFilesResponse, UploadFileResponse, PaginatedResponse } from '../../types';

const UploadFilesPage = () => {
  const { study_id } = useParams<{ study_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [studyName, setStudyName] = useState<string>(location.state?.studyName || study_id || '');
  
  useEffect(() => {
    if (location.state?.studyName || !study_id) return;
    const fetchStudyName = async () => {
      try {
        const res = await api.get<PaginatedResponse<{ id: string; study_name: string }>>('/studies');
        const selectedStudy = res.data.data.find((study: any) => study.id === study_id);
        if (selectedStudy) setStudyName(selectedStudy.study_name);
      } catch (err) {
        // Fallback to study_id on error
      }
    };
    fetchStudyName();
  }, [study_id, location.state]);

  const [protocolFile, setProtocolFile] = useState<File | null>(null);
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [uploadCount, setUploadCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const protocolInputRef = useRef<HTMLInputElement>(null);
  const schemaInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const csvDisplayRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File | null, fileType: string, resetAction?: () => void) => {
    if (!file || !study_id) return;

    setError('');
    setMessage('');
    setSavingType(fileType);
    const formData = new FormData();
    formData.append('study_id', study_id);
    formData.append('file_type', fileType);
    formData.append('file', file);

    try {
      await api.post<UploadFileResponse>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadCount(prev => prev + 1);
      setProcessSuccess(false);
      setMessage(`${file.name} saved successfully.`);
      if (resetAction) resetAction();

      if (fileType === 'SDTM_CSV' && csvDisplayRef.current) {
        csvDisplayRef.current.focus();
      }
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || `Error uploading ${fileType}.`);
    } finally {
      setSavingType(null);
    }
  };

  const handleProcess = async () => {
    if (!study_id) return;
    setError('');
    setMessage('');
    setProcessing(true);
    try {
      await api.post<ProcessFilesResponse>(`/files/process/${study_id}`);
      setProcessSuccess(true);
      setMessage('Processing is complete.');
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Error processing files.');
    } finally {
      setProcessing(false);
    }
  };

  const renderRow = (
    label: string,
    file: File | null,
    fileType: string,
    inputRef: React.RefObject<HTMLInputElement>,
    onFileChange: (file: File | null) => void,
    onReset: () => void,
    displayRef?: React.RefObject<HTMLInputElement>,
  ) => (
    <>
      <span>{label}</span>
      <input
        ref={displayRef}
        className="input-field"
        readOnly
        value={file?.name || ''}
        placeholder="No file selected"
      />
      <button className="btn" onClick={() => inputRef.current?.click()}>
        ...
      </button>
      <button
        className="btn"
        onClick={() => handleUpload(file, fileType, onReset)}
        disabled={!file || savingType !== null || processing}
      >
        {savingType === fileType ? 'Saving...' : 'Save'}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={
          fileType === 'Protocol'
            ? '.pdf,.docx'
            : fileType === 'Schema_JSON'
              ? '.csv,.xls,.xlsx'
              : '.csv'
        }
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
    </>
  );

  return (
    <section className="screen">
      <h1 className="title">SetInfra - Upload files to {studyName}</h1>
      <div className="screen-body">
        <div className="screen-wide">
          <div className="file-grid">
            {renderRow(
              'Protocol',
              protocolFile,
              'Protocol',
              protocolInputRef,
              setProtocolFile,
              () => {
                setProtocolFile(null);
                if (protocolInputRef.current) {
                  protocolInputRef.current.value = '';
                }
              }
            )}
            {renderRow(
              'CSV',
              csvFile,
              'SDTM_CSV',
              csvInputRef,
              setCsvFile,
              () => {
                setCsvFile(null);
                if (csvInputRef.current) {
                  csvInputRef.current.value = '';
                }
              },
              csvDisplayRef
            )}
            {renderRow(
              'Schema',
              schemaFile,
              'Schema_JSON',
              schemaInputRef,
              setSchemaFile,
              () => {
                setSchemaFile(null);
                if (schemaInputRef.current) {
                  schemaInputRef.current.value = '';
                }
              }
            )}
          </div>

          <p className="message">Schema files must be uploaded as CSV or Excel.</p>

          <p className="message">{processSuccess ? 'Processing is complete.' : `${uploadCount} files saved.`}</p>
          {message && !processSuccess ? <p className="message success">{message}</p> : null}
          {error ? <p className="message error">{error}</p> : null}

          <div className="actions-row">
            <button className="btn" onClick={handleProcess} disabled={uploadCount === 0 || processing || savingType !== null}>
              {processing ? 'Processing...' : 'Process'}
            </button>
            <button
              className="btn"
              onClick={() => navigate(`/chat/new?study_id=${encodeURIComponent(study_id ?? '')}`)}
              disabled={!processSuccess}
            >
              New Chat
            </button>
            <button className="btn" onClick={() => navigate('/home')}>Home</button>
            <button className="btn" onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UploadFilesPage;
