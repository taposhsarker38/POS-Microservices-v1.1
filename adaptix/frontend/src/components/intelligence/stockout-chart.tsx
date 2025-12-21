"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

interface StockoutChartProps {
  data: {
    date: string;
    predicted_sales: number;
    projected_stock: number;
    confidence_lower: number;
    confidence_upper: number;
  }[];
}

export function StockoutChart({ data }: StockoutChartProps) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={(val) =>
              new Date(val).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })
            }
            fontSize={12}
          />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value: number) => [Math.round(value), ""]}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend />
          <ReferenceLine
            y={0}
            stroke="red"
            strokeDasharray="3 3"
            label="Stockout"
          />

          <Line
            type="monotone"
            dataKey="projected_stock"
            name="Projected Stock"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="predicted_sales"
            name="Daily Demand (AI)"
            stroke="#9333ea"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
