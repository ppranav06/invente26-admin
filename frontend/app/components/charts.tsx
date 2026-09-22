"use client";

function DonutChart({
 segments,
 size = 160,
 thickness = 28,
 centerLabel,
 centerValue,
}: {
 segments: Array<{ value: number; color: string; label: string }>;
 size?: number;
 thickness?: number;
 centerLabel?: string;
 centerValue?: string | number;
}) {
 const total = segments.reduce((s, seg) => s + seg.value, 0);
 const radius = (size - thickness) / 2;
 const circumference = 2 * Math.PI * radius;
 const cx = size / 2;
 const cy = size / 2;

 let accumulated = 0;

 return (
 <div className="relative inline-flex items-center justify-center">
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
  <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
  {segments.map((seg) => {
   const pct = total > 0 ? seg.value / total : 0;
   const dashLen = pct * circumference;
   const dashOffset = -accumulated * circumference;
   accumulated += pct;
   return (
   <circle
    key={seg.label}
    cx={cx}
    cy={cy}
    r={radius}
    fill="none"
    stroke={seg.color}
    strokeWidth={thickness}
    strokeDasharray={`${dashLen} ${circumference - dashLen}`}
    strokeDashoffset={dashOffset}
    strokeLinecap="butt"
    style={{ transition: "stroke-dasharray 0.6s ease" }}
   />
   );
  })}
  </svg>
  {(centerLabel || centerValue !== undefined) && (
  <div className="absolute inset-0 flex flex-col items-center justify-center">
   {centerValue !== undefined && (
   <span className="text-2xl font-black text-slate-950">{centerValue}</span>
   )}
   {centerLabel && (
   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
    {centerLabel}
   </span>
   )}
  </div>
  )}
 </div>
 );
}

function GroupedBarChart({
 data,
}: {
 data: Array<{ label: string; registered: number; attended: number }>;
}) {
 const max = Math.max(...data.map((d) => Math.max(d.registered, d.attended)), 1);

 return (
 <div className="space-y-4">
  {data.map((item) => (
  <div key={item.label}>
   <p className="mb-2 text-xs font-semibold text-slate-600">{item.label}</p>
   <div className="space-y-1.5">
   <div className="flex items-center gap-3">
    <span className="w-16 text-right text-[11px] font-medium text-slate-400">Reg</span>
    <div className="h-3 flex-1 overflow-hidden bg-slate-100">
    <div
     className="h-full bg-indigo-500 transition-all duration-500"
     style={{ width: `${max > 0 ? (item.registered / max) * 100 : 0}%` }}
    />
    </div>
    <span className="w-8 text-right text-[11px] font-bold tabular-nums text-slate-950">
    {item.registered}
    </span>
   </div>
   <div className="flex items-center gap-3">
    <span className="w-16 text-right text-[11px] font-medium text-slate-400">Attended</span>
    <div className="h-3 flex-1 overflow-hidden bg-slate-100">
    <div
     className="h-full bg-emerald-500 transition-all duration-500"
     style={{ width: `${max > 0 ? (item.attended / max) * 100 : 0}%` }}
    />
    </div>
    <span className="w-8 text-right text-[11px] font-bold tabular-nums text-slate-950">
    {item.attended}
    </span>
   </div>
   </div>
  </div>
  ))}
  <div className="flex items-center gap-5 pt-2">
  <div className="flex items-center gap-1.5">
   <span className="inline-block h-3 w-3 bg-indigo-500" />
   <span className="text-[11px] font-semibold text-slate-500">Registered</span>
  </div>
  <div className="flex items-center gap-1.5">
   <span className="inline-block h-3 w-3 bg-emerald-500" />
   <span className="text-[11px] font-semibold text-slate-500">Attended</span>
  </div>
  </div>
 </div>
 );
}

function HorizontalBarChart({
 data,
 barColor = "bg-indigo-500",
}: {
 data: Array<{ label: string; value: number }>;
 barColor?: string;
}) {
 const max = Math.max(...data.map((d) => d.value), 1);
 return (
 <div className="space-y-3">
  {data.map((item) => (
  <div key={item.label}>
   <div className="mb-1 flex items-center justify-between">
   <span className="text-xs font-semibold text-slate-600">{item.label}</span>
   <span className="text-xs font-bold tabular-nums text-slate-950">{item.value}</span>
   </div>
   <div className="h-2 overflow-hidden bg-slate-100">
   <div
    className={`h-full ${barColor} transition-all duration-500`}
    style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }}
   />
   </div>
  </div>
  ))}
 </div>
 );
}

export { DonutChart, GroupedBarChart, HorizontalBarChart };
