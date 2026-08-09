import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useVmix } from '@/lib/vmixContext';
import {
  LayoutDashboard, Trophy, Users, User, Grid3x3, MonitorPlay, BarChart3,
  Sliders, Settings, ScrollText, Radio, Wifi, WifiOff, Search, Menu, X, Clock,
  Zap, AlignLeft, Images, ListVideo, Upload
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/matches', label: 'Matches', icon: Trophy },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/players', label: 'Players', icon: User },
  { to: '/lineups', label: 'Lineups', icon: Grid3x3 },
  { to: '/graphics', label: 'Graphics', icon: MonitorPlay },
  { to: '/events', label: 'Events', icon: Zap },
  { to: '/scoreboard', label: 'Scoreboard', icon: Radio },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/lower-thirds', label: 'Lower Thirds', icon: AlignLeft },
  { to: '/media', label: 'Media', icon: Images },
  { to: '/playlist', label: 'Playlist', icon: ListVideo },
  { to: '/import', label: 'Import Data', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Sliders },
  { to: '/logs', label: 'Logs', icon: ScrollText },
];

export default function BroadcastLayout() {
  const { connected, connecting, clock, operatorName } = useVmix();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const timeStr = clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = clock.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-slate-200 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-40 w-64 h-screen bg-[#0d0f14] border-r border-white/5 flex flex-col transition-transform duration-300`}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-sm">vP</div>
          <div className="leading-tight">
            <div className="font-semibold text-white text-sm">vMix Football</div>
            <div className="text-[10px] uppercase tracking-widest text-blue-400">Graphics Controller Pro</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{connected ? 'vMix Connected' : 'vMix Offline'}</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-[#0d0f14]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
              <Search size={14} className="text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search everywhere..." className="bg-transparent text-sm outline-none w-48 placeholder:text-slate-600" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
              <Clock size={15} />
              <span className="font-mono tabular-nums text-white">{timeStr}</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs">{dateStr}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${connected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? 'CONNECTED' : connecting ? 'CONNECTING...' : 'OFFLINE'}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {operatorName?.charAt(0)?.toUpperCase() || 'O'}
              </div>
              <span className="hidden sm:block text-sm text-slate-300">{operatorName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}