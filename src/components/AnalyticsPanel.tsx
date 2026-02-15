import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyticsData {
    globalStats: {
        totalIncidents: number;
        totalFatalities: number;
        mostDangerousZone: string;
        yearTrend: Record<string, number>;
    };
    zones: Array<{
        name: string;
        severityScore: number;
        trend: string;
        primaryRisk: string;
        driftVector: { u: number, v: number };
    }>;
}

export function AnalyticsPanel() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        fetch('/data/advanced_analytics.json')
            .then(res => res.json())
            .then(setData)
            .catch(err => console.error("Failed to load analytics", err));
    }, []);

    if (!data) return <div className="p-4 text-white/50">Loading analytics...</div>;

    // Prepare chart data
    const trendData = Object.entries(data.globalStats.yearTrend)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year))
        .filter(d => parseInt(d.year) > 1920); // Filter very old/sparse data for better chart

    return (
        <div className="space-y-4 p-2 text-white">
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-black/40 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Total Fatalities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{data.globalStats.totalFatalities}</div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-white/70">Highest Risk Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-amber-500 truncate" title={data.globalStats.mostDangerousZone}>
                            {data.globalStats.mostDangerousZone}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-black/40 border-white/10">
                <CardHeader>
                    <CardTitle className="text-sm font-bold text-blue-400">Global Accident Trend (1920+)</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                            <XAxis dataKey="year" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={10} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                                {trendData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index > trendData.length - 5 ? '#ef4444' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="space-y-2">
                <h3 className="text-sm font-bold text-white/70">AI Predicted Hotspots (Slope &gt; 0)</h3>
                <div className="space-y-1">
                    {data.zones
                        .filter(z => z.trend === "Increasing")
                        .slice(0, 5)
                        .map(z => (
                            <div key={z.name} className="flex justify-between text-xs p-2 bg-red-900/20 rounded border border-red-500/20">
                                <span>{z.name}</span>
                                <span className="text-red-400 font-bold">Increasing Risk</span>
                            </div>
                        ))}
                    {data.zones.filter(z => z.trend === "Increasing").length === 0 && (
                        <div className="text-xs text-green-500/70">No increasing risk zones detected.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
