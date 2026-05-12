import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { eventsAPI } from '../../api/client';
import { Spinner } from '../shared/Spinner';

export function AlertsTimeline() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await eventsAPI.getTimeline('hour');
        setData(response.data.buckets);
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-80 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Alert Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="critical"
            stackId="1"
            stroke="#EF4444"
            fill="#DC2626"
            name="Critical"
          />
          <Area
            type="monotone"
            dataKey="high"
            stackId="1"
            stroke="#F97316"
            fill="#EA580C"
            name="High"
          />
          <Area
            type="monotone"
            dataKey="medium"
            stackId="1"
            stroke="#EAB308"
            fill="#CA8A04"
            name="Medium"
          />
          <Area
            type="monotone"
            dataKey="low"
            stackId="1"
            stroke="#3B82F6"
            fill="#1D4ED8"
            name="Low"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
