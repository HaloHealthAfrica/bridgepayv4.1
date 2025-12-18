import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
  }>;
  currency?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
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
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#666"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value.toString();
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
            }}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
            formatter={(value: any) => [formatCurrency(value), 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#0066FF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

