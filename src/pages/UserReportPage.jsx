import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from "chart.js";
import UserSidebar from "../components/UserSidebar";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

const UserReportPage = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    // Fetch session report from localStorage
    const storedReport = JSON.parse(localStorage.getItem("sessionReport"));
    if (storedReport) {
      setReportData(storedReport);
    }
  }, []);

  // Dummy Data if No Session Found
  const defaultReport = {
    date: "N/A",
    speechClarity: 75,
    fluencyScore: 82,
    recommendation: "Focus on clear pronunciation and pacing.",
  };

  const data = reportData || defaultReport;

  // Chart Data
  const barChartData = {
    labels: ["Speech Clarity", "Fluency Score"],
    datasets: [
      {
        label: "Score",
        data: [data.speechClarity, data.fluencyScore],
        backgroundColor: ["#7d9b76", "#272727"],
      },
    ],
  };

  const lineChartData = {
    labels: ["Session 1", "Session 2", "Session 3", "Latest"],
    datasets: [
      {
        label: "Fluency Progress",
        data: [70, 75, 78, data.fluencyScore],
        fill: false,
        borderColor: "#272727",
        tension: 0.3,
      },
    ],
  };

  const doughnutData = {
    labels: ["Clarity", "Fluency"],
    datasets: [
      {
        data: [data.speechClarity, data.fluencyScore],
        backgroundColor: ["#7d9b76", "#272727"],
      },
    ],
  };

  return (
    <div className="flex">
      <UserSidebar />
      <div className="flex flex-col flex-1 items-center min-h-screen bg-light font-poppins px-8 ml-38 py-10">
        <h1 className="text-4xl font-bold text-dark mb-6">Session Report</h1>

        {/* Report Summary */}
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-3xl mb-8">
          <h2 className="text-2xl font-semibold text-dark mb-2">Summary</h2>
          <p className="text-lg text-gray-700"><strong>Date:</strong> {data.date}</p>
          <p className="text-lg text-gray-700"><strong>Speech Clarity:</strong> {data.speechClarity}%</p>
          <p className="text-lg text-gray-700"><strong>Fluency Score:</strong> {data.fluencyScore}%</p>
          <p className="text-lg text-gray-700"><strong>Recommendation:</strong> {data.recommendation}</p>
        </div>

        {/* Charts Section */}
        <div className="flex flex-wrap justify-center gap-8 w-full max-w-5xl">
          {/* Bar Chart */}
          <div className="bg-white p-6 shadow-lg rounded-lg w-80">
            <h3 className="text-xl font-semibold mb-4">Performance Scores</h3>
            <Bar data={barChartData} />
          </div>

          {/* Line Chart */}
          <div className="bg-white p-6 shadow-lg rounded-lg w-80">
            <h3 className="text-xl font-semibold mb-4">Fluency Progress</h3>
            <Line data={lineChartData} />
          </div>

          {/* Doughnut Chart */}
          <div className="bg-white p-6 shadow-lg rounded-lg w-72">
            <h3 className="text-xl font-semibold mb-4">Overall Insights</h3>
            <Doughnut data={doughnutData} />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-6">
          <button
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-dark"
            onClick={() => navigate("/user-home")}
          >
            Back to Home
          </button>
          <button
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-dark"
            onClick={() => navigate("/user-home/session")}
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserReportPage;
