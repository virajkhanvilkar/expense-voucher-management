
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const monthlyData = [
  { month: "May", amount: 12000 },
  { month: "Jun", amount: 18500 },
  { month: "Jul", amount: 14200 },
  { month: "Aug", amount: 22400 },
  { month: "Sep", amount: 16800 },
  { month: "Oct", amount: 9500 },
];

const statusData = [
  { name: "Pending", value: 8 },
  { name: "Approved", value: 24 },
  { name: "Rejected", value: 3 },
];

const COLORS = ["#F59E0B", "#16A34A", "#DC2626"];

export default function DirectorAnalytics() {
  return (
    <div className="director-analytics">
      <section className="analytics-card">
        <h2>Monthly Expense Trend</h2>
        <p>Expense amounts by month</p>

        <div className="analytics-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="amount"
                fill="#2563EB"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="analytics-card">
        <h2>Voucher Status</h2>
        <p>Illustrative status distribution</p>

        <div className="analytics-chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
              >
                {statusData.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
