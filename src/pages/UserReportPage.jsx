// src/pages/UserReportPage.jsx yes
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/api";

export default function UserReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await API.get(`/sessions/${id}/report/`);
        setReport(res.data);
      } catch (err) {
        console.error("Failed to fetch report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!report) return <div>No report yet — try uploading audio.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Session Report</h1>

      <div className="mb-4">
        <strong>Stammer rate:</strong> {report.stammer_rate ?? report.stammerRate ?? "N/A"}%
      </div>

      <div className="mb-4">
        <strong>Severity:</strong> {report.severity || "N/A"}
      </div>

      <div className="mb-4">
        <strong>Duration:</strong> {report.audioDuration || (report.raw_output && report.raw_output.duration) || "N/A"}
      </div>

      <div className="mb-4">
        <strong>Recommendations:</strong>
        <ul className="list-disc ml-6">
          {(report.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div className="mb-4">
        <strong>Transcription:</strong>
        <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded">{report.transcription || "—"}</div>
      </div>

      <div className="mb-4">
        <strong>Raw output (debug):</strong>
        <pre className="bg-black/5 p-3 rounded text-sm">{JSON.stringify(report.raw_output || {}, null, 2)}</pre>
      </div>

      <div className="mb-4">
        <strong>Recording:</strong>
        {report.session && report.session.recording_url ? (
          <audio src={report.session.recording_url} controls />
        ) : (
          <div>No recording available.</div>
        )}
      </div>
    </div>
  );
}
