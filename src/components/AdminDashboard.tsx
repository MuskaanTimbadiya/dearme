import React, { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { Feather, Shield, Users, Activity, ArrowLeft } from 'lucide-react';
import type { UserProfile } from '../types';

export const AdminDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [stats, setStats] = useState<{ totalUsers?: number; status?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch admin stats (${res.status})`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col text-[#2D2926]">
      <div className="px-6 py-4 border-b border-[#F0EDE8] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = '/'} className="p-2 hover:bg-[#F5F2ED] rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-[#5A5A40]" />
          </button>
          <Shield className="w-5 h-5 text-[#5A5A40]" />
          <h1 className="text-xl font-serif text-[#5A5A40]">Admin Dashboard</h1>
        </div>
        <div className="text-xs font-sans text-[#A8A294] uppercase tracking-widest">
          Logged in as {user.email}
        </div>
      </div>

      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-serif mb-6 text-[#2D2926]">System Overview</h2>
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Activity className="w-6 h-6 text-[#5A5A40] animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F5C6C6] text-[#9B2C2C] text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchStats}
              className="px-3 py-1 rounded-md bg-[#9B2C2C] text-white text-xs font-sans uppercase font-bold hover:bg-[#7B2323] cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EDE8] flex flex-col items-center justify-center text-center">
              <Users className="w-8 h-8 text-[#5A5A40] mb-3" />
              <div className="text-4xl font-serif text-[#2D2926] mb-1">{stats?.totalUsers || 0}</div>
              <div className="text-xs uppercase tracking-widest font-sans text-[#A8A294]">Total Users</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EDE8] flex flex-col items-center justify-center text-center">
              <Activity className="w-8 h-8 text-[#5A5A40] mb-3" />
              <div className="text-4xl font-serif text-[#2D2926] mb-1">{stats?.status || 'Unknown'}</div>
              <div className="text-xs uppercase tracking-widest font-sans text-[#A8A294]">System Status</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
