import React, { useEffect, useState } from 'react';
import { useCall } from '../context/CallContext';
import './IncomingCallScreen.css';

const IncomingCallScreen = () => {
  const { remoteUserName, acceptCall, rejectCall, isVideoCall } = useCall();
  const [shake, setShake] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setShake(prev => {
        if (prev === 0) return 10;
        if (prev === 10) return -10;
        return 0;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="call-screen-overlay">
      <div className="call-screen">
        <div className="call-content">
          <div className="call-avatar incoming" style={{ transform: `translateX(${shake}px)` }}>
            {remoteUserName.charAt(0)}
          </div>
          <h2 className="call-name">{remoteUserName}</h2>
          <p className="call-status">
            {isVideoCall ? '📹 Incoming Video Call...' : '📞 Incoming Call...'}
          </p>
        </div>

        <div className="call-actions-row">
          <div className="action-item">
            <button className="reject-button" onClick={rejectCall}>
              <span className="action-icon">✕</span>
            </button>
            <p className="action-label">Reject</p>
          </div>

          <div className="action-item">
            <button className="accept-button" onClick={acceptCall}>
              <span className="action-icon">✓</span>
            </button>
            <p className="action-label">Accept</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallScreen;
