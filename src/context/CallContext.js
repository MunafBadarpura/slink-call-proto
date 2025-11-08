import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const WEBSOCKET_URL = 'http://YOUR_SERVER_IP:8008/ws';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CallProvider = ({ children, currentUserId }) => {
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, connected
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteUserName, setRemoteUserName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const stompClient = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const callTimer = useRef(null);
  const pendingIceCandidates = useRef([]);

  useEffect(() => {
    if (!currentUserId) return;
    
    connectWebSocket();
    
    return () => {
      disconnectWebSocket();
      cleanupCall();
    };
  }, [currentUserId]);

  const connectWebSocket = () => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WEBSOCKET_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket Connected');
        
        client.subscribe(`/topic/call/${currentUserId}`, (message) => {
          const data = JSON.parse(message.body);
          handleIncomingMessage(data);
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      }
    });

    client.activate();
    stompClient.current = client;
  };

  const disconnectWebSocket = () => {
    if (stompClient.current) {
      stompClient.current.deactivate();
    }
  };

  const handleIncomingMessage = async (data) => {
    console.log('Incoming message:', data);
    const { signalType, signalData } = data;

    switch (signalType) {
      case 'call-request':
        handleIncomingCall(signalData);
        break;
      case 'call-accept':
        handleCallAccepted(signalData);
        break;
      case 'call-reject':
        handleCallRejected();
        break;
      case 'call-end':
        handleCallEnded();
        break;
      case 'offer':
        await handleOffer(signalData);
        break;
      case 'answer':
        await handleAnswer(signalData);
        break;
      case 'ice-candidate':
        await handleIceCandidate(signalData);
        break;
    }
  };

  const handleIncomingCall = (data) => {
    setRemoteUserId(data.callerId);
    setRemoteUserName(data.callerName || data.callerId);
    setCallState('incoming');
  };

  const handleCallAccepted = async (data) => {
    setCallState('connected');
    startCallTimer();
    await createOffer();
  };

  const handleCallRejected = () => {
    cleanupCall();
    setCallState('idle');
  };

  const handleCallEnded = () => {
    cleanupCall();
    setCallState('idle');
  };

  const initiateCall = async (receiverId, receiverName) => {
    setRemoteUserId(receiverId);
    setRemoteUserName(receiverName);
    setCallState('calling');

    await setupLocalStream();

    const message = {
      callerId: currentUserId,
      callerName: currentUserId,
      receiverId: receiverId
    };

    stompClient.current.publish({
      destination: `/app/call/${currentUserId}/${receiverId}/initiate`,
      body: JSON.stringify(message)
    });
  };

  const acceptCall = async () => {
    setCallState('connected');
    startCallTimer();

    await setupLocalStream();
    await setupPeerConnection();

    const message = {
      callerId: remoteUserId,
      receiverId: currentUserId
    };

    stompClient.current.publish({
      destination: `/app/call/${remoteUserId}/${currentUserId}/accept`,
      body: JSON.stringify(message)
    });
  };

  const rejectCall = () => {
    const message = {
      callerId: remoteUserId,
      receiverId: currentUserId
    };

    stompClient.current.publish({
      destination: `/app/call/${remoteUserId}/${currentUserId}/reject`,
      body: JSON.stringify(message)
    });

    cleanupCall();
    setCallState('idle');
  };

  const endCall = () => {
    const message = {
      callerId: currentUserId,
      receiverId: remoteUserId
    };

    stompClient.current.publish({
      destination: `/app/call/${currentUserId}/${remoteUserId}/end`,
      body: JSON.stringify(message)
    });

    cleanupCall();
    setCallState('idle');
  };

  const setupLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      localStream.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  };

  const setupPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', { candidate: event.candidate });
      }
    };

    peerConnection.current.ontrack = (event) => {
      console.log('Remote track received');
    };

    peerConnection.current.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.current.connectionState);
    };
  };

  const createOffer = async () => {
    await setupPeerConnection();

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    sendSignal('offer', { offer: offer });
  };

  const handleOffer = async (data) => {
    if (!peerConnection.current) {
      await setupPeerConnection();
    }

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    sendSignal('answer', { answer: answer });

    pendingIceCandidates.current.forEach(candidate => {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    pendingIceCandidates.current = [];
  };

  const handleAnswer = async (data) => {
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );

    pendingIceCandidates.current.forEach(candidate => {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    pendingIceCandidates.current = [];
  };

  const handleIceCandidate = async (data) => {
    if (peerConnection.current && peerConnection.current.remoteDescription) {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    } else {
      pendingIceCandidates.current.push(data.candidate);
    }
  };

  const sendSignal = (signalType, signalData) => {
    const message = {
      signalType,
      ...signalData
    };

    stompClient.current.publish({
      destination: `/app/call/${currentUserId}/${remoteUserId}`,
      body: JSON.stringify(message)
    });
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
  };

  const cleanupCall = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    setCallDuration(0);
    setRemoteUserId(null);
    setRemoteUserName('');
    setIsMuted(false);
    setIsSpeaker(false);
    pendingIceCandidates.current = [];
  };

  const value = {
    callState,
    remoteUserId,
    remoteUserName,
    callDuration,
    isMuted,
    isSpeaker,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
