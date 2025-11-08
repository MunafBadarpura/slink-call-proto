import React from 'react';
import { useCall } from '../context/CallContext';
import './InCallScreen.css';

const InCallScreen = () => {
  const {
    remoteUserName,
    callDuration,
    isMuted,
    isSpeaker,
    isVideoCall,
    isVideoEnabled,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    localVideoRef,
    remoteVideoRef
  } = useCall();

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-screen-overlay">
      <div className="call-screen">
        {isVideoCall ? (
          <div className="video-container">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline
              className="remote-video"
            />
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted
              className="local-video"
            />
            <div className="video-overlay">
              <h2 className="call-name">{remoteUserName}</h2>
              <p className="call-duration">{formatDuration(callDuration)}</p>
            </div>
          </div>
        ) : (
          <div className="call-content">
            <div className="call-avatar connected">
              {remoteUserName.charAt(0)}
            </div>
            <h2 className="call-name">{remoteUserName}</h2>
            <p className="call-duration">{formatDuration(callDuration)}</p>
          </div>
        )}

        <div className="call-controls">
          <button
            className={`control-button ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
          >
            <span className="control-icon">{isMuted ? '🔇' : '🎤'}</span>
            <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {isVideoCall && (
            <button
              className={`control-button ${!isVideoEnabled ? 'active' : ''}`}
              onClick={toggleVideo}
            >
              <span className="control-icon">{isVideoEnabled ? '📹' : '🚫'}</span>
              <span className="control-label">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </button>
          )}

          <button
            className={`control-button ${isSpeaker ? 'active' : ''}`}
            onClick={toggleSpeaker}
          >
            <span className="control-icon">{isSpeaker ? '🔊' : '🔉'}</span>
            <span className="control-label">Speaker</span>
          </button>
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

export default InCallScreen;
