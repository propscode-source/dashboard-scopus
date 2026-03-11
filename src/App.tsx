import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, TrendingUp, BookOpen, Clock, ChevronRight, X, Search, FileText, Star, Upload, PieChart as PieChartIcon, BarChart3, Users, LayoutDashboard, Map, Settings, Filter, Quote, Menu } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Paper {
  title: string;
  year: number;
  quartile: string;
  citedBy: number;
  sourceTitle: string;
  documentType: string;
  doi: string;
  issn: string;
}

interface AuthorStats {
  name: string;
  totalPublications: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  score: number;
  totalCitations: number;
  papers: Paper[];
}

interface DashboardData {
  success: boolean;
  lastSynced: string;
  summary: {
    totalPublications: number;
    q1Count: number;
    q2Count: number;
    q3Count: number;
    q4Count: number;
    q1q2Ratio: string;
    totalCitations: number;
  };
  leaderboard: AuthorStats[];
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorStats | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchData = async (year: string = 'All') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/scopus?year=${year}`);
      const result = await response.json();
      if (result.success) {
        setData(result);
        if (result.leaderboard.length > 0) {
          setSelectedAuthor(result.leaderboard[0]);
        } else {
          setSelectedAuthor(null);
        }
        
        // Extract available years if it's the initial load or 'All' is selected
        if (year === 'All' && result.leaderboard) {
            const years = new Set<number>();
            result.leaderboard.forEach((author: AuthorStats) => {
                author.papers.forEach(paper => {
                    if (paper.year) years.add(paper.year);
                });
            });
            const sortedYears = Array.from(years).sort((a, b) => b - a);
            
            const currentYear = new Date().getFullYear();
            const thresholdYear = currentYear - 4; // Show last 5 years individually
            
            const recentYears = sortedYears.filter(y => y >= thresholdYear).map(String);
            const hasOlderYears = sortedYears.some(y => y < thresholdYear);
            
            const newAvailableYears = ['All', ...recentYears];
            if (hasOlderYears) {
                newAvailableYears.push(`<=${thresholdYear - 1}`);
            }
            
            setAvailableYears(newAvailableYears);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedYear);
  }, [selectedYear]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/scopus/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      
      if (result.success) {
        // Reset year filter to All after new upload
        setSelectedYear('All');
        fetchData('All');
        alert('Data successfully uploaded and analyzed!');
      } else {
        alert(result.error || 'Failed to process file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred while uploading the file.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] flex items-center justify-center text-slate-300">
        Failed to load dashboard data.
      </div>
    );
  }

  const top10 = data.leaderboard.slice(0, 10);
  const filteredLeaderboard = data.leaderboard.filter(author => 
    author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-slate-400 w-5 text-center">{index + 1}</span>;
    }
  };

  const pieData = [
    { name: 'Q1', value: data.summary.q1Count, color: '#0ea5e9' }, // sky-500
    { name: 'Q2', value: data.summary.q2Count, color: '#10b981' }, // emerald-500
    { name: 'Q3', value: data.summary.q3Count, color: '#f59e0b' }, // amber-500
    { name: 'Q4', value: data.summary.q4Count, color: '#f43f5e' }, // rose-500
  ].filter(d => d.value > 0);

  // Generate mock area chart data based on years from papers
  const yearCounts: Record<number, number> = {};
  data.leaderboard.forEach(author => {
    author.papers.forEach(paper => {
      yearCounts[paper.year] = (yearCounts[paper.year] || 0) + 1;
    });
  });
  const areaData = Object.keys(yearCounts).sort().map(year => ({
    name: year,
    pubs: yearCounts[parseInt(year)]
  }));

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] overflow-hidden font-sans text-slate-800">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#1a2235] text-white flex-col shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex`}>
        <div className="p-6 flex items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              S
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider uppercase text-cyan-400">Scopus</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Analytics</p>
            </div>
          </div>
          <button 
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Researchers</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">Publications</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <Map className="w-5 h-5" />
            <span className="text-sm font-medium">Roadmap</span>
          </a>
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="bg-[#121826] rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Filter Year</p>
              <Filter className="w-3 h-3 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto hide-scrollbar pr-1">
              {availableYears.map(year => (
                <button 
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`py-1.5 px-2 rounded text-xs transition-colors ${
                    selectedYear === year 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold' 
                      : 'bg-white/5 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300'
                  }`}
                >
                  {year.startsWith('<=') ? `≤ ${year.substring(2)}` : year}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <header className="min-h-[5rem] py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 text-white z-10 gap-4 sm:gap-0">
          <div className="w-full sm:w-auto flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors shadow-lg flex-shrink-0"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">Fasilkom Universitas Sriwijaya</h2>
              <p className="text-[10px] sm:text-xs text-cyan-200/70 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" /> Last Synced: {new Date(data.lastSynced).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                id="file-upload" 
                onChange={handleFileUpload} 
                disabled={isUploading}
              />
              <label 
                htmlFor="file-upload" 
                className={`cursor-pointer bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-white/20 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg whitespace-nowrap ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                {isUploading ? 'Analyzing...' : 'Upload Data'}
              </label>
            </div>
            <button className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 flex flex-col lg:flex-row gap-6 z-10 hide-scrollbar">
          
          {/* MIDDLE COLUMN (Summary & Details) */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
                       {/* Top Summary Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-blue-900/20 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <p className="text-[10px] sm:text-xs font-medium text-cyan-100 uppercase tracking-wider mb-1 line-clamp-1">Total Publications</p>
                <p className="text-2xl sm:text-3xl font-bold">{data.summary.totalPublications}</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-teal-900/20 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <p className="text-[10px] sm:text-xs font-medium text-emerald-100 uppercase tracking-wider mb-1 line-clamp-1">Q1/Q2 Ratio</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl sm:text-3xl font-bold">{data.summary.q1q2Ratio}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-purple-900/20 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <p className="text-[10px] sm:text-xs font-medium text-indigo-100 uppercase tracking-wider mb-1 line-clamp-1">Q1 Publications</p>
                <p className="text-2xl sm:text-3xl font-bold">{data.summary.q1Count}</p>
              </div>

              <div className="bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-cyan-900/20 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <p className="text-[10px] sm:text-xs font-medium text-teal-100 uppercase tracking-wider mb-1 line-clamp-1">Total Citations</p>
                <p className="text-2xl sm:text-3xl font-bold">{data.summary.totalCitations}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Area Chart */}
              <div className="xl:col-span-2 bg-[#f8f9fa] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Publication Trend</h3>
                  <div className="flex gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1 text-cyan-600"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Publications</span>
                  </div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPubs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}
                        labelStyle={{ fontSize: '12px', color: '#64748b' }}
                      />
                      <Area type="monotone" dataKey="pubs" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorPubs)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-[#f8f9fa] rounded-2xl p-5 shadow-xl flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Quartile Distribution</h3>
                <div className="flex-1 min-h-[160px] relative">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No data</div>
                  )}
                  {/* Custom Legend */}
                  <div className="absolute bottom-0 w-full flex justify-center gap-3">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                        {d.name} ({Math.round((d.value/data.summary.totalPublications)*100)}%)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Author Details */}
            {selectedAuthor && (
              <div className="bg-[#f8f9fa] rounded-2xl shadow-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
                <div className="p-5 border-b border-slate-200 bg-white">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-1">{selectedAuthor.name}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-cyan-100 text-cyan-800">
                          <Star className="w-3 h-3" /> Score: {selectedAuthor.score}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                          <FileText className="w-3 h-3" /> {selectedAuthor.totalPublications} Pubs
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[
                        { label: 'Q1', count: selectedAuthor.q1, color: 'bg-sky-100 text-sky-800' },
                        { label: 'Q2', count: selectedAuthor.q2, color: 'bg-emerald-100 text-emerald-800' },
                        { label: 'Q3', count: selectedAuthor.q3, color: 'bg-amber-100 text-amber-800' },
                        { label: 'Q4', count: selectedAuthor.q4, color: 'bg-rose-100 text-rose-800' },
                      ].map(q => q.count > 0 && (
                        <div key={q.label} className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg ${q.color}`}>
                          <span className="text-[9px] font-bold opacity-80">{q.label}</span>
                          <span className="text-xs font-bold leading-none">{q.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-auto p-0 bg-white hide-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 z-10">
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="px-5 py-2.5">Paper Title</th>
                        <th className="px-5 py-2.5 w-20 text-center">Year</th>
                        <th className="px-5 py-2.5 w-20 text-center">Quartile</th>
                        <th className="px-5 py-2.5 w-20 text-right">Citations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedAuthor.papers.map((paper, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                              {paper.title}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-xs text-slate-500 font-medium">{paper.year}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {paper.quartile ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                paper.quartile.toUpperCase() === 'Q1' ? 'bg-sky-100 text-sky-800' :
                                paper.quartile.toUpperCase() === 'Q2' ? 'bg-emerald-100 text-emerald-800' :
                                paper.quartile.toUpperCase() === 'Q3' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {paper.quartile}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-xs font-bold text-slate-700">{paper.citedBy}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: Leaderboard */}
          <div className="w-full lg:w-80 flex flex-col flex-shrink-0">
            <div className="bg-[#1a2235]/80 backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden border border-white/10">
              <div className="p-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-cyan-400" /> Top Researchers
                </h2>
                <span className="text-[10px] font-medium bg-white/10 text-cyan-200 px-2 py-1 rounded-full">
                  Score Ranked
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-auto p-3 hide-scrollbar">
                <div className="space-y-2">
                  {top10.length > 0 ? top10.map((author, index) => (
                    <button
                      key={author.name}
                      onClick={() => setSelectedAuthor(author)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all border ${
                        selectedAuthor?.name === author.name 
                          ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex-shrink-0 w-6 pt-0.5 flex justify-center">
                        {getRankBadge(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1.5">
                          <p className={`text-sm font-bold truncate pr-2 ${selectedAuthor?.name === author.name ? 'text-cyan-300' : 'text-slate-200'}`}>
                            {author.name}
                          </p>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-md flex-shrink-0 ${selectedAuthor?.name === author.name ? 'bg-cyan-500 text-white' : 'bg-white/10 text-cyan-400'}`}>
                            {author.score} pts
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-500"/> {author.totalPublications}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <Quote className="w-3 h-3 text-slate-500"/> {author.totalCitations}
                          </span>
                          <div className="flex gap-1 ml-auto">
                            {author.q1 > 0 && <span className="text-[9px] font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/20">Q1: {author.q1}</span>}
                            {author.q2 > 0 && <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">Q2: {author.q2}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 opacity-20" />
                      No researchers found.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-white/5">
                <button 
                  onClick={() => setShowAllModal(true)}
                  className="w-full py-2.5 bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                >
                  View Full Leaderboard
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* See All Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[#0f2027]/80 backdrop-blur-sm" onClick={() => setShowAllModal(false)}></div>
          <div className="relative bg-[#f8f9fa] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-slate-800">Full Leaderboard</h2>
              <button 
                onClick={() => setShowAllModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search lecturer name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-auto p-0 bg-white hide-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 z-10">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3 text-center">Total Pubs</th>
                    <th className="px-6 py-3 text-center">Quartile Breakdown</th>
                    <th className="px-6 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeaderboard.map((author, index) => {
                    const actualRank = data.leaderboard.findIndex(a => a.name === author.name) + 1;
                    return (
                      <tr 
                        key={author.name} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedAuthor(author);
                          setShowAllModal(false);
                        }}
                      >
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-500">#{actualRank}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-800">{author.name}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-slate-700">{author.totalPublications}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {author.q1 > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">Q1: {author.q1}</span>}
                            {author.q2 > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Q2: {author.q2}</span>}
                            {author.q3 > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Q3: {author.q3}</span>}
                            {author.q4 > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Q4: {author.q4}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-cyan-600">{author.score}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm font-medium">
                        No lecturers found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
