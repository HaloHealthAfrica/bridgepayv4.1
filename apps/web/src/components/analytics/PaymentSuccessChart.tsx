import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface PaymentSuccessChartProps {
  totalPayments: number;
  successfulPayments: number;
}

export const PaymentSuccessChart: React.FC<PaymentSuccessChartProps> = ({
  totalPayments,
  successfulPayments,
}) => {
  const failedPayments = totalPayments - successfulPayments;
  
  const data = [
    { name: 'Successful', value: successfulPayments, color: '#00C853' },
    { name: 'Failed', value: failedPayments, color: '#F44336' },
  ];

  const COLORS = ['#00C853', '#F44336'];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
            }}
            formatter={(value: any) => [value.toLocaleString(), 'Payments']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

