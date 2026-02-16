'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { createSchemaClient, getPublicClient } from '@/lib/supabase-schema';
import { useAuth } from './AuthProvider';
import { Team, TeamContext, DEFAULT_SCHEMA } from '@/types/team';
import { SupabaseClient } from '@supabase/supabase-js';

const TeamCtx = createContext<TeamContext>({
  team: null,
  teamId: null,
  teamSchema: DEFAULT_SCHEMA,
  isLoading: true,
  canSwitchTeams: false,
  allTeams: [],
  switchTeam: () => {},
});

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [canSwitchTeams, setCanSwitchTeams] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Загрузка команды менеджера
  useEffect(() => {
    async function loadTeam() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const publicClient = getPublicClient();
        
        // Получаем менеджера по auth_user_id
        const { data: manager, error: managerError } = await publicClient
          .from('managers')
          .select('id, team_id, can_switch_teams, role')
          .eq('auth_user_id', user.id)
          .single();
        
        // Manager loaded successfully
        
        if (managerError || !manager) {
          console.error('Manager not found:', managerError);
          // Загружаем все команды и берём первую
          const { data: teamsData } = await publicClient
            .from('teams')
            .select('*')
            .eq('is_active', true)
            .order('name')
            .limit(1);
          
          if (teamsData && teamsData.length > 0) {
            setTeam(teamsData[0]);
          }
          setIsLoading(false);
          return;
        }
        
        // Если может переключаться между командами (admin или can_switch_teams)
        const canSwitch = manager.can_switch_teams || manager.role === 'admin';
        setCanSwitchTeams(canSwitch);
        
        // Загружаем все команды если может переключаться
        let teamsData: Team[] = [];
        if (canSwitch) {
          const { data } = await publicClient
            .from('teams')
            .select('*')
            .eq('is_active', true)
            .order('name');
          
          if (data) {
            teamsData = data;
            setAllTeams(data);
          }
        }
        
        // Получаем команду менеджера
        if (manager.team_id) {
          const { data: teamData, error: teamError } = await publicClient
            .from('teams')
            .select('*')
            .eq('id', manager.team_id)
            .single();
          
          // Team loaded
          
          if (teamData) {
            setTeam(teamData);
          }
        } else if (canSwitch && teamsData.length > 0) {
          // Для супер-админов без team_id берём первую команду
          setTeam(teamsData[0]);
        }
        
      } catch (error) {
        console.error('Error loading team:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTeam();
  }, [user]);
  
  // Переключение команды
  const switchTeam = useCallback((teamId: string) => {
    const newTeam = allTeams.find(t => t.id === teamId);
    if (newTeam) {
      setTeam(newTeam);
      // Сохраняем выбор в localStorage
      localStorage.setItem('selectedTeamId', teamId);
    }
  }, [allTeams]);
  
  // Восстановление выбора из localStorage (только для тех, кто может переключаться)
  useEffect(() => {
    if (canSwitchTeams && allTeams.length > 0 && !isLoading && team) {
      const savedTeamId = localStorage.getItem('selectedTeamId');
      // Только восстанавливаем если сохранённая команда отличается от текущей
      if (savedTeamId && savedTeamId !== team.id) {
        const savedTeam = allTeams.find(t => t.id === savedTeamId);
        if (savedTeam) {
          setTeam(savedTeam);
        }
      }
    }
  }, [canSwitchTeams, allTeams, isLoading, team]);
  
  // Очистка localStorage при смене пользователя
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('selectedTeamId');
    }
  }, [user]);
  
  const value: TeamContext = useMemo(() => ({
    team,
    teamId: team?.id || null,
    teamSchema: team?.schema_name || DEFAULT_SCHEMA,
    isLoading,
    canSwitchTeams,
    allTeams,
    switchTeam,
  }), [team, isLoading, canSwitchTeams, allTeams, switchTeam]);
  
  return (
    <TeamCtx.Provider value={value}>
      {children}
    </TeamCtx.Provider>
  );
}

/**
 * Хук для получения контекста команды
 */
export function useTeam(): TeamContext {
  return useContext(TeamCtx);
}

/**
 * Хук для получения Supabase клиента с текущей схемой команды
 */
export function useSchemaClient(): SupabaseClient {
  const { teamSchema } = useTeam();
  return useMemo(() => createSchemaClient(teamSchema), [teamSchema]);
}

/**
 * Хук для получения схемы команды
 */
export function useTeamSchema(): string {
  const { teamSchema } = useTeam();
  return teamSchema;
}
