import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

// const WEBSOCKET_URL = 'https://8hspqmjm-8008.inc1.devtunnels.ms/ws';
const WEBSOCKET_URL = 'http://localhost:8008/ws';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const CallProvider = ({ children, currentUserId }) => {
  // Ensure currentUserId is a number
  const userId = typeof currentUserId === 'string' ? parseInt(currentUserId, 10) : currentUserId;
  
  const [callState, setCallState] = useState('idle');
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteUserName, setRemoteUserName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [callHistoryId, setCallHistoryId] = useState(null);
  const [callType, setCallType] = useState('AUDIO'); // AUDIO or VIDEO
  const [originalCallerId, setOriginalCallerId] = useState(null); // Track original caller
  const [originalReceiverId, setOriginalReceiverId] = useState(null); // Track original receiver

  const stompClient = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimer = useRef(null);
  const pendingIceCandidates = useRef([]);
  const ringtoneAudio = useRef(null);
  const remoteUserIdRef = useRef(null);
  const isProcessingOffer = useRef(false);
  const isProcessingAnswer = useRef(false);
  const callTimeoutTimer = useRef(null);
  const isInitialized = useRef(false); // Track if WebSocket is initialized
  const callStateRef = useRef('idle'); // Track call state immediately (not async like useState)

  useEffect(() => {
    if (!userId || isNaN(userId)) {
      console.error('Invalid userId:', currentUserId);
      return;
    }
    
    // Prevent double initialization in React Strict Mode
    if (isInitialized.current) {
      console.log('WebSocket already initialized, skipping setup');
      return;
    }
    
    isInitialized.current = true;
    let isCleaningUp = false;
    
    connectWebSocket();
    setupRingtone();
    
    // Handle browser close/refresh during call
    const handleBeforeUnload = () => {
      if (callState !== 'idle' && remoteUserIdRef.current) {
        // Send end call signal before closing
        if (stompClient.current && stompClient.current.connected) {
          const message = {
            callerId: userId,
            receiverId: remoteUserIdRef.current
          };
          
          // Use sendBeacon for reliable delivery during page unload
          const blob = new Blob([JSON.stringify(message)], { type: 'application/json' });
          navigator.sendBeacon(
            `${WEBSOCKET_URL.replace('/ws', '')}/api/call/${userId}/${remoteUserIdRef.current}/end`,
            blob
          );
          
          // Also try WebSocket (may not complete)
          try {
            stompClient.current.publish({
              destination: `/app/call/${userId}/${remoteUserIdRef.current}/end`,
              body: JSON.stringify(message)
            });
          } catch (err) {
            console.error('Error sending end call on unload:', err);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      isCleaningUp = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Don't disconnect immediately - React Strict Mode will remount
      // Only disconnect after a delay to avoid reconnection issues
      setTimeout(() => {
        if (isCleaningUp) {
          console.log('Cleaning up WebSocket connection');
          isInitialized.current = false;
          disconnectWebSocket();
          cleanupCall();
        }
      }, 500); // Increased delay to handle React Strict Mode
    };
  }, [userId]);

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
    // Don't create a new connection if one already exists and is connected
    if (stompClient.current && stompClient.current.connected) {
      console.log('WebSocket already connected, skipping...');
      return;
    }
    
    console.log('Connecting to WebSocket:', WEBSOCKET_URL);
    
    const client = new Client({
      webSocketFactory: () => {
        console.log('Creating SockJS connection...');
        return new SockJS(WEBSOCKET_URL);
      },
      connectHeaders: {
        userId: userId.toString()
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('✅ WebSocket Connected successfully for user:', userId);
        console.log('Connection frame:', frame);
        setIsConnected(true);
        
        try {
          client.subscribe(`/topic/call/${userId}`, (message) => {
            const data = JSON.parse(message.body);
            handleIncomingMessage(data);
          });
          console.log('✅ Subscribed to /topic/call/' + userId);
        } catch (err) {
          console.error('❌ Error subscribing:', err);
        }
      },
      onDisconnect: (frame) => {
        console.log('❌ WebSocket Disconnected');
        console.log('Disconnect frame:', frame);
        setIsConnected(false);
        
        // If in a call when disconnected, end the call
        if (callState !== 'idle') {
          console.log('WebSocket disconnected during call, ending call');
          cleanupCall();
          setCallState('idle');
          alert('Connection lost. Call ended.');
        }
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame);
        setIsConnected(false);
      },
      onWebSocketError: (event) => {
        console.error('❌ WebSocket error:', event);
      },
      onWebSocketClose: (event) => {
        console.log('❌ WebSocket closed:', event);
      }
    });

    client.activate();
    stompClient.current = client;
    console.log('WebSocket client activated');
  };

  const disconnectWebSocket = () => {
    if (stompClient.current) {
      stompClient.current.deactivate();
    }
  };

  const handleIncomingMessage = async (messageData) => {
    console.log('Incoming message:', JSON.stringify(messageData, null, 2));
    const { signalType, signalData, callHistory } = messageData;

    switch (signalType) {
      case 'call-request':
        handleIncomingCall(signalData, callHistory);
        break;
      case 'call-accept':
        handleCallAccepted(signalData);
        break;
      case 'call-reject':
        handleCallRejected();
        break;
      case 'call-end':
        handleCallEnded(signalData);
        break;
      case 'call-busy':
        handleUserBusy(signalData);
        break;
      case 'call-not-answered':
        handleCallNotAnswered();
        break;
      case 'offer':
        await handleOffer(signalData || messageData);
        break;
      case 'answer':
        await handleAnswer(signalData || messageData);
        break;
      case 'ice-candidate':
        await handleIceCandidate(signalData || messageData);
        break;
      default:
        console.log('Unknown signal type:', signalType);
    }
  };

  const handleIncomingCall = (data, callHistory) => {
    console.log('Incoming call data:', data, 'callHistory:', callHistory);
    
    // Check for CONFLICT status (call already in progress)
    if (callHistory && callHistory.statusCode === 409) {
      console.warn('Call already in progress:', callHistory.message);
      alert('Call already in progress. Please end the existing call first or wait for it to timeout.');
      cleanupCall();
      setCallState('idle');
      return;
    }
    
    if (callHistory && callHistory.data) {
      const senderId = callHistory.data.senderId;
      const receiverId = callHistory.data.receiverId;
      
      // Ignore if we are the sender (we initiated this call)
      if (senderId === userId) {
        console.log('Ignoring call-request from self (we initiated this call)');
        // But still track the original caller/receiver and history ID for later
        const historyId = callHistory.data.callHistoryId;
        console.log('Storing for caller - callHistoryId:', historyId, 'Caller:', senderId, 'Receiver:', receiverId);
        setCallHistoryId(historyId);
        setOriginalCallerId(senderId);
        setOriginalReceiverId(receiverId);
        return;
      }
      
      const historyId = callHistory.data.callHistoryId;
      console.log('Setting callHistoryId:', historyId, 'Caller:', senderId, 'Receiver:', receiverId);
      setCallHistoryId(historyId);
      setOriginalCallerId(senderId); // Track original caller
      setOriginalReceiverId(receiverId); // Track original receiver
      
      const senderName = callHistory.data.senderName || senderId;
      const type = callHistory.data.callType || 'AUDIO';
      
      remoteUserIdRef.current = senderId;
      setRemoteUserId(senderId);
      setRemoteUserName(senderName);
      setCallType(type);
      setIsVideoCall(type === 'VIDEO');
      updateCallState('incoming');
      playRingtone();
      
      // Start timeout timer for not answered (30 seconds)
      callTimeoutTimer.current = setTimeout(() => {
        if (callState === 'incoming') {
          handleCallTimeout();
        }
      }, 30000);
    }
  };

  const handleCallAccepted = async (data) => {
    console.log('Call accepted signal received. Current state:', callStateRef.current);
    console.log('Remote user:', remoteUserIdRef.current);
    console.log('Current user:', userId);
    
    clearCallTimeout();
    
    // Only the CALLER should create an offer when they receive accept signal
    // The RECEIVER should ignore this signal (they already accepted)
    if (callStateRef.current !== 'calling') {
      console.log('⚠️ Not in calling state, ignoring accept signal (state:', callStateRef.current, ')');
      console.log('Expected state: calling, but got:', callStateRef.current);
      return;
    }
    
    // Prevent duplicate offer creation
    if (peerConnection.current) {
      console.log('⚠️ Peer connection already exists, ignoring duplicate accept');
      return;
    }
    
    console.log('Creating offer to:', remoteUserIdRef.current);
    updateCallState('connected');
    startCallTimer();
    await createOffer();
  };

  const handleCallRejected = () => {
    clearCallTimeout();
    cleanupCall();
    updateCallState('idle');
  };

  const handleCallEnded = (data) => {
    console.log('Call ended signal received:', data);
    clearCallTimeout();
    
    // Check if call ended due to disconnect
    if (data && data.disconnectedUser) {
      console.log('Call ended because user', data.disconnectedUser, 'disconnected');
      alert(`Call ended: Other user disconnected`);
    }
    
    cleanupCall();
    updateCallState('idle');
  };

  const handleUserBusy = (data) => {
    console.log('User is busy:', data);
    clearCallTimeout();
    const message = data.message || 'User is on another call';
    alert(`${remoteUserName || 'User'} is on another call. Please try again later.`);
    cleanupCall();
    setCallState('idle');
  };

  const handleCallNotAnswered = () => {
    console.log('Call not answered');
    clearCallTimeout();
    cleanupCall();
    setCallState('idle');
  };

  const handleCallTimeout = () => {
    if (!callHistoryId || !remoteUserIdRef.current) return;

    const timeoutMessage = {
      callHistoryId: callHistoryId,
      signalData: {}
    };

    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.publish({
        destination: `/app/call/${userId}/${remoteUserIdRef.current}/notAnswered`,
        body: JSON.stringify(timeoutMessage)
      });
    }

    cleanupCall();
    setCallState('idle');
  };

  const clearCallTimeout = () => {
    if (callTimeoutTimer.current) {
      clearTimeout(callTimeoutTimer.current);
      callTimeoutTimer.current = null;
    }
  };

  // Helper to update call state (both state and ref)
  const updateCallState = (newState) => {
    console.log('Updating call state from', callStateRef.current, 'to', newState);
    callStateRef.current = newState;
    setCallState(newState);
  };

  const initiateCall = async (receiverId, receiverName, videoCall = false) => {
    console.log('Initiating call to:', receiverId, 'Video:', videoCall);
    console.log('STOMP Client state - connected:', stompClient.current?.connected, 'active:', stompClient.current?.active);
    
    // If not connected, try to reconnect
    if (!stompClient.current || !stompClient.current.connected) {
      console.log('Not connected, attempting to reconnect...');
      connectWebSocket();
      
      // Wait for connection
      console.log('Waiting for connection...');
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (stompClient.current && stompClient.current.connected) {
          console.log('✅ Connection established after waiting');
          break;
        }
      }
      
      if (!stompClient.current || !stompClient.current.connected) {
        alert('Connection not established. Please try again.');
        console.error('❌ WebSocket still not connected after waiting');
        return;
      }
    }

    const type = videoCall ? 'VIDEO' : 'AUDIO';
    remoteUserIdRef.current = receiverId;
    setRemoteUserId(receiverId);
    setRemoteUserName(receiverName);
    setCallType(type);
    setIsVideoCall(videoCall);
    updateCallState('calling');
    console.log('State set to calling');

    try {
      console.log('Setting up local stream...');
      await setupLocalStream(videoCall);
      console.log('Local stream setup complete');

      // Final check before publishing
      if (!stompClient.current || !stompClient.current.connected) {
        throw new Error('Connection lost before sending call');
      }

      const initiateMessage = {
        callType: type,
        signalData: {
          callerId: userId,
          callerName: receiverName,
          receiverId: receiverId
        }
      };

      console.log('Publishing call initiate...');
      stompClient.current.publish({
        destination: `/app/call/${userId}/${receiverId}/initiate`,
        body: JSON.stringify(initiateMessage)
      });
      console.log('✅ Call initiate published successfully');
      
      // Start timeout for not answered (30 seconds)
      callTimeoutTimer.current = setTimeout(() => {
        if (callState === 'calling') {
          handleCallTimeout();
        }
      }, 30000);
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      console.error('Error stack:', error.stack);
      alert('Failed to initiate call: ' + error.message);
      cleanupCall();
      setCallState('idle');
      console.log('State reset to idle due to error');
    }
  };

  const acceptCall = async () => {
    console.log('Accepting call from:', remoteUserId);
    console.log('STOMP Client state - connected:', stompClient.current?.connected, 'active:', stompClient.current?.active);
    
    // If not connected, try to reconnect
    if (!stompClient.current || !stompClient.current.connected) {
      console.log('Not connected, attempting to reconnect...');
      connectWebSocket();
      
      // Wait for connection
      console.log('Waiting for connection...');
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (stompClient.current && stompClient.current.connected) {
          console.log('✅ Connection established after waiting');
          break;
        }
      }
      
      if (!stompClient.current || !stompClient.current.connected) {
        alert('Connection lost. Cannot accept call.');
        console.error('❌ WebSocket still not connected after waiting');
        cleanupCall();
        setCallState('idle');
        return;
      }
    }

    clearCallTimeout();
    stopRingtone();
    updateCallState('connected');
    startCallTimer();

    // Set up local stream but DON'T create peer connection yet
    // Peer connection will be created when we receive the offer from caller
    await setupLocalStream(isVideoCall);

    const acceptMessage = {
      callHistoryId: callHistoryId,
      signalData: {
        callerId: remoteUserId,
        receiverId: userId
      }
    };

    console.log('Publishing call accept...');
    stompClient.current.publish({
      destination: `/app/call/${remoteUserId}/${userId}/accept`,
      body: JSON.stringify(acceptMessage)
    });
    console.log('✅ Call accept published successfully');
    console.log('Waiting for offer from caller...');
  };

  const rejectCall = () => {
    clearCallTimeout();
    stopRingtone();
    
    if (stompClient.current && stompClient.current.connected) {
      // Use original caller/receiver IDs
      const callerId = originalCallerId;
      const receiverId = originalReceiverId;
      
      const rejectMessage = {
        callHistoryId: callHistoryId,
        signalData: {
          callerId: callerId,
          receiverId: receiverId
        }
      };

      console.log('Publishing call reject...');
      stompClient.current.publish({
        destination: `/app/call/${callerId}/${receiverId}/reject`,
        body: JSON.stringify(rejectMessage)
      });
      console.log('✅ Call reject published successfully');
    } else {
      console.log('⚠️ Not connected, skipping reject signal');
    }

    cleanupCall();
    setCallState('idle');
  };

  const endCall = () => {
    clearCallTimeout();
    
    console.log('endCall called. callHistoryId:', callHistoryId, 'originalCallerId:', originalCallerId, 'originalReceiverId:', originalReceiverId);
    
    if (stompClient.current && stompClient.current.connected) {
      // Use original caller/receiver IDs (not current user IDs)
      const callerId = originalCallerId;
      const receiverId = originalReceiverId;
      const historyId = callHistoryId; // Capture before cleanup
      
      if (!historyId) {
        console.error('❌ callHistoryId is null! Cannot end call properly.');
      }
      
      const endMessage = {
        callHistoryId: historyId,
        endedById: userId,
        signalData: {
          callerId: callerId,
          receiverId: receiverId
        }
      };

      console.log('Publishing call end...');
      console.log('Call History ID:', historyId, 'Original Caller:', callerId, 'Original Receiver:', receiverId, 'Ended by:', userId);
      stompClient.current.publish({
        destination: `/app/call/${callerId}/${receiverId}/end`,
        body: JSON.stringify(endMessage)
      });
      console.log('✅ Call end published successfully');
    } else {
      console.log('⚠️ Not connected, skipping end signal');
    }

    cleanupCall();
    setCallState('idle');
  };

  const setupLocalStream = async (videoEnabled = false) => {
    console.log('setupLocalStream called, videoEnabled:', videoEnabled);
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

      console.log('Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media stream obtained:', stream);
      localStream.current = stream;

      // Attach local video if video call
      if (videoEnabled && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
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
      
      // Handle peer connection failures/disconnections
      if (peerConnection.current.connectionState === 'disconnected' || 
          peerConnection.current.connectionState === 'failed' ||
          peerConnection.current.connectionState === 'closed') {
        console.log('Peer connection lost, ending call');
        handleCallEnded();
      }
    };

    // Monitor ICE connection state
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.current.iceConnectionState);
      
      if (peerConnection.current.iceConnectionState === 'disconnected' ||
          peerConnection.current.iceConnectionState === 'failed') {
        console.log('ICE connection lost');
        // Give it a moment to reconnect before ending
        setTimeout(() => {
          if (peerConnection.current && 
              (peerConnection.current.iceConnectionState === 'disconnected' ||
               peerConnection.current.iceConnectionState === 'failed')) {
            console.log('ICE connection still lost, ending call');
            handleCallEnded();
          }
        }, 5000); // Wait 5 seconds for reconnection
      }
    };
  };

  const createOffer = async () => {
    console.log('Creating offer. Current userId:', userId, 'Remote userId:', remoteUserIdRef.current);
    await setupPeerConnection();

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    console.log('Sending offer to:', remoteUserIdRef.current);
    sendSignal('offer', { offer: offer });
  };

  const handleOffer = async (data) => {
    console.log('Handling offer:', data);
    
    // Prevent duplicate processing
    if (isProcessingOffer.current) {
      console.log('⚠️ Already processing an offer, ignoring duplicate');
      return;
    }
    
    // Handle both data.offer and data directly (in case backend sends it differently)
    const offer = data.offer || data;
    
    if (!offer || !offer.type) {
      console.error('Invalid offer data:', data);
      return;
    }

    // Check if we already have a remote description
    if (peerConnection.current && peerConnection.current.signalingState !== 'stable') {
      console.log('Already processing offer, ignoring duplicate. State:', peerConnection.current.signalingState);
      return;
    }

    isProcessingOffer.current = true;

    if (!peerConnection.current) {
      await setupPeerConnection();
    }

    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      sendSignal('answer', { answer: answer });

      // Process pending ICE candidates
      pendingIceCandidates.current.forEach(candidate => {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      });
      pendingIceCandidates.current = [];
    } catch (error) {
      console.error('Error handling offer:', error);
    } finally {
      isProcessingOffer.current = false;
    }
  };

  const handleAnswer = async (data) => {
    console.log('Handling answer:', data);
    
    // Prevent duplicate processing
    if (isProcessingAnswer.current) {
      console.log('⚠️ Already processing an answer, ignoring duplicate');
      return;
    }
    
    // Handle both data.answer and data directly
    const answer = data.answer || data;
    
    if (!answer || !answer.type) {
      console.error('Invalid answer data:', data);
      return;
    }

    if (!peerConnection.current) {
      console.error('No peer connection to handle answer');
      return;
    }

    // Check if we're in the right state to receive an answer
    if (peerConnection.current.signalingState !== 'have-local-offer') {
      console.log('Not in correct state for answer. State:', peerConnection.current.signalingState);
      return;
    }

    isProcessingAnswer.current = true;

    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      // Process pending ICE candidates
      pendingIceCandidates.current.forEach(candidate => {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      });
      pendingIceCandidates.current = [];
    } catch (error) {
      console.error('Error handling answer:', error);
    } finally {
      isProcessingAnswer.current = false;
    }
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
        userId, 
        remoteUserId, 
        remoteUserIdRef: remoteUserIdRef.current 
      });
      return;
    }

    if (!stompClient.current || !stompClient.current.connected) {
      console.error('Cannot send signal: WebSocket not connected');
      return;
    }

    const signalMessage = {
      signalType,
      ...signalData
    };

    const destination = `/app/call/${userId}/${receiverId}`;
    console.log(`Sending signal ${signalType} from ${userId} to ${receiverId}`);
    console.log(`Destination: ${destination}`);
    console.log(`Message:`, signalMessage);

    stompClient.current.publish({
      destination: destination,
      body: JSON.stringify(signalMessage)
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
    clearCallTimeout();
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
    setCallHistoryId(null);
    setOriginalCallerId(null);
    setOriginalReceiverId(null);
    setCallType('AUDIO');
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
    isConnected,
    callHistoryId,
    callType,
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
