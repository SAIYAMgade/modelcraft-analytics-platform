import React from 'react';
import { 
  Home, 
  Compass, 
  Workflow, 
  Database, 
  ShieldCheck, 
  Code2, 
  Network, 
  Layers, 
  BarChart3, 
  Scale, 
  Box, 
  Terminal, 
  FileText, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';

export type PageId = 
  | 'home'
  | 'getting-started'
  | 'flow'
  | 'sources'
  | 'quality'
  | 'models'
  | 'lineage'
  | 'schema'
  | 'analytics'
  | 'reconciliation'
  | 'warehouse'
  | 'runs'
  | 'documentation'
  | 'architecture';

export type PersonaMode = 'business' | 'engineering';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  isOnline
}) => {
  const navGroups: NavGroup[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'home', label: 'Home', icon: <Home className="w-4 h-4 shrink-0" /> },
        { id: 'getting-started', label: 'Getting Started', icon: <Compass className="w-4 h-4 shrink-0" /> },
      ]
    },
    {
      title: 'DATA EXPLORATION',
      items: [
        { id: 'flow', label: 'Follow the Data', icon: <Workflow className="w-4 h-4 shrink-0" />, badge: 'Flow' },
        { id: 'sources', label: 'Data Sources', icon: <Database className="w-4 h-4 shrink-0" /> },
        { id: 'quality', label: 'Data Quality', icon: <ShieldCheck className="w-4 h-4 shrink-0" /> },
      ]
    },
    {
      title: 'MODELING',
      items: [
        { id: 'models', label: 'SQL Models', icon: <Code2 className="w-4 h-4 shrink-0" />, badge: '22' },
        { id: 'lineage', label: 'Model Lineage', icon: <Network className="w-4 h-4 shrink-0" /> },
        { id: 'schema', label: 'Star Schema', icon: <Layers className="w-4 h-4 shrink-0" />, badge: 'New' },
        { id: 'analytics', label: 'Commercial Marts', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'reconciliation', label: 'Reconciliation', icon: <Scale className="w-4 h-4 shrink-0" /> },
        { id: 'warehouse', label: 'Warehouse', icon: <Box className="w-4 h-4 shrink-0" /> },
        { id: 'runs', label: 'Build & Test Runs', icon: <Terminal className="w-4 h-4 shrink-0" /> },
      ]
    },
    {
      title: 'RESOURCES',
      items: [
        { id: 'documentation', label: 'Documentation', icon: <FileText className="w-4 h-4 shrink-0" /> },
        { id: 'architecture', label: 'Architecture', icon: <Cpu className="w-4 h-4 shrink-0" /> },
      ]
    }
  ];

  const handleItemClick = (id: PageId) => {
    onSelectPage(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0] select-none text-[#172B4D]">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-[#E2E8F0] flex items-center justify-between min-h-[64px]">
        {!isCollapsed ? (
          <button 
            onClick={() => handleItemClick('home')}
            className="flex items-center space-x-3 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-md bg-[#0F172A] text-white flex items-center justify-center font-mono font-bold text-xs tracking-wider shadow-sm group-hover:bg-[#1E293B] transition-colors">
              MC
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-[#0F172A] flex items-center space-x-1.5">
                <span>MODELCRAFT</span>
              </div>
              <div className="text-[11px] text-[#64748B] font-medium leading-none mt-0.5">
                Analytics Studio
              </div>
            </div>
          </button>
        ) : (
          <button 
            onClick={() => handleItemClick('home')}
            className="w-8 h-8 mx-auto rounded-md bg-[#0F172A] text-white flex items-center justify-center font-mono font-bold text-xs tracking-wider shadow-sm hover:bg-[#1E293B] transition-colors"
            title="MODELCRAFT Home"
          >
            MC
          </button>
        )}

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-[#94A3B8] uppercase mb-1.5">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-md px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#0F172A] text-white font-semibold shadow-sm'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isActive ? 'text-white' : 'text-[#64748B]'}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                        isActive 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Database Status & Desktop Collapse */}
      <div className="p-3 border-t border-[#E2E8F0] space-y-2 bg-[#FAFBFD]">
        {!isCollapsed && (
          <div className="p-2.5 rounded-md border border-[#E2E8F0] bg-white space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="text-[#64748B] font-mono">WAREHOUSE</span>
              <div className="flex items-center space-x-1.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[#0F172A] text-[11px] font-semibold">DuckDB Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
              <span>DBT CORE</span>
              <span className="font-bold text-[#0F172A]">v1.12.6</span>
            </div>
          </div>
        )}

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-full py-1.5 text-xs text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-md transition-colors font-mono"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center space-x-1.5 text-[11px]">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={onCloseMobile} 
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
