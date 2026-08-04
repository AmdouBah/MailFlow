'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DailyOpenData } from '@/types';

interface OpeningsChartProps {
  data: DailyOpenData[];
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const date = parseISO(label);
  return (
    <div className="card p-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-medium text-foreground mb-2">
        {format(date, 'dd MMM yyyy', { locale: fr })}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function OpeningsChart({ data, loading }: OpeningsChartProps) {
  if (loading) {
    return (
      <div className="h-56 skeleton rounded-lg" />
    );
  }

  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'dd/MM'),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formattedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          type="monotone"
          dataKey="sent"
          name="Envoyés"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorSent)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="opens"
          name="Ouvertures"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#colorOpens)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          name="Clics"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#colorClicks)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
