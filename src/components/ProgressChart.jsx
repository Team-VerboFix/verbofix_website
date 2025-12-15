import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ProgressChart = ({ sessions }) => {
  const data = sessions
    .filter((s) => s.report)
    .map((s) => ({
      date: new Date(s.scheduled_at).toLocaleDateString(),
      rate: s.report.stammer_rate,
    }))
    .reverse();

  if (data.length === 0) {
    return <p className="text-gray-400">No reports yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#7d9b76"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ProgressChart;
