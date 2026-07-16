import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { teamsAPI } from '../utils/api';

const TeamContext = createContext({
  teams: [],
  activeTeamId: null,
  activeTeam: null,
  setActiveTeamId: () => {},
  saveTeamId: null,
  seatCap: 5,
  loading: false,
  refreshTeams: async () => [],
  isTeamMode: false
});

const STORAGE_KEY = 'vettr_active_team_id';

function normalizeTeamId(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function teamIdsMatch(a, b) {
  return normalizeTeamId(a) === normalizeTeamId(b);
}

export function useTeam() {
  return useContext(TeamContext);
}

export function TeamProvider({ children }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamIdState] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeTeamId(raw);
  });
  const [seatCap, setSeatCap] = useState(5);
  const [loading, setLoading] = useState(false);

  const refreshTeams = useCallback(async () => {
    if (!user) {
      setTeams([]);
      return [];
    }
    setLoading(true);
    try {
      const data = await teamsAPI.list();
      const list = data.teams || [];
      setTeams(list);
      setSeatCap(data.seatCap || 5);
      if (activeTeamId && !list.some((t) => teamIdsMatch(t.id, activeTeamId))) {
        console.warn('[teams] clearing stale activeTeamId', activeTeamId);
        setActiveTeamIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      return list;
    } catch (err) {
      console.error('[teams] refresh failed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, activeTeamId]);

  useEffect(() => {
    refreshTeams();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveTeamId = (id) => {
    const next = normalizeTeamId(id);
    setActiveTeamIdState(next);
    if (next) localStorage.setItem(STORAGE_KEY, String(next));
    else localStorage.removeItem(STORAGE_KEY);
    console.log('[teams] active workspace:', next ?? 'personal');
  };

  useEffect(() => {
    try {
      window.__vettrSaveTeamId = activeTeamId || null;
    } catch {}
  }, [activeTeamId]);

  const activeTeam = teams.find((t) => teamIdsMatch(t.id, activeTeamId)) || null;
  /** When a team is selected, saves go to that team by default. */
  const saveTeamId = activeTeamId;

  const value = {
    teams,
    activeTeamId,
    activeTeam,
    setActiveTeamId,
    saveTeamId,
    seatCap,
    loading,
    refreshTeams,
    isTeamMode: Boolean(activeTeamId)
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}
