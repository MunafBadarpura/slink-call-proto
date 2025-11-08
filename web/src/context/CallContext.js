import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const WEBSOCKET_URL = 'https://8hspqmjm-8008.inc1.devtunnels.ms/ws';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CallProvider = ({ children, currentUserId }) => {
  const [callState, setCallState] = useState('idle');
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteUserName, setRemoteUserName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const stompClient = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimer = useRef(null);
  const pendingIceCandidates = useRef([]);
  const ringtoneAudio = useRef(null);
  const remoteUserIdRef = useRef(null); // Use ref to avoid state timing issues

  useEffect(() => {
    if (!currentUserId) return;
    
    connectWebSocket();
    setupRingtone();
    
    return () => {
      disconnectWebSocket();
      cleanupCall();
    };
  }, [currentUserId]);

  const setupRingtone = () => {
    ringtoneAudio.current = new Audio('/ringtone/ring.mp3');
    ringtoneAudio.current.loop = true;
  };

  const playRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.play().catch(err => console.log('Ringtone play error:', err));
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
      ringtoneAudio.current.currentTime = 0;
    }
  };

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
    console.log('Incoming message:', JSON.stringify(data, null, 2));
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
        // signalData might contain the offer, or data might be the offer itself
        await handleOffer(signalData || data);
        break;
      case 'answer':
        await handleAnswer(signalData || data);
        break;
      case 'ice-candidate':
        await handleIceCandidate(signalData || data);
        break;
      default:
        console.log('Unknown signal type:', signalType);
    }
  };

  const handleIncomingCall = (data) => {
    console.log('Incoming call from:', data.callerId, 'Video:', data.isVideoCall);
    remoteUserIdRef.current = data.callerId;
    setRemoteUserId(data.callerId);
    setRemoteUserName(data.callerName || data.callerId);
    setIsVideoCall(data.isVideoCall || false);
    setCallState('incoming');
    playRingtone();
  };

  const handleCallAccepted = async (data) => {
    console.log('Call accepted, creating offer to:', remoteUserIdRef.current);
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

  const initiateCall = async (receiverId, receiverName, videoCall = false) => {
    console.log('Initiating call to:', receiverId, 'Video:', videoCall);
    remoteUserIdRef.current = receiverId;
    setRemoteUserId(receiverId);
    setRemoteUserName(receiverName);
    setIsVideoCall(videoCall);
    setCallState('calling');

    await setupLocalStream(videoCall);

    const message = {
      callerId: currentUserId,
      callerName: currentUserId,
      receiverId: receiverId,
      isVideoCall: videoCall
    };

    stompClient.current.publish({
      destination: `/app/call/${currentUserId}/${receiverId}/initiate`,
      body: JSON.stringify(message)
    });
  };

  const acceptCall = async () => {
    stopRingtone();
    setCallState('connected');
    startCallTimer();

    await setupLocalStream(isVideoCall);
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
    stopRingtone();
    
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

  const setupLocalStream = async (videoEnabled = false) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;

      // Attach local video if video call
      if (videoEnabled && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert(`Please allow ${videoEnabled ? 'camera and microphone' : 'microphone'} access to make calls`);
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
      console.log('Remote track received:', event.track.kind);
      const remoteStream = event.streams[0];
      
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = remoteStream;
      }
      
      if (remoteVideoRef.current && event.track.kind === 'video') {
        remoteVideoRef.current.srcObject = remoteStream;
      }
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
    console.log('Handling offer:', data);
    if (!peerConnection.current) {
      await setupPeerConnection();
    }

    // Handle both data.offer and data directly (in case backend sends it differently)
    const offer = data.offer || data;
    
    if (!offer || !offer.type) {
      console.error('Invalid offer data:', data);
      return;
    }

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer)
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
    console.log('Handling answer:', data);
    
    // Handle both data.answer and data directly
    const answer = data.answer || data;
    
    if (!answer || !answer.type) {
      console.error('Invalid answer data:', data);
      return;
    }

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    pendingIceCandidates.current.forEach(candidate => {
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    pendingIceCandidates.current = [];
  };

  const handleIceCandidate = async (data) => {
    console.log('Handling ICE candidate:', data);
    
    // Handle both data.candidate and data directly
    const candidate = data.candidate || data;
    
    if (!candidate) {
      console.error('Invalid ICE candidate data:', data);
      return;
    }

    if (peerConnection.current && peerConnection.current.remoteDescription) {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } else {
      pendingIceCandidates.current.push(candidate);
    }
  };

  const sendSignal = (signalType, signalData) => {
    const receiverId = remoteUserIdRef.current;
    
    if (!receiverId) {
      console.error('Cannot send signal: receiverId is null', { 
        signalType, 
        currentUserId, 
        remoteUserId, 
        remoteUserIdRef: remoteUserIdRef.current 
      });
      return;
    }

    const message = {
      signalType,
      ...signalData
    };

    console.log(`Sending signal ${signalType} from ${currentUserId} to ${receiverId}`);

    stompClient.current.publish({
      destination: `/app/call/${currentUserId}/${receiverId}`,
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

  const toggleVideo = () => {
    if (localStream.current && isVideoCall) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
  };

  const cleanupCall = () => {
    stopRingtone();
    
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

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallDuration(0);
    remoteUserIdRef.current = null;
    setRemoteUserId(null);
    setRemoteUserName('');
    setIsMuted(false);
    setIsSpeaker(false);
    setIsVideoCall(false);
    setIsVideoEnabled(true);
    pendingIceCandidates.current = [];
  };

  const value = {
    callState,
    remoteUserId,
    remoteUserName,
    callDuration,
    isMuted,
    isSpeaker,
    isVideoCall,
    isVideoEnabled,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    remoteAudio,
    localVideoRef,
    remoteVideoRef
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <audio ref={remoteAudio} autoPlay />
    </CallContext.Provider>
  );
};
