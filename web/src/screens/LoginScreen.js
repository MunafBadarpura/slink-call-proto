import React, { useState } from 'react';
import './LoginScreen.css';

const AVAILABLE_USERS = [
  { id: 'user1', name: 'Alice Johnson' },
  { id: 'user2', name: 'Bob Smith' },
  { id: 'user3', name: 'Charlie Brown' },
  { id: 'user4', name: 'Diana Prince' },
  { id: 'user5', name: 'Ethan Hunt' }
];

const LoginScreen = ({ onLogin }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [micPermission, setMicPermission] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const requestMicrophonePermission = async () => {
    setIsRequestingPermission(true);
    setPermissionError('');
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('Your browser does not support microphone access. Please use Chrome, Firefox, or Edge.');
      setIsRequestingPermission(false);
      return;
    }

    // Check if running on HTTP (not HTTPS or localhost)
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      setPermissionError('Microphone access requires HTTPS or localhost. Please use: npm start (which runs on localhost)');
      setIsRequestingPermission(false);
      return;
    }
    
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('Microphone permission granted!');
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setMicPermission(true);
      setPermissionError('');
    } catch (error) {
      console.error('Microphone permission error:', error);
      setMicPermission(false);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Microphone access denied. Click the 🔒 lock icon in your browser address bar and allow microphone access, then try again.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Microphone is being used by another application. Please close other apps and try again.');
      } else {
        setPermissionError(`Error: ${error.message}. Please check your browser settings.`);
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleLogin = () => {
    if (selectedUser && micPermission) {
      const user = AVAILABLE_USERS.find(u => u.id === selectedUser);
      onLogin(selectedUser, user.name);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1 className="login-title">Hannan Call</h1>
        <p className="login-subtitle">Select your user to continue</p>
        
        {!window.isSecureContext && (
          <div className="security-warning">
            ⚠️ Please run the app using <code>npm start</code> on localhost for microphone access
          </div>
        )}

        <div className="user-selection-list">
          {AVAILABLE_USERS.map(user => (
            <div
              key={user.id}
              className={`user-select-item ${selectedUser === user.id ? 'selected' : ''}`}
              onClick={() => setSelectedUser(user.id)}
            >
              <div className="user-select-avatar">
                {user.name.charAt(0)}
              </div>
              <div className="user-select-info">
                <div className="user-select-name">{user.name}</div>
                <div className="user-select-id">{user.id}</div>
              </div>
              {selectedUser === user.id && (
                <div className="check-icon">✓</div>
              )}
            </div>
          ))}
        </div>

        <div className="permission-section">
          <button
            className={`permission-button ${micPermission ? 'granted' : ''}`}
            onClick={requestMicrophonePermission}
            disabled={isRequestingPermission || micPermission}
          >
            {isRequestingPermission ? (
              '⏳ Requesting...'
            ) : micPermission ? (
              '✓ Microphone Access Granted'
            ) : (
              '🎤 Allow Microphone Access'
            )}
          </button>
          {permissionError && (
            <p className="permission-error">{permissionError}</p>
          )}
          {micPermission && (
            <p className="permission-success">✓ Ready to make calls</p>
          )}
        </div>

        <button
          className={`login-button ${!selectedUser || !micPermission ? 'disabled' : ''}`}
          onClick={handleLogin}
          disabled={!selectedUser || !micPermission}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
