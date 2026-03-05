import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { useHarvestAnalytics, useDestinationBreakdown, useYearOverYear } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function AnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number | undefined>(undefined);

  const { data: byPlant, isLoading: loadingPlant } = useHarvestAnalytics('plant', year);
  const { data: byMonth, isLoading: loadingMonth } = useHarvestAnalytics('month', year);
  const { data: destinations, isLoading: loadingDest } = useDestinationBreakdown(year);
  const { data: yoy, isLoading: loadingYoy } = useYearOverYear();

  const plantData = byPlant?.data ?? [];
  const monthData = byMonth?.data ?? [];
  const destData = destinations?.data ?? [];
  const yoyData = yoy?.data ?? [];

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Harvest Analytics
        </h2>
        <Select value={year ? String(year) : 'all'} onValueChange={(v) => setYear(v === 'all' ? undefined : parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield by Plant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Yield by Plant</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPlant ? (
              <Skeleton className="h-64 w-full" />
            ) : plantData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No harvest data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={plantData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="plant_name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_quantity" fill="#22c55e" radius={[4, 4, 0, 0]} name="Total Yield" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Seasonal Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Seasonal Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMonth ? (
              <Skeleton className="h-64 w-full" />
            ) : monthData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No harvest data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total_quantity" stroke="#3b82f6" fill="#3b82f680" name="Yield" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Destination Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Harvest Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDest ? (
              <Skeleton className="h-64 w-full" />
            ) : destData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No harvest data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={destData} dataKey="total_quantity" nameKey="destination" cx="50%" cy="50%" outerRadius={100} label>
                    {destData.map((_: Record<string, unknown>, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Year-over-Year */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Year-over-Year Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingYoy ? (
              <Skeleton className="h-64 w-full" />
            ) : yoyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No harvest data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yoyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="harvest_count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Harvest Count" />
                  <Bar dataKey="total_quantity" fill="#22c55e" radius={[4, 4, 0, 0]} name="Total Yield" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
