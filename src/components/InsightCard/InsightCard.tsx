import React from 'react';

interface InsightCardProps {
  text: string;
  streaming: boolean;
}

const InsightCard: React.FC<InsightCardProps> = ({ text, streaming }) => {
  if (!text && !streaming) return null;

  return (
    <div className="msg-bubble" style={{ maxWidth: '100%' }}>
      <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
      {streaming && <span className="streaming-cursor" aria-hidden="true" />}
    </div>
  );
};

export default InsightCard;
