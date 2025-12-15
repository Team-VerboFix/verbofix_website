import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import {
  FaMicrophone,
  FaStop,
  FaUpload,
  FaSpinner,
  FaPlay,
  FaPause,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
  FaChartBar,
  FaComment,
} from "react-icons/fa";

const UserStammerAnalysisPage = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [report, setReport] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const recordedCanvasRef = useRef(null);
  const timelineCanvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);

  // ---- Recording ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // prepare recorder
      const options = { mimeType: "audio/webm" }; // broadly supported
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      // WebAudio for live waveform
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyserRef.current);

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        // produce a webm blob -> send as audio file
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        // draw recorded waveform if canvas mounted
        try {
          await drawRecordedWaveform(blob);
        } catch (err) {
          console.warn("drawRecordedWaveform failed:", err);
        }
      };

      mr.start();
      setIsRecording(true);

      // Only start visualizer if canvas exists
      requestAnimationFrame(drawLiveWaveform);
    } catch (err) {
      console.error("startRecording error:", err);
      alert("Could not start recording — check microphone permissions.");
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      // Do not close audioContext here (keeps reuse easier)
    } catch (err) {
      console.warn("stopRecording error:", err);
    }
  };

  // ---- Canvas drawing ----
  // Draw live waveform during recording
  const drawLiveWaveform = () => {
    const canvas = liveCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) {
      // canvas or analyser not ready — try again next frame only if still recording
      if (isRecording) animationFrameRef.current = requestAnimationFrame(drawLiveWaveform);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount || analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgb(240, 240, 240)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgb(0, 153, 76)";
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };


  // Draw waveform for recorded audio
  const drawRecordedWaveform = async (blob) => {
    const canvas = recordedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0) || new Float32Array(0);

      ctx.fillStyle = "rgb(240, 240, 240)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgb(0, 153, 76)";
      ctx.beginPath();

      // avoid giant loops when audio long; sample to canvas width
      const step = Math.max(1, Math.floor(channelData.length / canvas.width));
      let x = 0;
      for (let i = 0; i < channelData.length; i += step) {
        const v = channelData[i];
        const y = ((v + 1) * canvas.height) / 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += 1;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      try { audioContext.close(); } catch (_) {}
    } catch (err) {
      console.warn("drawRecordedWaveform error:", err);
    }
  };


  const safeParsePeriods = (reportObj) => {
    if (!reportObj) return [];
    const arr = reportObj.stammeredPeriods;
    if (!Array.isArray(arr)) return [];
    if (arr.length === 0) return [];
    if (arr[0] === "None") return [];
    // parse strings "start-end s" or "start-end"
    return arr
      .map((p) => {
        try {
          const cleaned = p.replace(/s/g, "");
          const [s, e] = cleaned.split("-").map(parseFloat);
          if (isNaN(s) || isNaN(e)) return null;
          return { start: s, end: e };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  };

  const drawStammeredTimeline = () => {
    if (!report || !timelineCanvasRef.current) return;
    const canvas = timelineCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const duration = (() => {
      const d = report.audioDuration;
      if (!d) return 30.0;
      // expect "12.3s" or number
      if (typeof d === "string" && d.endsWith("s")) return parseFloat(d.replace("s", "")) || 30.0;
      return parseFloat(d) || 30.0;
    })();

    const periods = safeParsePeriods(report);

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // fluent background
    ctx.fillStyle = "rgba(16,185,129,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // stammered zones
    periods.forEach((p) => {
      const startX = (p.start / duration) * canvas.width;
      const widthX = ((p.end - p.start) / duration) * canvas.width;
      ctx.fillStyle = "rgba(239,68,68,0.75)";
      ctx.fillRect(startX, 0, Math.max(1, widthX), canvas.height);
    });

    // grid and markers
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    const step = duration / 5.0;
    ctx.fillStyle = "#374151";
    ctx.font = "12px sans-serif";
    for (let i = 0; i <= 5; i++) {
      const x = (i / 5) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.fillText(`${(i * step).toFixed(1)}s`, x + 3, canvas.height - 4);
    }
  };

  // ---- File upload handler ----
  const handleFileUpload = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file (wav/mp3/webm).");
      return;
    }
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    try {
      await drawRecordedWaveform(file);
    } catch (_) {}
  };

  // ---- Playback toggle ----
  const togglePlayPause = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      audioEl.play().catch(console.warn);
      setIsPlaying(true);
    }
  };

  // ---- Send to backend for analysis ----
  const processAudio = async () => {
    if (!audioBlob) {
      alert("Please record or upload audio first.");
      return;
    }
    setIsProcessing(true);
    try {
      const fd = new FormData();
      // name the file appropriately; backend expects form field 'audio'
      fd.append("audio", audioBlob, audioBlob.name || "sample.webm");

      // Use relative path so your dev-server proxy or same-origin works.
      const token = localStorage.getItem("access_token") || null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch("/api/sessions/analyze-audio/", {
        method: "POST",
        body: fd,
        headers,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }

      const json = await res.json();
      // defensive: ensure arrays exist
      if (!json.recommendations) json.recommendations = [];
      if (!json.stammeredPeriods) json.stammeredPeriods = ["None"];
      setReport(json);
      localStorage.setItem("stammerReport", JSON.stringify(json));
      // draw timeline now that report is set
      setTimeout(() => drawStammeredTimeline(), 50);
    } catch (err) {
      console.error("processAudio failed:", err);
      alert("Failed to process audio: " + (err.message || "unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  // redraw timeline when report changes
  useEffect(() => {
    if (report) drawStammeredTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      try {
        if (audioContextRef.current) audioContextRef.current.close();
      } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // render
  return (
    <div className="flex min-h-screen bg-light font-poppins">
      <UserSidebar />
      <div className="flex flex-col flex-1 items-center py-10 px-8 ml-38">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">Stammer Analysis</h1>
        <p className="text-lg text-gray-600 mb-8">
          Record or upload an audio sample to analyze stammering patterns with real-time visuals and
          transcription.
        </p>

        <div className="bg-light shadow-md rounded-xl p-6 w-full max-w-3xl mb-8 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaMicrophone className="mr-2 text-primary hover:text-primary-200" /> Audio Input
          </h2>

          <div className="flex flex-col items-center gap-6">
            {/* live waveform canvas - always present but hidden when not recording (avoids null refs) */}
            <canvas ref={liveCanvasRef} width="600" height="100" className={`w-full border border-gray-200 rounded-lg ${isRecording ? "" : "hidden"}`} />

            {/* recorded waveform always present when audioBlob exists */}
            <canvas ref={recordedCanvasRef} width="600" height="100" className={`w-full border border-gray-200 rounded-lg ${audioBlob && !isRecording ? "" : "hidden"} mb-4`} />

            {audioBlob && !isRecording && (
              <div className="w-full">
                <div className="flex items-center gap-4">
                  <button className="p-3 bg-primary text-white rounded-full hover:primary-200" onClick={togglePlayPause}>
                    {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                  </button>
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  <p className="text-gray-600">Play your recording</p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                className={`p-4 rounded-full text-white ${isRecording ? "bg-red-600 hover:bg-red-400" : "bg-primary hover:bg-primary-200 transition"}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? <FaStop size={24} /> : <FaMicrophone size={24} />}
              </button>

              <button
                className="p-4 bg-primary rounded-full text-white hover:bg-primary-200 transition"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={isRecording || isProcessing}
              >
                <FaUpload size={24} />
              </button>
            </div>

            <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            {audioBlob && !isRecording && (
              <p className="text-gray-600 flex items-center">
                <FaCheckCircle className="mr-2 text-primary" /> Audio ready for analysis
              </p>
            )}

            <button
              className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-primary-200 text-white rounded-lg disabled:opacity-50"
              onClick={processAudio}
              disabled={isProcessing || !audioBlob}
            >
              {isProcessing ? <FaSpinner className="animate-spin inline mr-2" /> : "Analyze Audio"}
            </button>
          </div>
        </div>

        {report && (
          <div className="bg-light shadow-md rounded-xl p-8 w-full max-w-3xl border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
              <FaChartBar className="mr-2 text-primary" /> Analysis Report
            </h2>

            <div className="mb-6">
              <p className="text-lg text-gray-700 font-semibold flex items-center mb-2">
                <FaExclamationCircle className="mr-2 text-red-500" /> Stammered Periods Timeline
              </p>
              <canvas ref={timelineCanvasRef} width="600" height="50" className="w-full border border-gray-200 rounded-lg" title="Red: Stammered periods, Green: Fluent periods" />
            </div>

            <div className="mb-6 bg-light p-4 rounded-lg shadow-sm border border-primary-200">
              <p className="text-lg text-gray-700 font-semibold flex items-center mb-2">
                <FaComment className="mr-2 text-primary" /> Transcription
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">{report.transcription || "—"}</p>
              <p className="text-sm text-gray-500 mt-2">Note: red highlights are approximate based on detected time ranges.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-light p-4 rounded-lg shadow-sm border border-primary-200">
                <p className="text-lg text-gray-700 flex items-center">
                  <FaClock className="mr-2 text-primary" />
                  <strong>Date:</strong> {report.date || "—"}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaChartBar className="mr-2 text-primary" />
                  <strong>Stammer Rate:</strong> {report.stammerRate || report.stammer_rate || "—"}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaClock className="mr-2 text-primary" />
                  <strong>Audio Duration:</strong> {report.audioDuration || "—"}
                </p>
              </div>

              <div className="bg-light p-4 shadow-sm border border-primary-200 rounded-lg fathom-sm">
                <p className="text-lg text-gray-700 flex items-center">
                  <FaCheckCircle className="mr-2 text-primary" />
                  <strong>Total Stammered Chunks:</strong> {report.stammeredChunks ?? "—"}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaCheckCircle className="mr-2 text-primary" />
                  <strong>Total Fluent Chunks:</strong> {report.fluentChunks ?? "—"}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaExclamationCircle className="mr-2 text-orange-500" />
                  <strong>Severity:</strong>{" "}
                  <span className={`${report.severity === "High" ? "text-red-600" : report.severity === "Moderate" ? "text-orange-600" : "text-green-600"} font-semibold`}>
                    {report.severity || "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-light p-4 rounded-lg shadow-sm border border-primary-200">
              <p className="text-lg text-gray-700 font-semibold flex items-center mb-2">
                <FaCheckCircle className="mr-2 text-primary" /> Recommendations
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                {(report.recommendations || []).map((r, i) => (
                  <li key={i} className="text-lg flex items-start">
                    <FaCheckCircle className="mr-2 text-primary mt-1" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-6">
          <button className="px-6 py-3 bg-gradient-to-r from-primary to-primary-200 text-white rounded-lg" onClick={() => navigate("/user-home")}>
            Back to Home
          </button>
          {report && (
            <button className="px-6 py-3 bg-gradient-to-r from-primary to-primary-200 text-white rounded-lg" onClick={() => navigate("/user-home/report")}>
              View Other Reports
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserStammerAnalysisPage;
