import { useState, useCallback, useRef, useEffect } from 'react';
import socketClient, { getSocketIO } from '../../utils/socket.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CALL = {
  INCOMING: 'call:incoming',
  ACCEPTED: 'call:accepted',
  REJECTED: 'call:rejected',
  ENDED: 'call:ended',
  SIGNAL: 'call:signal',
  ICE: 'call:ice-candidate',
  INIT: 'call:initiate',
  ACC: 'call:accept',
  REJ: 'call:reject',
  END: 'call:ended',
  EMIT_END: 'call:end',
  EMIT_SIGNAL: 'call:signal',
  EMIT_ICE: 'call:ice-candidate',
};

function stopTracks(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

/**
 * Reusable WebRTC + Socket.IO call session management.
 * Use with `VideoCallModal` or wire your own UI to returned handlers/state.
 */
export function useVideoCall() {
  const [callState, setCallState] = useState('idle'); // idle | ringing | connecting | connected | ended
  const [callDirection, setCallDirection] = useState(null); // 'out' | 'in' | null
  const [incoming, setIncoming] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  const [durationSec, setDurationSec] = useState(0);

  const peerRef = useRef(null);
  const otherUserIdRef = useRef(null);
  const orderIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const durationTimerRef = useRef(null);
  const isCallerRef = useRef(false);
  const makingOfferRef = useRef(false);

  const ensureSocket = useCallback(() => {
    if (!socketClient.isInitialized) socketClient.initialize();
    if (!getSocketIO()?.connected) socketClient.connect();
  }, []);

  const closePeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.onnegotiationneeded = null;
      peerRef.current.close();
      peerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(
    (stopLocal = true) => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      closePeer();
      stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
      if (stopLocal) {
        stopTracks(localStreamRef.current);
        localStreamRef.current = null;
        setLocalStream(null);
      }
      setRemoteStream(null);
      setScreenSharing(false);
      setCallState('idle');
      setCallDirection(null);
      setIncoming(null);
      otherUserIdRef.current = null;
      orderIdRef.current = null;
      isCallerRef.current = false;
      makingOfferRef.current = false;
    },
    [closePeer]
  );

  const endCall = useCallback(() => {
    const other = otherUserIdRef.current;
    if (other) {
      try {
        socketClient.emitRaw(CALL.EMIT_END, { targetUserId: other });
      } catch {
        /* ignore */
      }
    }
    setCallState('ended');
    setTimeout(() => {
      cleanup(true);
      setDurationSec(0);
    }, 300);
  }, [cleanup]);

  const onIceCandidate = useCallback(
    (e) => {
      if (!e.candidate) return;
      const target = otherUserIdRef.current;
      if (target) {
        socketClient.emitRaw(CALL.EMIT_ICE, { targetUserId: target, candidate: e.candidate });
      }
    },
    []
  );

  const applyRemote = useCallback(
    async (pc, desc) => {
      if (!desc) return;
      if (pc.signalingState === 'have-remote-offer' && desc.type === 'offer') return;
      if (pc.signalingState === 'stable' && (desc.type === 'offer' || desc.type === 'answer')) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(desc));
        } catch (err) {
          console.error('setRemoteDescription', err);
        }
      }
    },
    []
  );

  const handleSignal = useCallback(
    async ({ from, signal }) => {
      if (from == null || !signal) return;
      if (String(from) !== String(otherUserIdRef.current)) return;

      const pc = peerRef.current;
      if (!pc) return;

      if (signal.type === 'offer' || signal.type === 'answer') {
        if (signal.type === 'offer') {
          if (isCallerRef.current) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketClient.emitRaw(CALL.EMIT_SIGNAL, { targetUserId: from, signal: pc.localDescription });
            setCallState('connected');
          } catch (e) {
            console.error('answer flow', e);
            setError(e?.message || 'Connection failed');
          }
        } else {
          if (!isCallerRef.current) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            setCallState('connected');
          } catch (e) {
            console.error('set answer', e);
            setError(e?.message || 'Connection failed');
          }
        }
      }
    },
    []
  );

  const handleRemoteIce = useCallback(
    async ({ from, candidate }) => {
      if (from == null || !candidate) return;
      if (String(from) !== String(otherUserIdRef.current)) return;
      const pc = peerRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;
    pc.onicecandidate = onIceCandidate;
    pc.ontrack = (ev) => {
      if (ev.streams && ev.streams[0]) {
        setRemoteStream(ev.streams[0]);
      } else if (ev.track) {
        setRemoteStream(new MediaStream([ev.track]));
      }
    };
    return pc;
  }, [onIceCandidate]);

  const getLocal = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const attachLocalToPc = useCallback(
    (pc) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      stream.getTracks().forEach((track) => {
        const exist = pc.getSenders().find((s) => s.track === track);
        if (!exist) pc.addTrack(track, stream);
      });
    },
    []
  );

  const startAsCaller = useCallback(
    async (targetUserId, orderId) => {
      ensureSocket();
      setError(null);
      isCallerRef.current = true;
      otherUserIdRef.current = targetUserId;
      orderIdRef.current = orderId ?? null;
      setCallState('connecting');
      setCallDirection('out');

      try {
        await getLocal();
        const pc = createPeer();
        attachLocalToPc(pc);
        setCallState('ringing');

        socketClient.emitRaw(CALL.INIT, { targetUserId, orderId });
      } catch (e) {
        setError(e?.message || 'Could not start call');
        cleanup(true);
      }
    },
    [ensureSocket, getLocal, createPeer, attachLocalToPc, cleanup]
  );

  const onCallAccepted = useCallback(
    async ({ acceptedBy }) => {
      if (!isCallerRef.current) return;
      if (String(acceptedBy) !== String(otherUserIdRef.current)) return;

      setCallState('connecting');
      const pc = peerRef.current;
      if (!pc) return;

      try {
        if (!localStreamRef.current) await getLocal();
        attachLocalToPc(pc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        makingOfferRef.current = true;
        socketClient.emitRaw(CALL.EMIT_SIGNAL, {
          targetUserId: acceptedBy,
          signal: pc.localDescription,
        });
        setCallState('connected');
        makingOfferRef.current = false;
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Connection failed');
        endCall();
      }
    },
    [getLocal, attachLocalToPc, endCall]
  );

  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    const callerId = incoming.callerId;
    ensureSocket();
    setError(null);
    isCallerRef.current = false;
    otherUserIdRef.current = callerId;
    orderIdRef.current = incoming.orderId ?? null;
    setIncoming(null);
    setCallState('connecting');
    setCallDirection('in');

    try {
      await getLocal();
      const pc = createPeer();
      attachLocalToPc(pc);
      socketClient.emitRaw(CALL.ACC, { targetUserId: callerId });
      setCallState('ringing');
    } catch (e) {
      setError(e?.message || 'Could not access camera / mic');
      cleanup(true);
    }
  }, [incoming, ensureSocket, getLocal, createPeer, attachLocalToPc, cleanup]);

  const rejectIncoming = useCallback(() => {
    if (incoming) {
      try {
        socketClient.emitRaw(CALL.REJ, { targetUserId: incoming.callerId });
      } catch {
        /* ignore */
      }
    }
    setIncoming(null);
    cleanup(true);
  }, [incoming, cleanup]);

  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (s) {
      const a = s.getAudioTracks()[0];
      if (a) {
        a.enabled = !a.enabled;
        setMuted(!a.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const s = localStreamRef.current;
    if (s) {
      const v = s.getVideoTracks()[0];
      if (v) {
        v.enabled = !v.enabled;
        setVideoOff(!v.enabled);
      }
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = display;
      const v = display.getVideoTracks()[0];
      const pc = peerRef.current;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(v);
      }
      v.onended = () => {
        setScreenSharing(false);
        (async () => {
          const currentPc = peerRef.current;
          if (localStreamRef.current && currentPc) {
            const cam = localStreamRef.current.getVideoTracks()[0];
            if (cam) {
              const sender = currentPc.getSenders().find((s) => s.track && s.track.kind === 'video');
              if (sender) await sender.replaceTrack(cam);
            }
          }
        })();
      };
      setScreenSharing(true);
    } catch (e) {
      setError(e?.message || 'Screen share was cancelled or failed');
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    stopTracks(screenStreamRef.current);
    screenStreamRef.current = null;
    const pc = peerRef.current;
    const s = localStreamRef.current;
    if (pc && s) {
      const cam = s.getVideoTracks()[0];
      const sender = pc.getSenders().find((x) => x.track && x.track.kind === 'video');
      if (sender && cam) await sender.replaceTrack(cam);
    }
    setScreenSharing(false);
  }, []);

  useEffect(() => {
    ensureSocket();

    const onIncoming = (payload) => {
      if (callState === 'connected' || callState === 'connecting' || (callState === 'ringing' && callDirection === 'out')) {
        return;
      }
      setIncoming(payload);
      setCallState('ringing');
      setCallDirection('in');
    };

    const onAccepted = (data) => {
      void onCallAccepted(data);
    };

    const onRejected = () => {
      if (isCallerRef.current) {
        setError('Call was declined');
        cleanup(true);
      }
    };

    const onEnded = () => {
      setCallState('ended');
      setTimeout(() => {
        cleanup(true);
        setDurationSec(0);
      }, 300);
    };

    const onSocketSignal = (data) => {
      void handleSignal(data);
    };
    const onSocketIce = (data) => {
      void handleRemoteIce(data);
    };

    socketClient.on(CALL.INCOMING, onIncoming);
    socketClient.on(CALL.ACCEPTED, onAccepted);
    socketClient.on(CALL.REJECTED, onRejected);
    socketClient.on(CALL.ENDED, onEnded);
    socketClient.on(CALL.SIGNAL, onSocketSignal);
    socketClient.on(CALL.ICE, onSocketIce);

    return () => {
      socketClient.off(CALL.INCOMING, onIncoming);
      socketClient.off(CALL.ACCEPTED, onAccepted);
      socketClient.off(CALL.REJECTED, onRejected);
      socketClient.off(CALL.ENDED, onEnded);
      socketClient.off(CALL.SIGNAL, onSocketSignal);
      socketClient.off(CALL.ICE, onSocketIce);
    };
  }, [ensureSocket, onCallAccepted, handleSignal, handleRemoteIce, callState, callDirection, cleanup]);

  useEffect(() => {
    if (callState !== 'connected') {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (callState === 'idle' || callState === 'ended') setDurationSec(0);
      return;
    }
    const started = Date.now();
    durationTimerRef.current = setInterval(() => {
      setDurationSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  return {
    callState,
    callDirection,
    incoming,
    localStream,
    remoteStream,
    muted,
    videoOff,
    screenSharing,
    error,
    durationSec,
    startOutgoingCall: startAsCaller,
    acceptIncoming,
    rejectIncoming,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    setError,
  };
}

export default useVideoCall;
