import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface UserGrowthChartProps {
  data: Array<{
    date: string;
    count: number;
  }>;
}

export const UserGrowthChart: React.FC<UserGrowthChartProps> = ({ data }) => {
  // Calculate cumulative growth
  let runningTotal = 0;
  const cumulativeData = data.map((item) => {
    runningTotal += item.count;
    return {
      ...item,
      total: runningTotal,
      new: item.count,
    };
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cumulativeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00C853" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#666" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
            }}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
            formatter={(value: any, name: string) => {
              if (name === 'total') return [value.toLocaleString(), 'Total Users'];
              return [value, 'New Users'];
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#0066FF"
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="Total Users"
          />
          <Area
            type="monotone"
            dataKey="new"
            stroke="#00C853"
            fillOpacity={1}
            fill="url(#colorNew)"
            name="New Users"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

