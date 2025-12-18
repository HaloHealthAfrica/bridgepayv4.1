import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface TransactionVolumeChartProps {
  data: Array<{
    date: string;
    count: number;
    volume: number;
  }>;
  currency?: string;
}

export const TransactionVolumeChart: React.FC<TransactionVolumeChartProps> = ({
  data,
  currency = 'KES',
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return `${currency} ${value.toLocaleString()}`;
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
            }}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
            formatter={(value: any, name: string) => {
              if (name === 'volume') {
                return [formatCurrency(value), 'Volume'];
              }
              return [value, 'Count'];
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="volume"
            stroke="#0066FF"
            strokeWidth={2}
            name="Transaction Volume"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="count"
            stroke="#00C853"
            strokeWidth={2}
            name="Transaction Count"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

