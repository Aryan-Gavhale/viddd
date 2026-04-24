import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Loader2,
} from 'lucide-react';
import useVideoCall from './useVideoCall';

function formatDuration(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {number} [props.targetUserId] — User to call (outgoing). Omit to only receive incoming calls.
 * @param {number} [props.orderId] — Optional order context.
 * @param {() => void} props.onClose — Called when the call flow ends or user dismisses.
 */
function VideoCallModal({ targetUserId, orderId, onClose }) {
  const v = useVideoCall();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const startedRef = useRef(false);

  const {
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
    startOutgoingCall,
    acceptIncoming,
    rejectIncoming,
    endCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = v;

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (targetUserId == null || startedRef.current) return;
    startedRef.current = true;
    void startOutgoingCall(targetUserId, orderId);
  }, [targetUserId, orderId, startOutgoingCall]);

  const handleEnd = useCallback(() => {
    endCall();
  }, [endCall]);

  useEffect(() => {
    if (callState === 'ended') {
      const t = setTimeout(() => onClose?.(), 500);
      return () => clearTimeout(t);
    }
  }, [callState, onClose]);

  const showChrome =
    incoming ||
    callState !== 'idle' ||
    (targetUserId != null && callState === 'idle');

  if (!showChrome) return null;

  const isRinging = callState === 'ringing';
  const isConnected = callState === 'connected';
  const isIncomingRing = isRinging && callDirection === 'in' && Boolean(incoming);
  const statusLabel = (() => {
    if (isIncomingRing) return 'Incoming call';
    if (callState === 'ringing' && callDirection === 'out') return 'Ringing…';
    if (callState === 'connecting') return 'Connecting…';
    if (isConnected) return 'In call';
    if (callState === 'ended') return 'Call ended';
    if (error) return error;
    return 'Starting…';
  })();

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Video Call"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/50"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {isIncomingRing && (
            <motion.div
              className="absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-500/40"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Video call</p>
            <h2 className="text-lg font-semibold text-slate-100">
              {isIncomingRing && incoming
                ? `${incoming.callerName || 'Someone'}`
                : targetUserId
                  ? `User #${targetUserId}`
                  : 'Call'}
            </h2>
            {incoming?.orderId != null && (
              <p className="text-sm text-slate-400">Order #{incoming.orderId}</p>
            )}
            {orderId != null && targetUserId != null && (
              <p className="text-sm text-slate-400">Order #{orderId}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-sm text-cyan-300">
                {formatDuration(durationSec)}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isConnected
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : isRinging
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'bg-slate-800 text-slate-400'
              }`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="relative aspect-video w-full bg-black/80">
          {error && (
            <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-lg border border-rose-500/30 bg-rose-950/90 px-4 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />

          {(!remoteStream || !isConnected) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70">
              {callState === 'connecting' && <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />}
              {isIncomingRing && (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 ring-4 ring-cyan-500/20">
                    <Phone className="h-9 w-9" />
                  </div>
                  <p className="text-slate-300">Answer or decline</p>
                </>
              )}
              {callState === 'ringing' && callDirection === 'out' && (
                <p className="animate-pulse text-slate-400">Waiting for answer…</p>
              )}
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-10 h-28 w-40 overflow-hidden rounded-lg border-2 border-slate-700 bg-black shadow-lg">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {videoOff && <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500">Camera off</div>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 bg-slate-900/50 px-4 py-4">
          {isIncomingRing && (
            <>
              <button
                type="button"
                onClick={acceptIncoming}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <Phone className="h-4 w-4" />
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  rejectIncoming();
                  onClose?.();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                <PhoneOff className="h-4 w-4" />
                Decline
              </button>
            </>
          )}

          {!isIncomingRing && callState !== 'idle' && (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${
                  muted
                    ? 'border-rose-500/50 bg-rose-600/20 text-rose-200'
                    : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${
                  videoOff
                    ? 'border-amber-500/50 bg-amber-600/20 text-amber-200'
                    : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={videoOff ? 'Camera on' : 'Camera off'}
              >
                {videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => (screenSharing ? stopScreenShare() : startScreenShare())}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${
                  screenSharing
                    ? 'border-violet-400 bg-violet-600/30 text-violet-200'
                    : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={screenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <MonitorUp className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleEnd}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/50 bg-rose-600 text-white transition hover:bg-rose-500"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </>
          )}

          {callState === 'idle' && targetUserId != null && (
            <button
              type="button"
              onClick={() => onClose?.()}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(
    <AnimatePresence mode="wait">
      {content}
    </AnimatePresence>,
    document.body
  );
}

export default VideoCallModal;
