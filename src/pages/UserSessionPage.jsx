import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  postOffer,
  getSignaling,
  postAnswer,
  uploadAudioFile,
} from "../api/sessions";
import API from "../api/API";

const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }; // add TURN in prod

export default function UserSessionPage() {
  const { id: sessionIdParam } = useParams();
  const sessionId = sessionIdParam || (useLocation().state || {}).session?.id;
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const pollTimerRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [error, setError] = useState("");

  if (!sessionId) {
    return <div>Session id missing</div>;
  }

  useEffect(() => {
    // poll signaling / approval and ended_at
    pollTimerRef.current = setInterval(async () => {
      try {
        const sig = await getSignaling(sessionId);
        if (sig.approved_by_speaker) {
          setApproved(true);
          if (sig.started_at && sig.ended_at) {
            const end = new Date(sig.ended_at).getTime();
            const now = new Date(sig.started_at).getTime();
            setRemaining(Math.max(0, Math.floor((end - Date.now()) / 1000)));
          }
        }
        // if answer appeared (in case user posted offer earlier and is still waiting)
        if (sig.answer && pcRef.current && !pcRef.current.remoteDescription) {
          const answer = sig.answer;
          pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setConnected(true);
        }
        if (sig.ended_at) {
          // session ended by server
          endCallCleanup();
        }
      } catch (err) {
        // ignore network errors silently
      }
    }, 2000);

    return () => {
      clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    let countdown;
    if (remaining !== null) {
      // update every second
      countdown = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(countdown);
            // end call when time's up
            endCallCleanup();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [remaining]);

  const startLocalMedia = async () => {
    const constraints = { audio: true, video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    // ensure audio recording uses audio-only track
    startAudioRecorder(stream);
    return stream;
  };

  const startAudioRecorder = (stream) => {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) return;
    const audioOnlyStream = new MediaStream([audioTracks[0]]);
    try {
      const recorder = new MediaRecorder(audioOnlyStream, { mimeType: "audio/webm" });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // create blob and upload
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        uploadAudioFile(sessionId, blob).catch((err) => {
          console.error("Audio upload failed", err);
        });
      };
      recorder.start();
      audioRecorderRef.current = recorder;
    } catch (err) {
      console.warn("MediaRecorder not supported or error:", err);
    }
  };

  const stopAudioRecorder = () => {
    try {
      audioRecorderRef.current?.stop();
      audioRecorderRef.current = null;
    } catch (e) {}
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // attach remote tracks
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    pc.onicecandidate = (ev) => {
      // we rely on trickle ICE + client collecting and server supports it if needed
      // Could send candidate to server if you add endpoints for it.
    };

    return pc;
  };

  const handleCreateOfferAndSend = async () => {
    setError("");
    try {
      await startLocalMedia();
      const pc = createPeerConnection();
      // add local tracks
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // send to backend
      await postOffer(sessionId, offer);
      setJoined(true);
      // then wait for answer in poll loop
    } catch (err) {
      console.error(err);
      setError("Could not start call. Check camera/mic permissions.");
    }
  };

  const endCallCleanup = async () => {
    // stop recorder and upload handled in recorder.onstop
    stopAudioRecorder();

    // stop local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // close pc
    try {
      pcRef.current?.close();
    } catch (e) {}
    pcRef.current = null;

    setConnected(false);
    setJoined(false);
    // optionally navigate back or refresh session state
  };

  const handleEndClick = async () => {
    // end locally: stop and upload
    endCallCleanup();
    // optionally call backend to set ended_at earlier -- speaker/server enforces end
    navigate("/user-home");
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setMuted(!t.enabled);
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Session #{sessionId} — User</h2>

      {!approved && <p className="text-sm text-gray-600">Waiting for speaker to approve...</p>}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-72 bg-black" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-72 bg-black" />
      </div>

      <div className="mt-4 space-x-3">
        {!joined ? (
          <button onClick={handleCreateOfferAndSend} className="px-4 py-2 bg-primary text-white rounded">
            Request Call (send offer)
          </button>
        ) : (
          <button onClick={() => setJoined(false)} className="px-4 py-2 bg-gray-400 text-white rounded" disabled>
            Offer Sent — waiting for speaker
          </button>
        )}

        <button onClick={toggleMute} className="px-4 py-2 bg-secondaryblue text-white rounded">
          {muted ? "Unmute" : "Mute"}
        </button>

        <button onClick={handleEndClick} className="px-4 py-2 bg-red-600 text-white rounded">
          End / Leave
        </button>
      </div>

      {remaining !== null && (
        <p className="mt-3 text-sm text-red-600">Time remaining: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
