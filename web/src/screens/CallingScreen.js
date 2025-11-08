import React, { useEffect, useState } from 'react';
import { useCall } from '../context/CallContext';
import './CallingScreen.css';

const CallingScreen = () => {
  const { remoteUserName, endCall, isVideoCall } = useCall();
  const [pulse, setPulse] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => prev === 1 ? 1.2 : 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="call-screen-overlay">
      <div className="call-screen">
        <div className="call-content">
          <div className="call-avatar" style={{ transform: `scale(${pulse})` }}>
            {remoteUserName.charAt(0)}
          </div>
          <h2 className="call-name">{remoteUserName}</h2>
          <p className="call-status">
            {isVideoCall ? '📹 Video Calling...' : '📞 Calling...'}
          </p>
        </div>

        <div className="call-actions">
          <button className="end-call-button" onClick={endCall}>
            <span className="end-icon">✕</span>
          </button>
          <p className="action-label">End Call</p>
        </div>
      </div>
    </div>
  );
};

export default CallingScreen;
