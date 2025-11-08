import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { useCall } from '../context/CallContext';

const InCallScreen = () => {
  const {
    remoteUserName,
    callDuration,
    isMuted,
    isSpeaker,
    endCall,
    toggleMute,
    toggleSpeaker
  } = useCall();

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{remoteUserName.charAt(0)}</Text>
        </View>

        <Text style={styles.name}>{remoteUserName}</Text>
        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.activeButton]}
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeaker && styles.activeButton]}
          onPress={toggleSpeaker}
        >
          <Text style={styles.controlIcon}>{isSpeaker ? '🔊' : '🔉'}</Text>
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.endButton} onPress={endCall}>
          <Text style={styles.endIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.endText}>End Call</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'space-between',
    paddingVertical: 60
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold'
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  duration: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600'
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 40
  },
  controlButton: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#333',
    minWidth: 80
  },
  activeButton: {
    backgroundColor: '#4CAF50'
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 5
  },
  controlLabel: {
    color: '#fff',
    fontSize: 14
  },
  actions: {
    alignItems: 'center'
  },
  endButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  endIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold'
  },
  endText: {
    color: '#fff',
    fontSize: 16
  }
});

export default InCallScreen;
