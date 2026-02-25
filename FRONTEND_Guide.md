import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Map as MapIcon, 
  Users, 
  Navigation, 
  AlertTriangle, 
  Clock, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Search,
  Plus,
  ChevronRight,
  Phone,
  Radio,
  CheckCircle2,
  Scan,
  MapPin,
  Activity,
  ChevronLeft
} from 'lucide-react';

// --- Mock Data ---
const MOCK_SITES = [
  { id: 's1', name: 'Elite Corporate Plaza', status: 'active', activeGuards: 3, lastPatrol: '10m ago', geo: '40.7128, -74.0060' },
  { id: 's2', name: 'Westside Logistics Hub', status: 'warning', activeGuards: 2, lastPatrol: '1h ago', geo: '40.7580, -73.9855' },
  { id: 's3', name: 'North Shore Residential', status: 'active', activeGuards: 5, lastPatrol: '2m ago', geo: '40.7829, -73.9654' },
];

const MOCK_INCIDENTS = [
  { id: 'i1', site: 'Westside Logistics', type: 'Broken Fence', severity: 'medium', guard: 'John Doe', time: '14:20', status: 'Investigating' },
  { id: 'i2', site: 'Elite Corporate', type: 'Unauth. Access', severity: 'high', guard: 'Sarah Smith', time: '15:10', status: 'New' },
];

const MOCK_ACTIVE_PATROL = {
  id: 'p123',
  site: 'Elite Corporate Plaza',
  guard: 'Alex Rivera',
  startTime: '15:30',
  checkpoints: [
    { id: 1, name: 'Main Lobby', status: 'completed', time: '15:35' },
    { id: 2, name: 'North Gate', status: 'completed', time: '15:45' },
    { id: 3, name: 'Server Room', status: 'pending', time: null },
    { id: 4, name: 'Roof Deck', status: 'pending', time: null },
  ]
};

// --- Components ---

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-rose-100 text-rose-700 border-rose-200',
    medium: 'bg-orange-100 text-orange-700 border-orange-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-emerald-500 text-white',
    pending: 'bg-slate-100 text-slate-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status.toLowerCase()] || styles.low}`}>
      {status.toUpperCase()}
    </span>
  );
};

const Card = ({ title, children, action }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
      <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// --- Modules/Views ---

const CommandCenter = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="lg:col-span-2 space-y-6">
      <Card title="Live Map & Guard Tracking" action={<div className="flex gap-2"><div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" /> <span className="text-xs text-slate-500">Live</span></div>}>
        <div className="aspect-video bg-slate-100 rounded-lg relative overflow-hidden flex items-center justify-center border border-slate-200">
           <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
           <div className="text-center space-y-2">
              <MapIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-500 text-sm">Interactive Map Integration Ready</p>
           </div>
           {/* Mock Guard Pins */}
           <div className="absolute top-1/4 left-1/3 group cursor-pointer">
              <div className="p-1 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                <Shield size={16} />
              </div>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-1 rounded hidden group-hover:block">Guard: Alex R.</div>
           </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Active Incidents">
          <div className="space-y-4">
            {MOCK_INCIDENTS.map(inc => (
              <div key={inc.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className={`p-2 rounded-lg ${inc.severity === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <p className="font-semibold text-slate-900 truncate">{inc.type}</p>
                    <span className="text-xs text-slate-400">{inc.time}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{inc.site} • {inc.guard}</p>
                </div>
                <StatusBadge status={inc.severity} />
              </div>
            ))}
          </div>
        </Card>
        
        <Card title="Quick Stats">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Active Patrols</p>
              <p className="text-2xl font-bold text-slate-900">12</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-600 mb-1">Sites Secure</p>
              <p className="text-2xl font-bold text-emerald-700">98%</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 col-span-2 flex justify-between items-center">
              <div>
                <p className="text-xs text-rose-600 mb-1">SOS Events (24h)</p>
                <p className="text-2xl font-bold text-rose-700">0</p>
              </div>
              <Activity className="text-rose-300" size={32} />
            </div>
          </div>
        </Card>
      </div>
    </div>

    <div className="space-y-6">
      <Card title="Guard Feed">
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-100 before:z-0">
          {[1,2,3,4].map(i => (
            <div key={i} className="relative z-10 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-blue-600 ring-2 ring-slate-100">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Checkpoint Scanned</p>
                <p className="text-xs text-slate-500">Alex R. scanned "North Perimeter" at Site A</p>
                <p className="text-[10px] text-slate-400 mt-1">2 mins ago</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

const GuardMobileView = () => {
  const [activeTab, setActiveTab] = useState('patrol');

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-900 relative">
      {/* Top Bar */}
      <div className="bg-slate-900 p-6 text-white pt-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Hello, Alex</h2>
            <p className="text-slate-400 text-xs">On Shift: Elite Corp Plaza</p>
          </div>
          <button className="p-3 bg-rose-600 rounded-2xl animate-pulse shadow-lg shadow-rose-900/40">
            <Radio size={24} />
          </button>
        </div>
        
        <div className="bg-slate-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
             <Clock className="text-white" size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Shift Time</p>
            <p className="text-lg font-mono font-bold">04:22:15</p>
          </div>
          <button className="ml-auto text-xs bg-slate-700 px-3 py-1 rounded-full text-slate-300">End Shift</button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 -mt-4 bg-slate-50 rounded-t-[2rem] min-h-[400px]">
        {activeTab === 'patrol' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Current Patrol</h3>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold">2 / 4 COMPLETE</span>
                </div>
                
                <div className="space-y-3">
                  {MOCK_ACTIVE_PATROL.checkpoints.map(cp => (
                    <div key={cp.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cp.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {cp.status === 'completed' ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                      </div>
                      <span className={`text-sm ${cp.status === 'completed' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{cp.name}</span>
                      {cp.time && <span className="ml-auto text-[10px] text-slate-400">{cp.time}</span>}
                    </div>
                  ))}
                </div>
             </div>

             <button className="w-full bg-blue-600 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
               <Scan size={24} />
               SCAN NEXT CHECKPOINT
             </button>

             <button className="w-full bg-white text-slate-700 py-4 rounded-3xl font-bold flex items-center justify-center gap-3 border border-slate-200 shadow-sm active:scale-95 transition-transform">
               <AlertTriangle className="text-amber-500" size={20} />
               REPORT INCIDENT
             </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 pb-8 flex justify-around">
        <button onClick={() => setActiveTab('patrol')} className={`p-2 rounded-xl ${activeTab === 'patrol' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><LayoutDashboard /></button>
        <button onClick={() => setActiveTab('map')} className={`p-2 rounded-xl ${activeTab === 'map' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><MapIcon /></button>
        <button onClick={() => setActiveTab('history')} className={`p-2 rounded-xl ${activeTab === 'history' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><Clock /></button>
      </div>
    </div>
  );
};

// --- Main App Controller ---

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMode, setIsMobileMode] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: MapIcon },
    { id: 'sites', label: 'Site Management', icon: Shield },
    { id: 'patrols', label: 'Patrol Records', icon: Navigation },
    { id: 'incidents', label: 'Incident Desk', icon: AlertTriangle },
    { id: 'hr', label: 'Guard Personnel', icon: Users },
    { id: 'settings', label: 'System Config', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 text-slate-400 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className={`p-6 flex items-center gap-3 text-white overflow-hidden transition-all ${sidebarOpen ? 'justify-start' : 'justify-center'}`}>
          <div className="p-2 bg-blue-600 rounded-lg shrink-0">
            <Shield size={24} />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-xl tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
              Patrol<span className="text-blue-500">Mgr</span>
            </span>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-x-hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center rounded-xl transition-all duration-200 group ${
                sidebarOpen ? 'px-3 py-3 gap-3' : 'p-3 justify-center'
              } ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
              {!sidebarOpen && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-slate-700">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`w-full flex items-center text-slate-500 hover:text-white transition-all rounded-xl hover:bg-slate-800 ${
              sidebarOpen ? 'px-3 py-3 gap-3' : 'p-3 justify-center'
            }`}
          >
            <ChevronLeft size={20} className={`transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
            {sidebarOpen && <span className="text-sm font-medium">Collapse Sidebar</span>}
          </button>
          
          <button className={`w-full flex items-center text-rose-400 hover:bg-rose-900/20 transition-all rounded-xl ${
            sidebarOpen ? 'px-3 py-3 gap-3' : 'p-3 justify-center'
          }`}>
            <LogOut size={20} className="shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg lg:block hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-800 transition-all duration-300">
              {navItems.find(n => n.id === currentView)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search guards, sites..." 
                className="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
               <button 
                  onClick={() => setIsMobileMode(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isMobileMode ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
               >
                 Desktop Admin
               </button>
               <button 
                  onClick={() => setIsMobileMode(true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isMobileMode ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
               >
                 Guard View
               </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="User" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {!isMobileMode ? (
            <>
              {currentView === 'dashboard' && <CommandCenter />}
              
              {currentView === 'sites' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Manage Sites</h2>
                      <p className="text-slate-500">Overview of all physical security locations</p>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                      <Plus size={20} />
                      Add New Site
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_SITES.map(site => (
                      <Card key={site.id} title={site.name} action={<StatusBadge status={site.status} />}>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 flex items-center gap-2"><Users size={16} /> Guards On Duty</span>
                              <span className="font-bold">{site.activeGuards}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 flex items-center gap-2"><Clock size={16} /> Last Patrol</span>
                              <span className="text-slate-700">{site.lastPatrol}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 flex items-center gap-2"><MapPin size={16} /> Coordinates</span>
                              <span className="text-slate-700">{site.geo}</span>
                           </div>
                           <button className="w-full mt-2 py-2 text-sm text-blue-600 font-semibold border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">
                             View Detailed Report
                           </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {['patrols', 'incidents', 'hr', 'settings'].includes(currentView) && (
                 <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                       <Navigation size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Module Details Coming Soon</h2>
                    <p className="text-slate-500 max-w-sm">This module is currently being optimized for business use. Please check the Dashboard or Sites for the live demo.</p>
                 </div>
              )}
            </>
          ) : (
            <div className="py-4 animate-in zoom-in duration-300">
              <GuardMobileView />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}