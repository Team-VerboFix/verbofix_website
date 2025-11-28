import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getSignaling,
  postAnswer,
  approveSession,
} from "../api/sessions";
import API from "../api/API";

const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function SpeakerSessionPage() {
  const { id: sessionIdParam } = useParams();
  const sessionId = sessionIdParam || (useLocation().state || {}).session?.id;
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pollRef = useRef(null);

  const [offerReceived, setOfferReceived] = useState(false);
  const [connected, setConnected] = useState(false);
  const [approved, setApproved] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // poll for offer
    pollRef.current = setInterval(async () => {
      try {
        const sig = await getSignaling(sessionId);
        if (sig.offer && !offerReceived) {
          setOfferReceived(true);
        }
        if (sig.approved_by_speaker) {
          setApproved(true);
          if (sig.started_at && sig.ended_at) {
            setRemaining(Math.max(0, Math.floor((new Date(sig.ended_at).getTime() - Date.now()) / 1000)));
          }
        }
        if (sig.ended_at) {
          // remote ended
          cleanup();
        }
      } catch (err) {}
    }, 1500);

    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, offerReceived]);

  useEffect(() => {
    let interval;
    if (remaining !== null) {
      interval = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(interval);
            cleanup();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [remaining]);

  const startLocalMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnected(true);
      }
    };

    return pc;
  };

  const handleApprove = async () => {
    // approve via backend which sets started_at and ended_at
    try {
      await approveSession(sessionId);
      setApproved(true);
    } catch (err) {
      console.error("approve failed", err);
      setError("Could not approve session.");
    }
  };

  const handleAcceptOffer = async () => {
    setError("");
    try {
      const sig = await getSignaling(sessionId);
      if (!sig.offer) {
        setError("No offer found.");
        return;
      }

      const localStream = await startLocalMedia();
      const pc = createPeerConnection();
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      // set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(sig.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // send answer to backend
      await postAnswer(sessionId, answer);
      setConnected(true);
    } catch (err) {
      console.error(err);
      setError("Failed to accept offer.");
    }
  };

  const cleanup = () => {
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    try {
      pcRef.current?.close();
    } catch (e) {}
    pcRef.current = null;
    localStreamRef.current = null;
    setConnected(false);
    navigate("/speaker-home");
  };

  const handleEndCall = () => {
    cleanup();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Speaker Session #{sessionId}</h2>

      <p className="mt-2 text-sm text-gray-600">
        {offerReceived ? "User requested a call. Accept to start." : "Waiting for user to request a call..."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-72 bg-black" />
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-72 bg-black" />
      </div>

      <div className="mt-4 space-x-3">
        {!approved && (
          <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white rounded">
            Approve Session (start 10min window)
          </button>
        )}

        {offerReceived && (
          <button onClick={handleAcceptOffer} className="px-4 py-2 bg-primary text-white rounded">
            Accept Offer (connect)
          </button>
        )}

        <button onClick={handleEndCall} className="px-4 py-2 bg-red-600 text-white rounded">
          End/Close
        </button>
      </div>

      {remaining !== null && (
        <p className="mt-3 text-sm text-red-600">Time remaining: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>
      )}

      {error && <p className="text-red-500 mt-3">{error}</p>}
    </div>
  );
}
