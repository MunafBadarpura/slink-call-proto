import React, { useState } from 'react';
import { CallProvider } from './context/CallContext';
import LoginScreen from './screens/LoginScreen';
import UserSelectionScreen from './screens/UserSelectionScreen';
import CallingScreen from './screens/CallingScreen';
import IncomingCallScreen from './screens/IncomingCallScreen';
import InCallScreen from './screens/InCallScreen';
import { useCall } from './context/CallContext';
import './App.css';

const CallScreenManager = () => {
  const { callState } = useCall();

  return (
    <>
      {callState === 'calling' && <CallingScreen />}
      {callState === 'incoming' && <IncomingCallScreen />}
      {callState === 'connected' && <InCallScreen />}
    </>
  );
};

function App() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');

  const handleLogin = (userId, userName) => {
    setCurrentUserId(userId);
    setCurrentUserName(userName);
  };

  if (!currentUserId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <CallProvider currentUserId={currentUserId}>
      <div className="app">
        <UserSelectionScreen 
          currentUserId={currentUserId} 
          currentUserName={currentUserName}
        />
        <CallScreenManager />
      </div>
    </CallProvider>
  );
}

export default App;
