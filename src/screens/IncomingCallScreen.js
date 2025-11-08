import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import Sound from 'react-native-sound';
import { useCall } from '../context/CallContext';

const IncomingCallScreen = () => {
  const { remoteUserName, acceptCall, rejectCall } = useCall();
  const ringtone = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Sound.setCategory('Playback');
    
    ringtone.current = new Sound('ring.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load ringtone', error);
        return;
      }
      ringtone.current.setNumberOfLoops(-1);
      ringtone.current.play();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true
        })
      ])
    ).start();

    return () => {
      if (ringtone.current) {
        ringtone.current.stop();
        ringtone.current.release();
      }
    };
  }, []);

  const handleAccept = () => {
    if (ringtone.current) {
      ringtone.current.stop();
    }
    acceptCall();
  };

  const handleReject = () => {
    if (ringtone.current) {
      ringtone.current.stop();
    }
    rejectCall();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.avatar, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.avatarText}>{remoteUserName.charAt(0)}</Text>
        </Animated.View>

        <Text style={styles.name}>{remoteUserName}</Text>
        <Text style={styles.status}>Incoming Call...</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
          <Text style={styles.rejectIcon}>✕</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptIcon}>✓</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.labels}>
        <Text style={styles.labelText}>Reject</Text>
        <Text style={styles.labelText}>Accept</Text>
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
    backgroundColor: '#2196F3',
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
  status: {
    fontSize: 18,
    color: '#aaa'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center'
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rejectIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold'
  },
  acceptIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold'
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    marginTop: 10
  },
  labelText: {
    color: '#fff',
    fontSize: 16
  }
});

export default IncomingCallScreen;
