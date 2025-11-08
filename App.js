import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { CallProvider, useCall } from './src/context/CallContext';
import UserSelectionScreen from './src/screens/UserSelectionScreen';
import CallingScreen from './src/screens/CallingScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import InCallScreen from './src/screens/InCallScreen';

// Set your user ID here
const CURRENT_USER_ID = 'user1';

const CallScreenManager = () => {
  const { callState } = useCall();

  return (
    <>
      {callState === 'calling' && (
        <Modal visible={true} animationType="slide">
          <CallingScreen />
        </Modal>
      )}

      {callState === 'incoming' && (
        <Modal visible={true} animationType="slide">
          <IncomingCallScreen />
        </Modal>
      )}

      {callState === 'connected' && (
        <Modal visible={true} animationType="slide">
          <InCallScreen />
        </Modal>
      )}
    </>
  );
};

const App = () => {
  return (
    <CallProvider currentUserId={CURRENT_USER_ID}>
      <View style={styles.container}>
        <UserSelectionScreen currentUserId={CURRENT_USER_ID} />
        <CallScreenManager />
      </View>
    </CallProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

export default App;
