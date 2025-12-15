import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import {
  FaSpinner,
  FaChartBar,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaComment,
} from "react-icons/fa";
import { getReportStatus, getSessionReport } from "../api/sessions";

const UserSessionReportPage = () => {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);


  const timelineCanvasRef = useRef(null);

  // -------------------------
  // Poll report status
  // -------------------------
  useEffect(() => {
    let poller;

    const pollStatus = async () => {
    try {
        const status = await getReportStatus(sessionId);

        if (!status.ended_at) {
        setError("Session has not ended yet.");
        return;
        }

        if (status.report_generated) {
        setProcessing(false);
        fetchReport();
        clearInterval(poller);
        }
    } catch (err) {
        console.error("Polling failed", err);
        setError("Report generation failed or audio upload did not complete.");
        setProcessing(false);
        clearInterval(poller);
    }
    };


    const fetchReport = async () => {
      try {
        const data = await getSessionReport(sessionId);
        setReport(data.raw_output ? data.raw_output : data);
      } catch (err) {
        console.error("Fetching report failed", err);
      } finally {
        setLoading(false);
      }
    };

    pollStatus();
    poller = setInterval(pollStatus, 3000);

    return () => clearInterval(poller);
  }, [sessionId]);

  // -------------------------
  // Timeline drawing (same logic as analysis page)
  // -------------------------
  const safeParsePeriods = () => {
    if (!report || !Array.isArray(report.stammeredPeriods)) return [];
    if (report.stammeredPeriods[0] === "None") return [];
    return report.stammeredPeriods
      .map((p) => {
        const cleaned = p.replace(/s/g, "");
        const [s, e] = cleaned.split("-").map(parseFloat);
        if (isNaN(s) || isNaN(e)) return null;
        return { start: s, end: e };
      })
      .filter(Boolean);
  };

  const drawTimeline = () => {
    if (!timelineCanvasRef.current || !report) return;
    const canvas = timelineCanvasRef.current;
    const ctx = canvas.getContext("2d");

    const duration =
      typeof report.audioDuration === "string"
        ? parseFloat(report.audioDuration.replace("s", ""))
        : report.audioDuration || 30;

    const periods = safeParsePeriods();

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // fluent background
    ctx.fillStyle = "rgba(16,185,129,0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    periods.forEach((p) => {
      const x = (p.start / duration) * canvas.width;
      const w = ((p.end - p.start) / duration) * canvas.width;
      ctx.fillStyle = "rgba(239,68,68,0.75)";
      ctx.fillRect(x, 0, Math.max(1, w), canvas.height);
    });
  };

  useEffect(() => {
    if (report) setTimeout(drawTimeline, 50);
  }, [report]);

  // -------------------------
  // RENDER STATES
  // -------------------------
  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-primary mr-3" />
        <span className="text-lg font-semibold">
          Generating session report…
        </span>
      </div>
    );
  }

  if (loading || !report) {
    return <div className="text-center mt-10 text-primary">Loading report…</div>;
  }

  // -------------------------
  // MAIN RENDER  d
  // -------------------------
  return (
    <div className="flex min-h-screen bg-light font-poppins">
      <UserSidebar />

      <div className="flex flex-col flex-1 items-center py-10 px-8 ml-38">
        <h1 className="text-4xl font-bold mb-6">
          Session #{sessionId} Report
        </h1>

        {/* Timeline */}
        <div className="bg-light shadow-md rounded-xl p-6 w-full max-w-3xl mb-6">
          <h2 className="text-xl text-dark font-semibold mb-3 flex items-center">
            <FaChartBar className="mr-2 text-red-500" />
            Stammered Timeline
          </h2>
          <canvas
            ref={timelineCanvasRef}
            width="600"
            height="50"
            className="w-full border rounded"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-6">
          <StatCard
            icon={<FaChartBar />}
            label="Stammer Rate"
            value={`${report.stammerRate || report.stammer_rate}%`}
          />
          <StatCard
            icon={<FaClock />}
            label="Audio Duration"
            value={report.audioDuration}
          />
          <StatCard
            icon={<FaCheckCircle />}
            label="Fluent Chunks"
            value={report.fluentChunks}
          />
          <StatCard
            icon={<FaExclamationCircle />}
            label="Severity"
            value={report.severity}
            severity
          />
        </div>

        {/* Transcription */}
        <Section title="Transcription" icon={<FaComment />}>
          <p className="whitespace-pre-wrap text-gray-700">
            {report.transcription || "—"}
          </p>
        </Section>

        {/* Recommendations */}
        <Section title="Recommendations" icon={<FaCheckCircle />}>
          <ul className="list-disc pl-6">
            {report.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate("/user-home")}
            className="px-6 py-3 bg-primary text-white rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, severity }) => (
  <div className="bg-light shadow-lg rounded-lg p-4">
    <p className="text-gray-600 flex items-center mb-1">
      {icon}
      <span className="ml-2">{label}</span>
    </p>
    <p
      className={`text-2xl font-bold ${
        severity
          ? value === "High"
            ? "text-red-600"
            : value === "Moderate"
            ? "text-orange-600"
            : "text-green-600"
          : "text-gray-800"
      }`}
    >
      {value}
    </p>
  </div>
);

const Section = ({ title, icon, children }) => (
  <div className="bg-light shadow-md rounded-xl p-6 w-full max-w-3xl mb-6">
    <h2 className="text-xl font-semibold mb-3 flex items-center">
      {icon}
      <span className="ml-2">{title}</span>
    </h2>
    {children}
  </div>
);

export default UserSessionReportPage;
