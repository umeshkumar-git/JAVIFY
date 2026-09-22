import { create } from "zustand";
import { AudioTrack } from "../core/audio/AudioPipeline";
import { offlineAudioCache } from "../core/audio/OfflineAudioCache";
import { BffClient } from "../services/bffClient";
import { networkMonitor } from "../core/offline/NetworkMonitor";

interface LibraryStoreState {
  tracks: AudioTrack[];
  filteredTracks: AudioTrack[];
  searchQuery: string;
  is10kBenchmarkActive: boolean;
  isBffChartsActive: boolean;
  bffChartMetadata: { chartName: string; updatedAt: string } | null;
  cachedTrackIds: Set<string>;
  storageUsage: { usageMB: number; quotaMB: number };
  isLoading: boolean;

  // Offline-First Capabilities
  isOnline: boolean;
  isSimulatedOffline: boolean;
  filterOfflineOnly: boolean;
  isDownloadingAll: boolean;
  downloadProgress: { current: number; total: number; percent: number } | null;

  // Actions
  initializeLibrary: () => Promise<void>;
  generate10kTracksBenchmark: () => void;
  loadStandardCatalog: () => void;
  loadBffCharts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;
  toggleCacheTrack: (track: AudioTrack) => Promise<void>;
  refreshCacheStatus: () => Promise<void>;
  toggleOfflineSimulation: () => void;
  toggleFilterOfflineOnly: () => void;
  downloadAllOffline: () => Promise<void>;
}

const DEFAULT_TRACKS: AudioTrack[] = [
  {
    id: "trk-synth-01",
    title: "Cybernetic Drift",
    artist: "Kavinsky Protocol",
    album: "Neon Architecture Vol. 1",
    duration: 184,
    genre: "Synthwave",
    url: "https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_atmosphere.ogg",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "trk-ambient-02",
    title: "Quantum Telemetry",
    artist: "Solaris Array",
    album: "Deep Orbit Telemetry",
    duration: 215,
    genre: "Ambient Lo-Fi",
    url: "https://actions.google.com/sounds/v1/science_fiction/scifi_telemetry.ogg",
    coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "trk-future-03",
    title: "Distributed Heartbeat",
    artist: "Subsystem X",
    album: "Zero Drift",
    duration: 198,
    genre: "Electro Orchestral",
    url: "https://actions.google.com/sounds/v1/science_fiction/space_engine_large.ogg",
    coverUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "trk-deep-04",
    title: "Binary Monks in Tokyo",
    artist: "Binary Monks",
    album: "Cyber Zen",
    duration: 242,
    genre: "Chillstep",
    url: "https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_atmosphere.ogg",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "trk-cyber-05",
    title: "Null Pointer Exception",
    artist: "JVM Overclockers",
    album: "Stack Overflow",
    duration: 176,
    genre: "Glitch Hop",
    url: "https://actions.google.com/sounds/v1/science_fiction/scifi_telemetry.ogg",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
  },
];

export const useLibraryStore = create<LibraryStoreState>((set, get) => ({
  tracks: DEFAULT_TRACKS,
  filteredTracks: DEFAULT_TRACKS,
  searchQuery: "",
  is10kBenchmarkActive: false,
  isBffChartsActive: false,
  bffChartMetadata: null,
  cachedTrackIds: new Set<string>(),
  storageUsage: { usageMB: 0, quotaMB: 0 },
  isLoading: false,

  // Offline state
  isOnline: true,
  isSimulatedOffline: false,
  filterOfflineOnly: false,
  isDownloadingAll: false,
  downloadProgress: null,

  initializeLibrary: async () => {
    networkMonitor.subscribe((isOnline) => {
      set({ isOnline, isSimulatedOffline: networkMonitor.isSimulated() });
    });
    await get().refreshCacheStatus();
  },

  loadStandardCatalog: () => {
    set({
      tracks: DEFAULT_TRACKS,
      filteredTracks: DEFAULT_TRACKS,
      is10kBenchmarkActive: false,
      isBffChartsActive: false,
      bffChartMetadata: null,
      searchQuery: "",
      filterOfflineOnly: false,
    });
  },

  loadBffCharts: async () => {
    set({ isLoading: true });
    try {
      const response = await BffClient.getTopCharts("GLOBAL", 20);
      set({
        tracks: response.tracks,
        filteredTracks: response.tracks,
        isBffChartsActive: true,
        is10kBenchmarkActive: false,
        bffChartMetadata: { chartName: response.chartName, updatedAt: response.updatedAt },
        searchQuery: "",
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load BFF top charts:", err);
      set({ isLoading: false });
    }
  },

  generate10kTracksBenchmark: () => {
    const TOTAL = 10000;
    const ARTISTS = [
      "Kavinsky Protocol",
      "Solaris Array",
      "Subsystem X",
      "Binary Monks",
      "Quantum Echo",
      "JVM Overclockers",
      "Thread Pool Collective",
      "Garbage Collector 9",
    ];
    const GENRES = ["Synthwave", "Cyberpunk", "Dark Ambient", "Lo-Fi Beats", "Neurofunk", "Deep Techno"];
    const COVERS = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    ];

    const benchmarkTracks: AudioTrack[] = new Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const seed = DEFAULT_TRACKS[i % DEFAULT_TRACKS.length];
      const artist = ARTISTS[i % ARTISTS.length];
      const genre = GENRES[i % GENRES.length];
      const cover = COVERS[i % COVERS.length];

      benchmarkTracks[i] = {
        id: `bench-trk-${i + 1}`,
        title: `${seed.title} [Stream #${i + 1}]`,
        artist: `${artist} feat. Node ${(i % 32) + 1}`,
        album: `Cluster Scale Tier-1 (Vol. ${Math.floor(i / 100) + 1})`,
        duration: 150 + (i % 140),
        genre,
        url: seed.url,
        coverUrl: cover,
      };
    }

    set({
      tracks: benchmarkTracks,
      filteredTracks: benchmarkTracks,
      is10kBenchmarkActive: true,
      isBffChartsActive: false,
      bffChartMetadata: null,
      searchQuery: "",
    });
  },

  applyFilters: () => {
    const { tracks, searchQuery, filterOfflineOnly, cachedTrackIds } = get();
    const trimmed = searchQuery.toLowerCase().trim();

    let list = tracks;
    if (filterOfflineOnly) {
      list = list.filter((t) => cachedTrackIds.has(t.id));
    }
    if (trimmed) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(trimmed) ||
          t.artist.toLowerCase().includes(trimmed) ||
          (t.album && t.album.toLowerCase().includes(trimmed)) ||
          (t.genre && t.genre.toLowerCase().includes(trimmed))
      );
    }

    set({ filteredTracks: list });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  toggleOfflineSimulation: () => {
    const isSimulated = networkMonitor.toggleSimulation();
    set({ isSimulatedOffline: isSimulated, isOnline: networkMonitor.isOnline() });
  },

  toggleFilterOfflineOnly: () => {
    set((state) => ({ filterOfflineOnly: !state.filterOfflineOnly }));
    get().applyFilters();
  },

  downloadAllOffline: async () => {
    const { tracks, cachedTrackIds } = get();
    const uncached = tracks.filter((t) => !cachedTrackIds.has(t.id)).slice(0, 15);
    if (uncached.length === 0) return;

    set({
      isDownloadingAll: true,
      downloadProgress: { current: 0, total: uncached.length, percent: 0 },
    });

    for (let i = 0; i < uncached.length; i++) {
      try {
        await offlineAudioCache.cacheTrack(uncached[i]);
      } catch (err) {
        console.warn("[OfflineDownload] Track cache error:", err);
      }
      const current = i + 1;
      const percent = Math.round((current / uncached.length) * 100);
      set({ downloadProgress: { current, total: uncached.length, percent } });
      await get().refreshCacheStatus();
    }

    set({ isDownloadingAll: false, downloadProgress: null });
    get().applyFilters();
  },

  toggleCacheTrack: async (track: AudioTrack) => {
    const isCached = get().cachedTrackIds.has(track.id);
    if (isCached) {
      await offlineAudioCache.removeTrack(track.id);
    } else {
      await offlineAudioCache.cacheTrack(track);
    }
    await get().refreshCacheStatus();
    get().applyFilters();
  },

  refreshCacheStatus: async () => {
    try {
      const records = await offlineAudioCache.getAllCachedTracks();
      const cachedIds = new Set(records.map((r) => r.id));
      const storageUsage = await offlineAudioCache.getStorageEstimate();
      set({ cachedTrackIds: cachedIds, storageUsage });
    } catch (e) {
      // Storage unavailable in private browsing
    }
  },
}));
