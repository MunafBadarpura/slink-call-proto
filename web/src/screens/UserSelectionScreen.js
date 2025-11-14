import React, { useState } from 'react';
import { useCall } from '../context/CallContext';
import { AVAILABLE_USERS } from '../config/users';
import './UserSelectionScreen.css';

const UserSelectionScreen = ({ currentUserId, currentUserName }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { initiateCall, callState } = useCall();

  if (callState !== 'idle') return null;

  const filteredUsers = AVAILABLE_USERS.filter(
    user => 
      user.id !== currentUserId &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.id.toString().includes(searchQuery))
  );

  const handleCallUser = (userId, userName, isVideo = false) => {
    initiateCall(userId, userName, isVideo);
  };

  return (
    <div className="user-selection-screen">
      <div className="header">
        <h1>Hannan Call</h1>
        <p className="subtitle">
          Logged in as: <strong>{currentUserName}</strong> (User ID: {currentUserId})
        </p>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="user-list">
        {filteredUsers.length === 0 ? (
          <p className="empty-text">No users found</p>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="user-item">
              <div className="avatar">
                {user.name.charAt(0)}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-id">User ID: {user.id}</div>
              </div>
              <div className="call-buttons">
                <button 
                  className="call-button audio" 
                  onClick={() => handleCallUser(user.id, user.name, false)}
                  title="Audio Call"
                >
                  📞
                </button>
                <button 
                  className="call-button video" 
                  onClick={() => handleCallUser(user.id, user.name, true)}
                  title="Video Call"
                >
                  📹
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserSelectionScreen;
