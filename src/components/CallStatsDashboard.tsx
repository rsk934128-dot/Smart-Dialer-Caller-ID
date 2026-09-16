import React, { useState, useMemo } from 'react';
import {
  Clock,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Calendar,
  Activity,
  Flame,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { CallLog } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface CallStatsDashboardProps {
  logs: CallLog[];
  lang: Language;
}

export const CallStatsDashboard: React.FC<CallStatsDashboardProps> = ({ logs, lang }) => {
  const t = TRANSLATIONS[lang];
  const [selectedWeek, setSelectedWeek] = useState<'thisWeek' | 'lastWeek'>('thisWeek');
  const [chartMetric, setChartMetric] = useState<'duration' | 'volume'>('duration');

  const DAYS_BN = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];
  const DAYS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayNames = lang === 'bn' ? DAYS_BN : DAYS_EN;

  // Compute or augment stats based on real call logs + representative weekly trend data
  const weeklyData = useMemo(() => {
    // Baseline weekly templates
    const thisWeekBase = [
      { day: dayNames[0], duration: 16.5, incoming: 4, outgoing: 3, missed: 1, spam: 1 },
      { day: dayNames[1], duration: 24.2, incoming: 7, outgoing: 5, missed: 2, spam: 0 },
      { day: dayNames[2], duration: 32.0, incoming: 8, outgoing: 7, missed: 1, spam: 2 },
      { day: dayNames[3], duration: 28.4, incoming: 6, outgoing: 6, missed: 3, spam: 1 },
      { day: dayNames[4], duration: 39.8, incoming: 10, outgoing: 8, missed: 2, spam: 1 },
      { day: dayNames[5], duration: 45.2, incoming: 12, outgoing: 9, missed: 1, spam: 2 },
      { day: dayNames[6], duration: 19.6, incoming: 5, outgoing: 4, missed: 1, spam: 0 },
    ];

    const lastWeekBase = [
      { day: dayNames[0], duration: 14.0, incoming: 3, outgoing: 3, missed: 2, spam: 1 },
      { day: dayNames[1], duration: 18.5, incoming: 5, outgoing: 4, missed: 1, spam: 1 },
      { day: dayNames[2], duration: 27.2, incoming: 7, outgoing: 5, missed: 2, spam: 0 },
      { day: dayNames[3], duration: 31.0, incoming: 8, outgoing: 6, missed: 2, spam: 2 },
      { day: dayNames[4], duration: 33.5, incoming: 9, outgoing: 7, missed: 1, spam: 1 },
      { day: dayNames[5], duration: 38.0, incoming: 10, outgoing: 8, missed: 3, spam: 1 },
      { day: dayNames[6], duration: 15.2, incoming: 4, outgoing: 3, missed: 0, spam: 1 },
    ];

    // Merge recent dynamic call logs into current day (day index 5 / Thursday)
    const base = selectedWeek === 'thisWeek' ? thisWeekBase : lastWeekBase;
    
    // Add real logs durations
    let addedDurationMinutes = 0;
    let addedIncoming = 0;
    let addedOutgoing = 0;
    let addedMissed = 0;
    let addedSpam = 0;

    logs.forEach((l) => {
      if (l.duration) {
        addedDurationMinutes += l.duration / 60;
      }
      if (l.isSpam) addedSpam++;
      else if (l.type === 'incoming') addedIncoming++;
      else if (l.type === 'outgoing') addedOutgoing++;
      else if (l.type === 'missed' || l.type === 'rejected') addedMissed++;
    });

    const adjusted = base.map((item, idx) => {
      if (idx === 5) {
        return {
          ...item,
          duration: Number((item.duration + (addedDurationMinutes > 0 ? addedDurationMinutes : 0)).toFixed(1)),
          incoming: item.incoming + Math.min(addedIncoming, 4),
          outgoing: item.outgoing + Math.min(addedOutgoing, 4),
          missed: item.missed + Math.min(addedMissed, 2),
          spam: item.spam + Math.min(addedSpam, 2),
          totalCalls: item.incoming + item.outgoing + item.missed + item.spam,
        };
      }
      return {
        ...item,
        totalCalls: item.incoming + item.outgoing + item.missed + item.spam,
      };
    });

    return adjusted;
  }, [selectedWeek, logs, dayNames]);

  // Aggregate high-level totals
  const totalDurationMinutes = useMemo(() => {
    return weeklyData.reduce((acc, d) => acc + d.duration, 0).toFixed(1);
  }, [weeklyData]);

  const totalCalls = useMemo(() => {
    return weeklyData.reduce((acc, d) => acc + d.incoming + d.outgoing + d.missed + d.spam, 0);
  }, [weeklyData]);

  const totalIncoming = useMemo(() => weeklyData.reduce((acc, d) => acc + d.incoming, 0), [weeklyData]);
  const totalOutgoing = useMemo(() => weeklyData.reduce((acc, d) => acc + d.outgoing, 0), [weeklyData]);
  const totalMissed = useMemo(() => weeklyData.reduce((acc, d) => acc + d.missed, 0), [weeklyData]);
  const totalSpam = useMemo(() => weeklyData.reduce((acc, d) => acc + d.spam, 0), [weeklyData]);

  const avgCallDuration = useMemo(() => {
    const connectedCalls = totalIncoming + totalOutgoing;
    if (connectedCalls === 0) return '0:00';
    const totalSecs = (Number(totalDurationMinutes) * 60) / connectedCalls;
    const m = Math.floor(totalSecs / 60);
    const s = Math.floor(totalSecs % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }, [totalDurationMinutes, totalIncoming, totalOutgoing]);

  // Donut chart data
  const pieData = [
    { name: lang === 'bn' ? 'ইনকামিং' : 'Incoming', value: totalIncoming, color: '#0ea5e9' },
    { name: lang === 'bn' ? 'আউটগোয়িং' : 'Outgoing', value: totalOutgoing, color: '#10b981' },
    { name: lang === 'bn' ? 'মিসড কল' : 'Missed', value: totalMissed, color: '#f43f5e' },
    { name: lang === 'bn' ? 'স্প্যাম' : 'Spam Blocked', value: totalSpam, color: '#ef4444' },
  ];

  // Peak Hours data
  const peakTimeData = [
    { label: lang === 'bn' ? 'সকাল (৮-১২টা)' : 'Morning (8-12)', percent: 28, count: 18 },
    { label: lang === 'bn' ? 'দুপুর (১২-৫টা)' : 'Afternoon (12-17)', percent: 34, count: 24 },
    { label: lang === 'bn' ? 'সন্ধ্যা (৫-৯টা)' : 'Evening (17-21)', percent: 30, count: 21 },
    { label: lang === 'bn' ? 'রাত (৯-১২টা)' : 'Night (21-24)', percent: 8, count: 6 },
  ];

  return (
    <div id="call-stats-dashboard" className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Header with Title and Week Selector */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Recharts Analytics</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {t.statsTitle}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t.statsSubtitle}
          </p>
        </div>

        {/* Week Switcher */}
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl text-xs font-semibold">
          <button
            id="stats-this-week-btn"
            onClick={() => setSelectedWeek('thisWeek')}
            className={`px-2.5 py-1.5 rounded-lg transition ${
              selectedWeek === 'thisWeek'
                ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t.thisWeek}
          </button>
          <button
            id="stats-last-week-btn"
            onClick={() => setSelectedWeek('lastWeek')}
            className={`px-2.5 py-1.5 rounded-lg transition ${
              selectedWeek === 'lastWeek'
                ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t.lastWeek}
          </button>
        </div>
      </div>

      {/* 4 Key Performance Metrics Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Talk Time */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {t.totalTalkTime}
            </p>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              {totalDurationMinutes}{' '}
              <span className="text-xs font-normal text-neutral-500">{t.minutesUnit}</span>
            </p>
          </div>
        </div>

        {/* Total Calls */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {t.totalCallsCount}
            </p>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              {totalCalls}{' '}
              <span className="text-xs font-normal text-neutral-500">{t.callsUnit}</span>
            </p>
          </div>
        </div>

        {/* Avg Call Duration */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {t.avgCallDuration}
            </p>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              {avgCallDuration}
            </p>
          </div>
        </div>

        {/* Spam Blocked */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {t.spamCallsBlocked}
            </p>
            <p className="text-base font-bold text-red-600 dark:text-red-400 leading-tight">
              {totalSpam}{' '}
              <span className="text-xs font-normal text-neutral-500">{t.callsUnit}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Chart View Mode Toggle */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {chartMetric === 'duration' ? t.weeklyDurationTrends : t.weeklyVolumeTrends}
        </h3>
        <div className="flex gap-1 text-xs">
          <button
            id="toggle-chart-duration-btn"
            onClick={() => setChartMetric('duration')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              chartMetric === 'duration'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            {t.weeklyDurationTrends.split(' ')[1] || 'ডুরেশন'}
          </button>
          <button
            id="toggle-chart-volume-btn"
            onClick={() => setChartMetric('volume')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              chartMetric === 'volume'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
            }`}
          >
            {t.weeklyVolumeTrends.split(' ')[1] || 'ভলিউম'}
          </button>
        </div>
      </div>

      {/* Primary Recharts Chart: Duration AreaChart or Volume BarChart */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {chartMetric === 'duration' ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#888888' }}
                  axisLine={{ stroke: '#88888830' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888888' }}
                  axisLine={false}
                  tickLine={false}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-neutral-900 text-white p-2.5 shadow-lg text-xs space-y-1 border border-neutral-700">
                          <p className="font-bold text-emerald-400">{data.day}</p>
                          <p className="text-neutral-200">
                            কথা বলার সময়: <span className="font-bold">{data.duration}</span> {t.minutesUnit}
                          </p>
                          <p className="text-neutral-400 text-[10px]">
                            মোট কল: {data.totalCalls} {t.callsUnit}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="duration"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#durationGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#888888' }}
                  axisLine={{ stroke: '#88888830' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#888888' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-neutral-900 text-white p-2.5 shadow-lg text-xs space-y-1 border border-neutral-700">
                          <p className="font-bold text-neutral-200">{data.day}</p>
                          <p className="text-sky-400">ইনকামিং: {data.incoming}</p>
                          <p className="text-emerald-400">আউটগোয়িং: {data.outgoing}</p>
                          <p className="text-rose-400">মিসড: {data.missed}</p>
                          <p className="text-red-400">স্প্যাম: {data.spam}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="incoming" stackId="calls" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="outgoing" stackId="calls" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="missed" stackId="calls" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="spam" stackId="calls" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend pills */}
        <div className="flex items-center justify-center gap-3 pt-2 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>ইনকামিং</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>আউটগোয়িং</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>মিসড</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>স্প্যাম</span>
          </span>
        </div>
      </div>

      {/* Distribution Donut & Hourly Peaks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Donut Chart: Call Type Distribution */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>{t.callTypeDistribution}</span>
          </h4>

          <div className="h-40 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0];
                      return (
                        <div className="rounded-lg bg-neutral-900 text-white px-2 py-1 text-xs border border-neutral-700">
                          <span style={{ color: d.payload.color }}>{d.name}: </span>
                          <span className="font-bold">{d.value}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {totalCalls}
              </span>
              <span className="text-[10px] text-neutral-400 leading-none">কল</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between px-2 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-800/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-neutral-600 dark:text-neutral-400">{item.name}</span>
                </span>
                <span className="font-bold font-mono text-neutral-800 dark:text-neutral-200">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Peak Activity Progress Bars */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>{t.peakCallingTime}</span>
          </h4>

          <div className="space-y-2.5 pt-1">
            {peakTimeData.map((slot) => (
              <div key={slot.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">{slot.label}</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {slot.percent}% ({slot.count} কল)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${slot.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mt-2">
            <TrendingUp className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              <strong>সর্বোচ্চ ব্যস্ত দিন:</strong> বৃহস্পতিবার (১২টি কল, ৪৫.২ মিনিট টক-টাইম)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
