import React, { useState } from 'react';
import { useCall } from '../context/CallContext';
import './UserSelectionScreen.css';

const MOCK_USERS = [
  { id: 'user1', name: 'Alice Johnson' },
  { id: 'user2', name: 'Bob Smith' },
  { id: 'user3', name: 'Charlie Brown' },
  { id: 'user4', name: 'Diana Prince' },
  { id: 'user5', name: 'Ethan Hunt' }
];

const UserSelectionScreen = ({ currentUserId, currentUserName }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { initiateCall, callState } = useCall();

  if (callState !== 'idle') return null;

  const filteredUsers = MOCK_USERS.filter(
    user => 
      user.id !== currentUserId &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCallUser = (userId, userName, isVideo = false) => {
    initiateCall(userId, userName, isVideo);
  };

  return (
    <div className="user-selection-screen">
      <div className="header">
        <h1>Hannan Call</h1>
        <p className="subtitle">
          Logged in as: <strong>{currentUserName}</strong> ({currentUserId})
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
                <div className="user-id">{user.id}</div>
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
