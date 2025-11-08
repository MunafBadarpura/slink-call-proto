import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { useCall } from '../context/CallContext';

const CallingScreen = () => {
  const { remoteUserName, endCall } = useCall();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.avatar, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.avatarText}>{remoteUserName.charAt(0)}</Text>
        </Animated.View>

        <Text style={styles.name}>{remoteUserName}</Text>
        <Text style={styles.status}>Calling...</Text>
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
  status: {
    fontSize: 18,
    color: '#aaa'
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

export default CallingScreen;
