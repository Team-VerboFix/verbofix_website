import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import { FaMicrophone, FaStop, FaUpload, FaSpinner, FaPlay, FaPause, FaExclamationCircle, FaCheckCircle, FaClock, FaChartBar, FaComment } from "react-icons/fa";

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

  // Start recording audio with live waveform
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Set up Web Audio API for live waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        drawRecordedWaveform(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      drawLiveWaveform();
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Draw live waveform during recording
  const drawLiveWaveform = () => {
    const canvas = liveCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgb(240, 240, 240)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgb(59, 130, 246)";
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
    const ctx = canvas.getContext("2d");
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    ctx.fillStyle = "rgb(240, 240, 240)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgb(16, 185, 129)";
    ctx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / channelData.length;
    let x = 0;

    for (let i = 0; i < channelData.length; i++) {
      const v = channelData[i];
      const y = ((v + 1) * canvas.height) / 2;

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

  // Draw stammered periods timeline
  const drawStammeredTimeline = () => {
    if (!report || !timelineCanvasRef.current) return;

    const canvas = timelineCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const duration = parseFloat(report.audioDuration) || 30; // Default to 30s if undefined
    const periods = report.stammeredPeriods[0] === "None"
      ? []
      : report.stammeredPeriods.map(period => {
          const [start, end] = period.replace("s", "").split("-").map(Number);
          return { start, end };
        });

    ctx.fillStyle = "rgb(240, 240, 240)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background (fluent periods)
    ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stammered periods
    periods.forEach(period => {
      const startX = (period.start / duration) * canvas.width;
      const width = ((period.end - period.start) / duration) * canvas.width;
      ctx.fillStyle = "rgba(239, 68, 68, 0.7)";
      ctx.fillRect(startX, 0, width, canvas.height);
    });

    // Draw grid and time markers
    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    const step = duration / 5; // 5 markers
    for (let i = 0; i <= 5; i++) {
      const x = (i / 5) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.fillStyle = "rgb(55, 65, 81)";
      ctx.font = "12px Poppins";
      ctx.fillText(`${(i * step).toFixed(1)}s`, x + 2, canvas.height - 5);
    }
  };

  // Highlight stammered periods in transcription
  const renderTranscription = () => {
    if (!report.transcription || report.stammeredPeriods[0] === "None") {
      return <span>{report.transcription}</span>;
    }

    const periods = report.stammeredPeriods.map(period => {
      const [start, end] = period.replace("s", "").split("-").map(Number);
      return { start, end };
    });

    // Split transcription into words (basic splitting, Whisper doesn't provide timestamps)
    const words = report.transcription.split(" ");
    // Estimate word timing linearly based on audio duration
    const duration = parseFloat(report.audioDuration) || 30;
    const wordDuration = duration / words.length;
    const highlightedWords = words.map((word, index) => {
      const wordStart = index * wordDuration;
      const wordEnd = (index + 1) * wordDuration;
      const isStammered = periods.some(period => (
        (wordStart >= period.start && wordStart < period.end) ||
        (wordEnd > period.start && wordEnd <= period.end) ||
        (wordStart <= period.start && wordEnd >= period.end)
      ));

      return (
        <span
          key={index}
          className={isStammered ? "text-primary" : "text-primary"}
        >
          {word}{" "}
        </span>
      );
    });

    return highlightedWords;
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      drawRecordedWaveform(file);
    } else {
      alert("Please upload a valid audio file (WAV or MP3).");
    }
  };

  // Toggle play/pause for recorded audio
  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Send audio to Flask backend and get report
  const processAudio = async () => {
    if (!audioBlob) {
      alert("Please record or upload an audio file first.");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.wav");

      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const generatedReport = await response.json();
      setReport(generatedReport);
      localStorage.setItem("stammerReport", JSON.stringify(generatedReport));
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("Failed to process audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Draw timeline when report changes
  useEffect(() => {
    if (report) {
      drawStammeredTimeline();
    }
  }, [report]);

  // Clean up audio URL and animation frame on component unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioUrl]);

  return (
    <div className="flex min-h-screen bg-light font-poppins">
      <UserSidebar />
      <div className="flex flex-col flex-1 items-center py-10 px-8 ml-38">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">Stammer Analysis</h1>
        <p className="text-lg text-gray-600 mb-8">
          Record or upload an audio sample to analyze stammering patterns with real-time visuals and transcription.
        </p>

        {/* Audio Recording/Upload Section */}
        <div className="bg-white shadow-xl rounded-xl p-6 w-full max-w-3xl mb-8 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaMicrophone className="mr-2 text-blue-500" /> Audio Input
          </h2>
          <div className="flex flex-col items-center gap-6">
            {/* Live Waveform */}
            {isRecording && (
              <canvas
                ref={liveCanvasRef}
                width="600"
                height="100"
                className="w-full border border-gray-200 rounded-lg"
              />
            )}
            {/* Recorded Audio Waveform and Playback */}
            {audioBlob && !isRecording && (
              <div className="w-full">
                <canvas
                  ref={recordedCanvasRef}
                  width="600"
                  height="100"
                  className="w-full border border-gray-200 rounded-lg mb-4"
                />
                <div className = "flex items-center gap-4">
                  <button
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                  </button>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                  <p className="text-gray-600">Play your recording</p>
                </div>
              </div>
            )}
            {/* Recording and Upload Controls */}
            <div className="flex gap-4">
              <button
                className={`p-4 rounded-full text-white ${
                  isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                } disabled:opacity-50 transition-colors`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? <FaStop size={24} /> : <FaMicrophone size={24} />}
              </button>
              <button
                className="p-4 bg-green-500 rounded-full text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                onClick={() => fileInputRef.current.click()}
                disabled={isRecording || isProcessing}
              >
                <FaUpload size={24} />
              </button>
            </div>
            <input
              type="file"
              accept="audio/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            {audioBlob && !isRecording && (
              <p className="text-gray-600 flex items-center">
                <FaCheckCircle className="mr-2 text-green-500" /> Audio ready for analysis
              </p>
            )}
            <button
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 transition-all"
              onClick={processAudio}
              disabled={isProcessing || !audioBlob}
            >
              {isProcessing ? (
                <FaSpinner className="animate-spin inline mr-2" />
              ) : (
                "Analyze Audio"
              )}
            </button>
          </div>
        </div>

        {/* Report Section */}
        {report && (
          <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-3xl border border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
              <FaChartBar className="mr-2 text-blue-500" /> Analysis Report
            </h2>
            {/* Stammered Periods Timeline */}
            <div className="mb-6">
              <p className="text-lg text-gray-700 font-semibold flex items-center mb-2">
                <FaExclamationCircle className="mr-2 text-red-500" /> Stammered Periods Timeline
              </p>
              <canvas
                ref={timelineCanvasRef}
                width="600"
                height="50"
                className="w-full border border-gray-200 rounded-lg"
                title="Red: Stammered periods, Green: Fluent periods"
              />
            </div>
            {/* Transcription */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow-sm">
              <p className="text-lg text-gray-700 font-semibold flex items-center mb-2">
                <FaComment className="mr-2 text-blue-500" /> Transcription
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {renderTranscription()}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Note: Red words indicate stammered periods detected by our model. Whisper may miss some stammering nuances.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow-sm">
                <p className="text-lg text-gray-700 flex items-center">
                  <FaClock className="mr-2 text-blue-500" />
                  <strong>Date:</strong> {report.date}
                </p>
                {/* <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaExclamationCircle className="mr-2 text-red-500" />
                  <strong>Stammered Periods:</strong>{" "}
                  {report.stammeredPeriods[0] === "None"
                    ? "None"
                    : report.stammeredPeriods.join(", ")}
                </p> */}
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaChartBar className="mr-2 text-purple-500" />
                  <strong>Stammer Rate:</strong> {report.stammerRate}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaClock className="mr-2 text-green-500" />
                  <strong>Audio Duration:</strong> {report.audioDuration}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg fathom-sm">
                <p className="text-lg text-gray-700 flex items-center">
                  <FaCheckCircle className="mr-2 text-green-500" />
                  <strong>Total Stammered Chunks:</strong> {report.stammeredChunks}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaCheckCircle className="mr-2 text-blue-500" />
                  <strong>Total Fluent Chunks:</strong> {report.fluentChunks}
                </p>
                <p className="text-lg text-gray-700 flex items-center mt-2">
                  <FaExclamationCircle className="mr-2 text-orange-500" />
                  <strong>Severity:</strong>{" "}
                  <span
                    className={`${
                      report.severity === "High"
                        ? "text-red-600"
                        : report.severity === "Moderate"
                        ? "text-orange-600"
                        : "text-green-600"
                    } font-semibold`}
                  >
                    {report.severity}
                  </span>
                </p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <p className="text-lg text-gray-700 font-semibold flex items-center mb-2">
                <FaCheckCircle className="mr-2 text-blue-500" /> Recommendations
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                {report.recommendations.map((rec, index) => (
                  <li key={index} className="text-lg flex items-start">
                    <FaCheckCircle className="mr-2 text-green-500 mt-1" /> {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-6">
          <button
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
            onClick={() => navigate("/user-home")}
          >
            Back to Home
          </button>
          {report && (
            <button
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all"
              onClick={() => navigate("/user-home/report")}
            >
              View Other Reports
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserStammerAnalysisPage;