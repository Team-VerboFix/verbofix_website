import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  postOffer,
  postAnswer,
  getSignaling,
  uploadAudioFile,
  approveSession,
} from "../api/sessions";
import API from "../api/API";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const POLL_INTERVAL = 2000; // ms polling for answer/signaling

export default function SessionPage() {
  const { id: sessionId } = useParams();
  const { state } = useLocation(); // { role: 'user'|'speaker' } optionally
  const role = (state && state.role) || "user";
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const pollRef = useRef(null);
  const signalingPollRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [remoteStreamAvailable, setRemoteStreamAvailable] = useState(false);
  const [waitingText, setWaitingText] = useState("Waiting for other participant...");
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [countdown, setCountdown] = useState(null); // seconds left
  const [sessionObj, setSessionObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);



  // Helper: fetch session object details
  const fetchSession = async () => {
    try {
      const res = await API.get(`/sessions/sessions/${sessionId}/`);
      setSessionObj(res.data);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch session:", err);
      return null;
    }
  };

  // Start local media
  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      // initial flags
      setMuted(!stream.getAudioTracks().some(t => t.enabled));
      setVideoOn(stream.getVideoTracks().some(t => t.enabled));
      return stream;
    } catch (err) {
      console.error("getUserMedia failed:", err);
      alert("Camera / Microphone permission is required for the call.");
      throw err;
    }
  };

  // helper: wait for ice gathering to complete (resolve when complete or after timeout)
  const waitForIceGatheringComplete = (pc, timeout = 5000) => {
    return new Promise((resolve) => {
      if (!pc) return resolve();
      if (pc.iceGatheringState === "complete") return resolve();

      const onStateChange = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", onStateChange);
          clearTimeout(timer);
          resolve();
        }
      };

      pc.addEventListener("icegatheringstatechange", onStateChange);

      // safety timeout in case "complete" not fired (some browsers)
      const timer = setTimeout(() => {
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }, timeout);
    });
  };

  // Create RTCPeerConnection and attach local tracks (add onicecandidate for debug)
  const createPeerConnection = (onRemoteStream) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    pcRef.current = pc;

    // When remote tracks arrive
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        setRemoteStreamAvailable(true);
        setWaitingText(""); // clear "waiting" once remote is visible
      }
    };


    // Debug: log ice candidates as they are gathered
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        console.debug("ICE candidate gathered:", ev.candidate);
      } else {
        // null candidate indicates end of gathering
        console.debug("ICE gathering completed (null candidate).");
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      console.log("Connection state:", st);
      if (st === "connected" || st === "completed") {
        setConnected(true);
        setConnecting(false);
        setWaitingText("");
      } else if (st === "connecting") {
        setConnecting(true);
      } else if (st === "disconnected" || st === "failed" || st === "closed") {
        setConnected(false);
        setConnecting(false);
      }
    };


    return pc;
  };


  // User flow: create offer and store
  const runAsUser = async () => {
    const localStream = await startLocalMedia();
    const pc = createPeerConnection();
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    // create offer and set local description
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to finish so localDescription contains candidates
    await waitForIceGatheringComplete(pc, 6000);

    // post the full localDescription (has type + sdp with ICE)
    const toSendOffer = pc.localDescription; // this is RTCSessionDescriptionInit-like
    await postOffer(sessionId, toSendOffer);

    // poll for answer; when received, set remote description
    signalingPollRef.current = setInterval(async () => {
      try {
        const sig = await getSignaling(sessionId);
        if (sig && sig.answer) {
          // ensure it's a valid RTCSessionDescriptionInit
          const remoteAnswer = new RTCSessionDescription(sig.answer);
          await pc.setRemoteDescription(remoteAnswer);
          clearInterval(signalingPollRef.current);
          signalingPollRef.current = null;
        }
      } catch (err) {
        console.warn("polling signaling (user) failed:", err);
      }
    }, POLL_INTERVAL);

    // Start recording user's mic only (for upload)
    startRecordingIfUser(localStream);
  };

  

  // Speaker flow: fetch offer, set remote desc, create answer and post
  const runAsSpeaker = async () => {
    const localStream = await startLocalMedia();
    const pc = createPeerConnection();
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    // poll for offer
    const offerPoll = setInterval(async () => {
      try {
        const sig = await getSignaling(sessionId);
        if (sig && sig.offer) {
          clearInterval(offerPoll);

          // set remote description from offer
          const remoteOffer = new RTCSessionDescription(sig.offer);
          await pc.setRemoteDescription(remoteOffer);

          // create answer, set local desc
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // wait for ICE candidates to be gathered, then post the localDescription (answer)
          await waitForIceGatheringComplete(pc, 6000);
          const toSendAnswer = pc.localDescription;
          await postAnswer(sessionId, toSendAnswer);
        }
      } catch (err) {
        console.warn("polling signaling (speaker) failed:", err);
      }
    }, POLL_INTERVAL);
  };

  const submitFeedback = async () => {
      try {
        setSubmittingFeedback(true);

        await API.post("/sessions/feedback/", {
          session_id: sessionId,
          rating,
          comment,
          target: role === "speaker" ? "user" : "speaker",  // speaker rates user, user rates speaker
        });

        // After feedback → redirect correctly
        if (role === "speaker") {
          navigate("/speaker-home");
        } else {
          navigate(`/session/${sessionId}/report`);
        }

      } catch (err) {
        console.error("Feedback error:", err);
        alert("Failed to submit feedback");
      } finally {
        setSubmittingFeedback(false);
      }
    };

  // Recording: only record the user's mic audio track (not remote)
  const startRecordingIfUser = (stream) => {
    if (role !== "user") return;
    if (!stream) return;

    // create a stream with only the audio track
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn("No audio track to record.");
      return;
    }
    const audioStream = new MediaStream([audioTrack]);

    // MediaRecorder with default mime (browser chooses supported type)
    try {
      const recorder = new MediaRecorder(audioStream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        try {
          await uploadAudioFile(sessionId, blob);
          console.log("User audio uploaded.");
        } catch (err) {
          console.error("Audio upload failed:", err);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
    } catch (err) {
      console.warn("MediaRecorder not supported or failed:", err);
    }
  };

  // Stop recording and trigger upload
  const stopRecordingIfUser = () => {
    if (role !== "user") return;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  // End call cleanup
  const endCallCleanup = async () => {
    // stop polling
    if (signalingPollRef.current) {
      clearInterval(signalingPollRef.current);
      signalingPollRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    // stop recorder (uploads audio on stop)
    stopRecordingIfUser();

    // stop local tracks
    const ls = localStreamRef.current;
    if (ls) {
      ls.getTracks().forEach((t) => {
        try { t.stop(); } catch(e) {}
      });
      localStreamRef.current = null;
    }

    // close peerconnection
    const pc = pcRef.current;
    if (pc) {
      try { pc.close(); } catch (e) {}
      pcRef.current = null;
    }

    setConnected(false);
    setWaitingText("Call ended.");
  };

  // End call button handler - also navigate back to home after cleanup
  const handleEndCall = async () => {
    await endCallCleanup();
    // Optionally navigate back to home or session list:
    setShowFeedbackModal(true);
    // navigate(role === "speaker" ? "/speaker-home" : "/user-home");
  };

  // Toggle audio
  const toggleMute = () => {
    const ls = localStreamRef.current;
    if (!ls) return;
    ls.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted(ls.getAudioTracks().every((t) => !t.enabled));
  };

  // Toggle video
  const toggleVideo = () => {
    const ls = localStreamRef.current;
    if (!ls) return;
    ls.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setVideoOn(ls.getVideoTracks().some((t) => t.enabled));
  };

  // Monitor session started/ended and update countdown (poll server)
  useEffect(() => {
    let countdownTimer = null;
    const poll = async () => {
      const s = await fetchSession();
      if (!s) return;
      // If started_at and ended_at present, calculate seconds left
      if (s.started_at && s.ended_at) {
        const end = new Date(s.ended_at).getTime();
        const now = new Date().getTime();
        const secondsLeft = Math.max(0, Math.floor((end - now) / 1000));
        setCountdown(secondsLeft);
      } else {
        setCountdown(null);
      }
    };

    // initial poll and then interval
    poll();
    pollRef.current = setInterval(poll, 2000);

    // countdown tick
    countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // time up: cleanup and force reload of session object
          endCallCleanup();
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownTimer) clearInterval(countdownTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main setup on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // fetch the session object
        const s = await fetchSession();
        if (!mounted) return;

        // If the session has already been approved and started, both should connect;
        // but we still follow role flow: user posts offer, speaker answers.
        if (role === "user") {
          await runAsUser();
          setWaitingText("Waiting for speaker to join...");
        } else {
          // speaker: if not approved yet, they should still poll for offer after approving
          await runAsSpeaker();
          setWaitingText("Waiting for user to join...");
        }

        // poll signaling to detect remote track presence or answer (safety)
        // also keep fetching session to check started_at
        setLoading(false);
      } catch (err) {
        console.error("Session setup failed:", err);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      // cleanup resources
      endCallCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, role]);

  // Format countdown into mm:ss
  const formatCountdown = (secs) => {
    if (secs === null) return "--:--";
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // Upload recording on unmount if still open
  useEffect(() => {
    return () => {
      stopRecordingIfUser();
    };
  }, []);

  return (
    <div className="min-h-screen bg-light font-poppins p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">
            Session #{sessionId} — {role === "user" ? "User" : "Speaker"} view
          </h2>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Time left: <span className="font-mono">{formatCountdown(countdown)}</span>
            </div>
            <div className="text-xs text-gray-500">
              {waitingText && !remoteStreamAvailable && (
                <span className="animate-pulse">{waitingText}</span>
              )}
            </div>

          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* local video */}
          <div className="bg-black rounded-lg overflow-hidden relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-80 object-cover bg-gray-800"

            />
            {connecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                <span className="ml-2">Connecting...</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/40 text-white px-3 py-1 rounded">
              You
            </div>
          </div>

          {/* remote video */}
          <div className="bg-black rounded-lg overflow-hidden relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-80 object-cover bg-gray-800"
            />
            {connecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                <span className="ml-2">Connecting...</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/40 text-white px-3 py-1 rounded">
              Other
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg sticky bottom-6">
          <button
            onClick={toggleMute}
            className="p-3 rounded-full border bg-gray-100 hover:bg-gray-200 text-dark transition"
          >
            {muted ? <MicOff className="text-red-500" size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={toggleVideo}
            className="p-3 rounded-full border bg-gray-100 hover:bg-gray-200 text-dark transition"
          >
            {videoOn ? <Video size={22} /> : <VideoOff className="text-red-500" size={22} />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
          >
            <PhoneOff size={22} />
          </button>
        </div>


        <div className="mt-6 text-sm text-gray-600">
          <p>
            Status: {connected ? <span className="text-green-600">Connected</span> : <span>Not connected</span>}
          </p>
          <p className="mt-2">
            If the other party doesn't join, you'll remain in the waiting lobby
            until the session times out.
          </p>
        </div>
      </div>
      {showFeedbackModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">

          <h2 className="text-xl font-semibold mb-3 text-center">
            Share Your Feedback
          </h2>

          {/* ⭐ Rating */}
          <div className="flex justify-center mb-4">
            {[1,2,3,4,5].map((star) => (
              <span
                key={star}
                onClick={() => setRating(star)}
                className={`cursor-pointer text-3xl ${
                  star <= rating ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                ★
              </span>
            ))}
          </div>

          {/* ⭐ Comment */}
          <textarea
            className="w-full border rounded-lg p-3 text-gray-700"
            rows={3}
            placeholder="Write your comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          ></textarea>

          <button
            onClick={submitFeedback}
            disabled={submittingFeedback}
            className="mt-4 w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/80 transition"
          >
            {submittingFeedback ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    )}

    </div>
  );
}
