import React, { useState, useEffect } from "react";
import { MediaCard } from "../media/MediaCard";
import { useDebounce } from "../../hooks/useDebounce";
import { cn } from "../../utils/cn";

export interface AppLayoutProps {
  children?: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string;
}

interface QueueTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
}

const SAMPLE_MEDIA_ITEMS = [
  {
    id: "media-1",
    title: "Cybernetic Drift",
    subtitle: "Kavinsky Protocol",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    badgeText: "Synthwave",
    duration: "3:04",
  },
  {
    id: "media-2",
    title: "Quantum Telemetry",
    subtitle: "Solaris Array",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    badgeText: "Ambient",
    duration: "3:35",
  },
  {
    id: "media-3",
    title: "Sub-Bass Protocol",
    subtitle: "Modeselektor Grid",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    badgeText: "Bass",
    duration: "2:48",
  },
  {
    id: "media-4",
    title: "Neural Network Beats",
    subtitle: "Deep Learning Labs",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    badgeText: "Lo-Fi",
    duration: "4:12",
  },
];

const SAMPLE_QUEUE: QueueTrack[] = [
  {
    id: "q-1",
    title: "Neon Horizon",
    artist: "Glitch Mobius",
    duration: "3:20",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "q-2",
    title: "Binary Sunset",
    artist: "Turing Machine",
    duration: "4:05",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "q-3",
    title: "Silicon Resonance",
    artist: "Ada Lovelace Echo",
    duration: "2:54",
    coverUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80",
  },
  {
    id: "q-4",
    title: "Fiber Optic Dreams",
    artist: "Vapor Waveform",
    duration: "3:42",
    coverUrl: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&auto=format&fit=crop&q=80",
  },
];

/**
 * AppLayout Component (Enterprise 3-Column Root Architecture)
 *
 * DOM Engineering & Performance Attributes:
 * 1. Strict `h-screen h-[100dvh] overflow-hidden` CSS Grid shell prevents document scroll.
 * 2. Independent sub-scrollers (`overscroll-contain`) prevent momentum bleed across columns.
 * 3. Mobile adaptive: Sidebars fold into drawers on `< md` screens while Main spans 100%.
 * 4. Fixed 90px Global Audio Player footer with iOS safe area compliance.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMediaId, setActiveMediaId] = useState<string>("media-1");
  const [isPlaying, setIsPlaying] = useState(false);

  // Debounced search input to protect UI thread
  const debouncedSearch = useDebounce(searchQuery, 250);

  useEffect(() => {
    if (debouncedSearch) {
      // Search telemetry or query pipeline can hook in here
    }
  }, [debouncedSearch]);

  const navItems: NavItem[] = [
    {
      id: "browse",
      label: "Browse Catalog",
      active: true,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "stream",
      label: "Listen Together",
      badge: "LIVE",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "radio",
      label: "Audio Radar",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
    },
    {
      id: "library",
      label: "Your Library",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
    },
  ];

  return (
    <div
      data-testid="app-layout-shell"
      className="relative h-screen h-[100dvh] w-screen overflow-hidden bg-midnight-950 text-white font-sans grid grid-rows-[1fr_auto] md:grid-rows-[1fr_90px]"
    >
      {/* ========================================================================= */}
      {/* 3-COLUMN VIEWPORT BODY (Zero Document Scroll, Independent Scrollers)     */}
      {/* ========================================================================= */}
      <div className="grid h-full w-full grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_300px] overflow-hidden min-h-0">

        {/* ======================================================================= */}
        {/* 1. LEFT SIDEBAR: Static Primary Navigation (No Scroll Needed)          */}
        {/* ======================================================================= */}
        <aside
          aria-label="Primary Navigation Sidebar"
          className="hidden md:flex flex-col h-full w-[240px] shrink-0 border-r border-glass-border bg-midnight-950/80 backdrop-blur-2xl p-5 select-none"
        >
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-neon-cyan to-neon-violet shadow-neon-cyan text-midnight-950 font-black text-lg">
              J
            </div>
            <div>
              <div className="text-base font-extrabold tracking-[0.16em] text-white">JAVIFY</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neon-cyan">Stream OS</div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav aria-label="Main Navigation" className="mt-8 flex flex-col gap-1.5">
            <span className="px-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Menu
            </span>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-medium transition-all group",
                  item.active
                    ? "bg-glass-elevated border border-glass-border text-neon-cyan shadow-glass-sm font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={item.active ? "text-neon-cyan" : "text-slate-500 group-hover:text-slate-300"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-neon-cyan/15 px-2 py-0.5 text-[9px] font-mono font-bold text-neon-cyan border border-neon-cyan/30">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Playlists Quick Access */}
          <div className="mt-8 flex flex-col gap-1.5 flex-1 min-h-0">
            <span className="px-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Curated Shelves
            </span>
            <div className="flex flex-col gap-1 overflow-y-auto overscroll-contain pr-1">
              {["Daily Flow 01", "Midnight Coding", "Tokyo Lo-Fi 24/7", "Heavy Synth Pulse", "Neural Beats"].map(
                (shelf, idx) => (
                  <button
                    key={`shelf-${idx}`}
                    type="button"
                    className="truncate rounded-xl px-3 py-2 text-left text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    # {shelf}
                  </button>
                )
              )}
            </div>
          </div>

          {/* System Spec Pill */}
          <div className="mt-auto rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-[11px] font-mono text-slate-500">
            <div className="flex items-center justify-between">
              <span>AUDIO ENGINE</span>
              <span className="text-neon-emerald">ONLINE</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-600">60 FPS DOM Recycle</div>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* 2. MAIN CONTENT: Fluid Center Space (Independent overflow-y-auto)       */}
        {/* ======================================================================= */}
        <main
          tabIndex={-1}
          className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain flex flex-col relative focus:outline-none"
        >
          {/* Top Bar Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-glass-border/40 bg-midnight-950/80 backdrop-blur-2xl px-6 py-4 gap-4">

            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              aria-label="Open mobile navigation"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-2xl border border-glass-border bg-glass-surface text-slate-300 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumbs Component */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Home</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Browse</span>
              <span className="text-slate-600">/</span>
              <span className="text-neon-cyan font-semibold">Electronic</span>
            </nav>

            {/* Right Header Area: Search Input + Mobile Queue Trigger */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="relative w-48 sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search titles, artists..."
                  className="w-full rounded-2xl border border-glass-border bg-midnight-900/80 px-4 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 backdrop-blur-md focus:border-neon-cyan focus:outline-none transition-colors"
                />
                <svg
                  className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {searchQuery !== debouncedSearch && (
                  <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-neon-amber animate-ping" />
                )}
              </div>

              {/* Mobile Right Sidebar Queue Toggle */}
              <button
                type="button"
                aria-label="Open queue and lyrics drawer"
                onClick={() => setMobileQueueOpen(true)}
                className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-2xl border border-glass-border bg-glass-surface text-slate-300 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </header>

          {/* Media Hub Content Area */}
          <div className="flex-1 p-6 md:p-8 space-y-8">
            {children ? (
              children
            ) : (
              <>
                {/* Featured Media Hub Grid */}
                <section aria-labelledby="featured-hub-heading" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan">
                        Featured Releases
                      </span>
                      <h2 id="featured-hub-heading" className="text-xl font-bold text-white tracking-tight sm:text-2xl">
                        Soundstream Spotlight
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                      Hover for spring elevation & play reveal
                    </span>
                  </div>

                  {/* Responsive CSS Grid for Media Cards */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {SAMPLE_MEDIA_ITEMS.map((item) => (
                      <MediaCard
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        subtitle={item.subtitle}
                        coverUrl={item.coverUrl}
                        badgeText={item.badgeText}
                        duration={item.duration}
                        isPlaying={isPlaying && activeMediaId === item.id}
                        onPlay={(id) => {
                          setActiveMediaId(id);
                          setIsPlaying((prev) => (activeMediaId === id ? !prev : true));
                        }}
                      />
                    ))}
                  </div>
                </section>

                {/* Subcategory Audio Shelves */}
                <section aria-label="Audio Shelves" className="space-y-4 pt-4">
                  <h3 className="text-lg font-bold text-white tracking-tight">Heavy Rotation</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {["Deep Focus Cyber", "Midnight Retrowave", "High Voltage Bass", "NTP Synced Party"].map(
                      (title, i) => (
                        <div
                          key={`cat-${i}`}
                          className="flex flex-col justify-end h-28 rounded-2xl border border-glass-border bg-gradient-to-br from-glass-surface to-midnight-900 p-4 transition-all hover:border-glass-highlight hover:shadow-glass-sm cursor-pointer"
                        >
                          <span className="text-xs font-mono text-neon-cyan">0{i + 1}</span>
                          <span className="text-sm font-semibold text-white mt-1">{title}</span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>

        {/* ======================================================================= */}
        {/* 3. RIGHT SIDEBAR: Dynamic Queue & Synced Lyrics (Independent Scroller)  */}
        {/* ======================================================================= */}
        <aside
          aria-label="Up Next and Queue Panel"
          className="hidden lg:flex flex-col h-full w-[300px] shrink-0 border-l border-glass-border bg-midnight-950/80 backdrop-blur-2xl p-5 select-none"
        >
          <div className="flex items-center justify-between pb-4 border-b border-glass-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Up Next</span>
              <span className="rounded-full bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-mono text-neon-cyan border border-neon-cyan/20">
                {SAMPLE_QUEUE.length} Tracks
              </span>
            </div>
            <button
              type="button"
              className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Independent Scrolling Queue List */}
          <div className="flex-1 overflow-y-auto overscroll-contain py-3 pr-1 space-y-2.5">
            {SAMPLE_QUEUE.map((item, idx) => (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent p-2.5 transition-all hover:border-glass-border hover:bg-glass-surface/80 cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="w-4 text-center font-mono text-xs text-slate-500 group-hover:text-neon-cyan">
                    {idx + 1}
                  </span>
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-10 w-10 rounded-xl object-cover border border-white/5 shrink-0"
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white truncate group-hover:text-neon-cyan transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{item.artist}</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500 shrink-0">{item.duration}</span>
              </div>
            ))}
          </div>

          {/* Synced Lyrics Snippet Card */}
          <div className="mt-auto rounded-3xl border border-neon-violet/30 bg-gradient-to-br from-neon-violet/15 to-transparent p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-[10px] font-mono text-purple-300 uppercase">
              <span>Synced Lyrics</span>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-violet animate-pulse" />
            </div>
            <p className="mt-2 text-xs font-medium text-slate-200 italic leading-relaxed">
              &quot;Signals drift through the cybernetic wire, syncing every beat to zero latency...&quot;
            </p>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 4. GLOBAL PLAYER: Fixed Absolute Bottom Footer (Never Scrolls, 100% W)   */}
      {/* ========================================================================= */}
      <footer
        aria-label="Global Audio Player"
        className="h-[90px] w-full shrink-0 border-t border-glass-border bg-midnight-900/90 backdrop-blur-2xl z-30 px-6 flex items-center justify-between select-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Track Metadata Left */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[180px]">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80"
            alt="Current Track"
            className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
          />
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate hover:text-neon-cyan cursor-pointer transition-colors">
              Cybernetic Drift
            </div>
            <div className="text-[11px] text-slate-400 truncate">Kavinsky Protocol</div>
          </div>
        </div>

        {/* Center Playback Controls & Progress Slider */}
        <div className="flex flex-col items-center gap-1.5 max-w-lg w-full px-4">
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Previous track" className="text-slate-400 hover:text-white transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-cyan text-midnight-950 font-bold shadow-neon-cyan transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? (
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button type="button" aria-label="Next track" className="text-slate-400 hover:text-white transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full text-[10px] font-mono text-slate-500">
            <span>1:12</span>
            <div className="relative h-1 flex-1 rounded-full bg-white/10 overflow-hidden cursor-pointer">
              <div className="absolute left-0 top-0 h-full w-[40%] bg-gradient-to-r from-neon-cyan to-neon-violet rounded-full" />
            </div>
            <span>3:04</span>
          </div>
        </div>

        {/* Volume & Aux Actions Right */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[140px] text-slate-400">
          <button type="button" aria-label="Mute or unmute volume" className="hover:text-white transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <div className="h-1 w-20 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[70%] bg-neon-cyan rounded-full" />
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MOBILE DRAWERS (For < md Screens)                                         */}
      {/* ========================================================================= */}
      {mobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden bg-midnight-950/80 backdrop-blur-xl"
        >
          <div className="w-72 h-full bg-midnight-900 border-r border-glass-border p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-glass-border">
              <span className="text-base font-bold text-white">Menu</span>
              <button
                type="button"
                aria-label="Close navigation drawer"
                onClick={() => setMobileNavOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={`m-${item.id}`}
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}

      {mobileQueueOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end lg:hidden bg-midnight-950/80 backdrop-blur-xl"
        >
          <div className="flex-1" onClick={() => setMobileQueueOpen(false)} />
          <div className="w-80 h-full bg-midnight-900 border-l border-glass-border p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-glass-border">
              <span className="text-base font-bold text-white">Queue & Lyrics</span>
              <button
                type="button"
                aria-label="Close queue drawer"
                onClick={() => setMobileQueueOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {SAMPLE_QUEUE.map((item, idx) => (
                <div key={`mq-${item.id}`} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-300">
                    {idx + 1}. {item.title}
                  </span>
                  <span className="font-mono text-slate-500 text-[10px]">{item.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
