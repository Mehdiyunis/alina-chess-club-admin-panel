'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface VisitStats {
  today: number;
  total: number;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function VisitStatsCard() {
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchVisitStats = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_visit_stats');

      if (error) {
        console.error('[Supabase get_visit_stats Error]:', error);
        setHasError(true);
        return;
      }

      // Handle row when returned as array or single object
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        setHasError(true);
        return;
      }

      const todayVal = Number(row.today ?? 0);
      const totalVal = Number(row.total ?? 0);

      setStats({
        today: isNaN(todayVal) ? 0 : todayVal,
        total: isNaN(totalVal) ? 0 : totalVal,
      });
      setHasError(false);
    } catch (err) {
      console.error('[Supabase get_visit_stats Exception]:', err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitStats();
    // Auto-refresh every 60 seconds while page is open
    const interval = setInterval(fetchVisitStats, 60000);
    return () => clearInterval(interval);
  }, [fetchVisitStats]);

  return (
    <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5E6B62]">
          Səhifəyə giriş sayı
        </span>
        <div className="w-9 h-9 rounded-full bg-[#2F5D46]/40 text-[#1E2A22] border border-[#2F5D46] flex items-center justify-center shadow-2xs">
          <Globe className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-9 bg-[rgba(26,19,12,0.08)] rounded-lg w-28" />
            <div className="h-4 bg-[rgba(26,19,12,0.05)] rounded-md w-36" />
          </div>
        ) : hasError || !stats ? (
          <div>
            <div className="text-3xl sm:text-4xl font-serif-heading font-medium text-[#5E6B62] tracking-tight">
              —
            </div>
            <div className="text-xs text-[#5E6B62] mt-1 font-medium">
              Statistika əlçatan deyil
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-serif-heading font-medium text-[#1E2A22] tracking-tight">
                {formatNumber(stats.today)}
              </span>
              <span className="text-xs font-semibold text-[#5E6B62] lowercase">
                bu gün
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1.5 text-xs text-[#5E6B62]">
              <span className="text-[#5E6B62]/80">cəmi:</span>
              <span className="font-semibold text-[#1E2A22]/70 font-mono text-xs">
                {formatNumber(stats.total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
