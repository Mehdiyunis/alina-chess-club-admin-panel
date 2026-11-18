'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  Edit,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  SiteProfile,
  Tournament,
  TournamentAgeCategory,
  TournamentGrade,
  TournamentMatch,
  TournamentPlayer,
  TournamentResult,
  TournamentRound,
} from '@/lib/types';
import {
  AGE_CATEGORIES,
  AGE_LABELS,
  GRADE_LABELS,
  GRADES,
  RESULT_OPTIONS,
  STATUS_CLASSES,
  STATUS_LABELS,
  formatAzDateTime,
} from '@/lib/tournament-config';
import { getFriendlyErrorMessage } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

interface MatchDraft {
  white_player_id: string;
  black_player_id: string;
  result: TournamentResult | '';
}

const emptyMatchDraft = (): MatchDraft => ({
  white_player_id: '',
  black_player_id: '',
  result: '',
});

export default function TournamentManagePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { showSuccess, showError } = useToast();
  const { canEdit } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [profiles, setProfiles] = useState<SiteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'players' | 'rounds'>('players');

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerProfile, setNewPlayerProfile] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState<TournamentAgeCategory>('U12');
  const [newPlayerGrade, setNewPlayerGrade] = useState<TournamentGrade>('UNRATED');

  const [newMatchRound, setNewMatchRound] = useState('');
  const [newMatchWhite, setNewMatchWhite] = useState('');
  const [newMatchBlack, setNewMatchBlack] = useState('');
  const [newMatchAge, setNewMatchAge] = useState<TournamentAgeCategory>('U12');
  const [newMatchGrade, setNewMatchGrade] = useState<TournamentGrade>('UNRATED');

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchDraft, setMatchDraft] = useState<MatchDraft>(emptyMatchDraft());

  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerateRound, setRegenerateRound] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const supabase = createClient();
      const [tournamentRes, playersRes, roundsRes, matchesRes, profilesRes] = await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('tournament_players')
          .select('*')
          .eq('tournament_id', id)
          .order('full_name', { ascending: true }),
        supabase
          .from('tournament_rounds')
          .select('*')
          .eq('tournament_id', id)
          .order('round_number', { ascending: true }),
        supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', id)
          .order('round_number', { ascending: true })
          .order('board_number', { ascending: true }),
        supabase.from('profiles').select('id, full_name').order('full_name', { ascending: true }),
      ]);

      if (tournamentRes.error) throw tournamentRes.error;
      if (!tournamentRes.data) {
        showError('Turnir tapılmadı.');
        return;
      }
      if (playersRes.error) throw playersRes.error;
      if (roundsRes.error) throw roundsRes.error;
      if (matchesRes.error) throw matchesRes.error;
      if (profilesRes.error) console.warn('Profiles fetch error:', profilesRes.error.message);

      setTournament(tournamentRes.data as Tournament);
      setPlayers((playersRes.data as TournamentPlayer[]) || []);
      setRounds((roundsRes.data as TournamentRound[]) || []);
      setMatches((matchesRes.data as TournamentMatch[]) || []);
      setProfiles((profilesRes.data as SiteProfile[]) || []);
      if (!newMatchRound && roundsRes.data?.length) {
        setNewMatchRound(String((roundsRes.data as TournamentRound[])[0].id));
      }
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, load]);

  const selectProfile = (profileId: string) => {
    setNewPlayerProfile(profileId);
    const profile = profiles.find((item) => item.id === profileId);
    if (profile?.full_name) setNewPlayerName(profile.full_name);
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      showError('İştirakçının adını daxil edin.');
      return;
    }
    try {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase.from('tournament_players').insert([
        {
          tournament_id: id,
          profile_id: newPlayerProfile || null,
          full_name: newPlayerName.trim(),
          age_category: newPlayerAge,
          grade: newPlayerGrade,
        },
      ]);
      if (error) throw error;
      showSuccess('İştirakçı əlavə edildi.');
      setNewPlayerName('');
      setNewPlayerProfile('');
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removePlayer = async (player: TournamentPlayer) => {
    try {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase.from('tournament_players').delete().eq('id', player.id);
      if (error) throw error;
      showSuccess('İştirakçı turnirdən çıxarıldı.');
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: 'upcoming' | 'started') => {
    try {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('tournaments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      showSuccess(status === 'started' ? 'Turnir başladı.' : 'Turnir gözlənilənə keçirildi.');
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    try {
      setBusy(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc('activate_tournament', {
        p_tournament_id: id,
      });
      if (error) throw error;
      showSuccess(`Qəbul bağlandı, 1-ci tur yaradıldı (${data ?? 0} oyun).`);
      setTab('rounds');
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const generateNextRound = async () => {
    if (!tournament) return;
    const next = rounds.length + 1;
    if (next > tournament.round_count) {
      showError('Bütün turlar artıq yaradılıb.');
      return;
    }
    try {
      setBusy(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc('generate_tournament_round', {
        p_tournament_id: id,
        p_round_number: next,
        p_force: false,
      });
      if (error) throw error;
      showSuccess(`${next}-ci tur yaradıldı (${data ?? 0} oyun).`);
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmRegenerate = async () => {
    if (regenerateRound === null) return;
    try {
      setBusy(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc('generate_tournament_round', {
        p_tournament_id: id,
        p_round_number: regenerateRound,
        p_force: true,
      });
      if (error) throw error;
      showSuccess(`${regenerateRound}-ci tur yenidən cütləndi (${data ?? 0} oyun).`);
      setRegenerateOpen(false);
      setRegenerateRound(null);
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addManualMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchRound || !newMatchWhite || !newMatchBlack) {
      showError('Tur və hər iki oyunçu seçilməlidir.');
      return;
    }
    if (newMatchWhite === newMatchBlack) {
      showError('Eyni oyunçunu özü ilə cütləmək olmaz.');
      return;
    }
    try {
      setBusy(true);
      const supabase = createClient();
      const round = rounds.find((item) => item.id === newMatchRound);
      const board =
        matches
          .filter((match) => match.round_id === newMatchRound)
          .reduce((max, match) => Math.max(max, match.board_number), 0) + 1;
      const { error } = await supabase.from('tournament_matches').insert([
        {
          tournament_id: id,
          round_id: newMatchRound,
          round_number: round?.round_number || 1,
          board_number: board,
          age_category: newMatchAge,
          grade: newMatchGrade,
          white_player_id: newMatchWhite,
          black_player_id: newMatchBlack,
          result: null,
          is_bye: false,
        },
      ]);
      if (error) throw error;
      showSuccess('Oyun əlavə edildi.');
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startEditMatch = (match: TournamentMatch) => {
    setEditingMatchId(match.id);
    setMatchDraft({
      white_player_id: match.white_player_id || '',
      black_player_id: match.black_player_id || '',
      result: match.result || '',
    });
  };

  const saveMatch = async (match: TournamentMatch) => {
    try {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          white_player_id: matchDraft.white_player_id || null,
          black_player_id: matchDraft.black_player_id || null,
          result: matchDraft.result || null,
          is_bye: false,
        })
        .eq('id', match.id);
      if (error) throw error;
      showSuccess('Oyun yeniləndi.');
      setEditingMatchId(null);
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeMatch = async (match: TournamentMatch) => {
    try {
      setBusy(true);
      const supabase = createClient();
      const { error } = await supabase.from('tournament_matches').delete().eq('id', match.id);
      if (error) throw error;
      showSuccess('Oyun silindi.');
      await load();
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const playerName = (playerId: string | null) =>
    players.find((player) => player.id === playerId)?.full_name || '—';

  const resultText = (result: TournamentResult | null) =>
    RESULT_OPTIONS.find((option) => option.value === result)?.label || '—';

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-[#5E6B62] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#2F5D46] border-t-[#1F3D2F] rounded-full animate-spin" />
        <span className="font-medium text-xs">Turnir yüklənir...</span>
      </div>
    );
  }

  if (!tournament) return null;

  const canGenerate = canEdit && tournament.status !== 'finished' && rounds.length < tournament.round_count;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link
            href="/tournaments"
            className="mt-1 p-2 rounded-lg text-[#5E6B62] hover:bg-[rgba(26,19,12,0.06)] transition-colors"
            title="Turnirlərə qayıt"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif-heading font-medium text-[#1E2A22]">
              {tournament.title_az}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASSES[tournament.status]}`}
              >
                {STATUS_LABELS[tournament.status]}
              </span>
              <span className="text-xs text-[#5E6B62] flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" />
                {formatAzDateTime(tournament.starts_at)} — {formatAzDateTime(tournament.ends_at)}
              </span>
              <span className="text-xs text-[#5E6B62]">{tournament.round_count} tur</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={load}
            className="px-4 py-2 rounded-full bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs font-medium text-[#1E2A22] hover:bg-[#F7F3EA] cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yenilə
          </button>
          {canEdit && tournament.status === 'registration' && (
            <button
              onClick={activate}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-[#2F5D46] hover:bg-[#1F3D2F] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Qəbulu bitir, cütlət
            </button>
          )}
          {canEdit && tournament.status === 'upcoming' && (
            <button
              onClick={() => setStatus('started')}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-[#2F5D46] hover:bg-[#1F3D2F] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              Turniri başlat
            </button>
          )}
          {canGenerate && (
            <button
              onClick={generateNextRound}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-[#1E2A22] hover:bg-black text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              {rounds.length + 1}-ci turu yarat
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-b border-[rgba(26,19,12,0.10)]">
        <button
          onClick={() => setTab('players')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px cursor-pointer ${
            tab === 'players'
              ? 'border-[#2F5D46] text-[#2F5D46]'
              : 'border-transparent text-[#5E6B62] hover:text-[#1E2A22]'
          }`}
        >
          İştirakçılar ({players.length})
        </button>
        <button
          onClick={() => setTab('rounds')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px cursor-pointer ${
            tab === 'rounds'
              ? 'border-[#2F5D46] text-[#2F5D46]'
              : 'border-transparent text-[#5E6B62] hover:text-[#1E2A22]'
          }`}
        >
          Turlar ({rounds.length}/{tournament.round_count})
        </button>
      </div>

      {tab === 'players' && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
          {canEdit && (
            <form
              onSubmit={addPlayer}
              className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-5 space-y-4 shadow-2xs"
            >
              <h3 className="text-sm font-semibold text-[#1E2A22] flex items-center gap-2">
                <Users className="w-4 h-4" />
                İştirakçı əlavə et
              </h3>
              <div>
                <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                  Sayt istifadəçisindən seç
                </label>
                <select
                  value={newPlayerProfile}
                  onChange={(e) => selectProfile(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                >
                  <option value="">— Əl ilə daxil et —</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">
                  Ad və soyad *
                </label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Əli Məmmədov"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">Yaş</label>
                  <select
                    value={newPlayerAge}
                    onChange={(e) => setNewPlayerAge(e.target.value as TournamentAgeCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                  >
                    {AGE_CATEGORIES.map((age) => (
                      <option key={age} value={age}>
                        {AGE_LABELS[age]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1E2A22] mb-1.5">Dərəcə</label>
                  <select
                    value={newPlayerGrade}
                    onChange={(e) => setNewPlayerGrade(e.target.value as TournamentGrade)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:border-[#2F5D46] focus:outline-none"
                  >
                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {GRADE_LABELS[grade]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2.5 rounded-full bg-[#2F5D46] hover:bg-[#1F3D2F] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Əlavə et
              </button>
            </form>
          )}

          <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden">
            {players.length === 0 ? (
              <div className="p-16 text-center text-sm text-[#5E6B62]">Hələ iştirakçı yoxdur.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#1F3D2F] text-[#C9D3C4] uppercase text-[11px] tracking-wider">
                      <th className="py-3.5 px-5 font-semibold">İştirakçı</th>
                      <th className="py-3.5 px-4 font-semibold">Yaş</th>
                      <th className="py-3.5 px-4 font-semibold">Dərəcə</th>
                      <th className="py-3.5 px-5 text-right font-semibold">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(26,19,12,0.08)]">
                    {players.map((player) => (
                      <tr key={player.id} className="hover:bg-[#2F5D46]/15 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-medium text-[#1E2A22]">{player.full_name}</div>
                          <div className="text-[10px] text-[#5E6B62]">
                            {player.profile_id ? 'Sayt istifadəçisi' : 'Əl ilə qeyd'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#5E6B62]">{AGE_LABELS[player.age_category]}</td>
                        <td className="py-3 px-4 text-[#5E6B62]">{GRADE_LABELS[player.grade]}</td>
                        <td className="py-3 px-5 text-right">
                          {canEdit && (
                            <button
                              onClick={() => removePlayer(player)}
                              disabled={busy}
                              title="Çıxar"
                              className="p-2 rounded-lg text-[#B3261E] hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'rounds' && (
        <div className="space-y-5">
          {canEdit && rounds.length > 0 && (
            <form
              onSubmit={addManualMatch}
              className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-5 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-[#1E2A22] mb-1">Tur</label>
                <select
                  value={newMatchRound}
                  onChange={(e) => setNewMatchRound(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#F7F3EA] border border-[rgba(26,19,12,0.15)] text-xs focus:outline-none"
                >
                  {rounds.map((round) => (
                    <option key={round.id} value={round.id}>
                      {round.round_number}-ci tur
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#1E2A22] mb-1">Ağ</label>
                <select
                  value={newMatchWhite}
                  onChange={(e) => setNewMatchWhite(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:outline-none"
                >
                  <option value="">— seç —</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#1E2A22] mb-1">Qara</label>
                <select
                  value={newMatchBlack}
                  onChange={(e) => setNewMatchBlack(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:outline-none"
                >
                  <option value="">— seç —</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#1E2A22] mb-1">Yaş</label>
                <select
                  value={newMatchAge}
                  onChange={(e) => setNewMatchAge(e.target.value as TournamentAgeCategory)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:outline-none"
                >
                  {AGE_CATEGORIES.map((age) => (
                    <option key={age} value={age}>
                      {AGE_LABELS[age]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#1E2A22] mb-1">Dərəcə</label>
                <select
                  value={newMatchGrade}
                  onChange={(e) => setNewMatchGrade(e.target.value as TournamentGrade)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#FFFFFF] border border-[rgba(26,19,12,0.15)] text-xs focus:outline-none"
                >
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {GRADE_LABELS[grade]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                title="Oyunu əlavə et"
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#2F5D46] hover:bg-[#1F3D2F] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Oyun
              </button>
            </form>
          )}

          {rounds.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl p-16 text-center">
              <p className="text-sm text-[#5E6B62]">Hələ tur yaradılmayıb.</p>
              {canEdit && tournament.status === 'registration' && (
                <button
                  onClick={activate}
                  disabled={busy}
                  className="mt-4 px-5 py-2 rounded-full bg-[#2F5D46] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  Qəbulu bitir, cütlət
                </button>
              )}
            </div>
          ) : (
            rounds.map((round) => {
              const roundMatches = matches
                .filter((match) => match.round_id === round.id)
                .sort((a, b) => a.board_number - b.board_number);
              return (
                <div
                  key={round.id}
                  className="bg-[#FFFFFF] border border-[rgba(26,19,12,0.10)] rounded-2xl shadow-2xs overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-[#F7F3EA] border-b border-[rgba(26,19,12,0.10)] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#1E2A22]">{round.round_number}-ci tur</h3>
                      <span className="text-[10px] text-[#5E6B62]">
                        {round.is_manual ? 'Əl ilə' : 'Avtomatik'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#5E6B62]">{roundMatches.length} oyun</span>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setRegenerateRound(round.round_number);
                            setRegenerateOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#5E6B62] hover:bg-[rgba(26,19,12,0.06)] cursor-pointer"
                          title="Bu turu yenidən cütlət"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {roundMatches.length === 0 ? (
                    <p className="p-8 text-center text-xs text-[#5E6B62]">Bu turda oyun yoxdur.</p>
                  ) : (
                    <div className="divide-y divide-[rgba(26,19,12,0.08)]">
                      {roundMatches.map((match) => {
                        const isEditing = editingMatchId === match.id;
                        return (
                          <div
                            key={match.id}
                            className="px-5 py-3 flex flex-wrap items-center gap-3 text-xs"
                          >
                            <span className="w-6 shrink-0 text-[10px] text-[#5E6B62]">
                              {match.board_number}
                            </span>
                            {isEditing ? (
                              <>
                                <select
                                  value={matchDraft.white_player_id}
                                  onChange={(e) =>
                                    setMatchDraft((prev) => ({ ...prev, white_player_id: e.target.value }))
                                  }
                                  className="flex-1 min-w-[140px] px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs"
                                >
                                  <option value="">— ağ —</option>
                                  {players.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.full_name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={matchDraft.black_player_id}
                                  onChange={(e) =>
                                    setMatchDraft((prev) => ({ ...prev, black_player_id: e.target.value }))
                                  }
                                  className="flex-1 min-w-[140px] px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs"
                                >
                                  <option value="">— qara —</option>
                                  {players.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.full_name}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={matchDraft.result}
                                  onChange={(e) =>
                                    setMatchDraft((prev) => ({
                                      ...prev,
                                      result: e.target.value as TournamentResult | '',
                                    }))
                                  }
                                  className="w-24 px-2.5 py-2 rounded-lg border border-[rgba(26,19,12,0.15)] text-xs"
                                >
                                  <option value="">—</option>
                                  {RESULT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => saveMatch(match)}
                                  disabled={busy}
                                  className="p-2 rounded-lg text-[#2F5D46] hover:bg-[#2F5D46]/10 cursor-pointer disabled:opacity-40"
                                  title="Yadda saxla"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingMatchId(null)}
                                  className="p-2 rounded-lg text-[#5E6B62] hover:bg-[rgba(26,19,12,0.06)] cursor-pointer"
                                  title="Ləğv et"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 min-w-[120px] text-[#1E2A22] font-medium">
                                  {playerName(match.white_player_id)}
                                </span>
                                <span className="w-14 text-center font-semibold text-[#2F5D46]">
                                  {match.is_bye ? 'Bay' : resultText(match.result)}
                                </span>
                                <span className="flex-1 min-w-[120px] text-right text-[#1E2A22] font-medium">
                                  {match.is_bye ? '—' : playerName(match.black_player_id)}
                                </span>
                                <span className="text-[10px] text-[#5E6B62] hidden lg:block">
                                  {AGE_LABELS[match.age_category]} · {GRADE_LABELS[match.grade]}
                                </span>
                                {canEdit && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => startEditMatch(match)}
                                      className="p-2 rounded-lg text-[#5E6B62] hover:bg-[rgba(26,19,12,0.06)] cursor-pointer"
                                      title="Redaktə et"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => removeMatch(match)}
                                      disabled={busy}
                                      className="p-2 rounded-lg text-[#B3261E] hover:bg-rose-500/10 cursor-pointer disabled:opacity-40"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={regenerateOpen}
        onClose={() => {
          setRegenerateOpen(false);
          setRegenerateRound(null);
        }}
        onConfirm={confirmRegenerate}
        isLoading={busy}
        title={`${regenerateRound ?? ''}-ci turu yenidən cütlət`}
        description="Bu turdakı bütün oyunlar və nəticələr silinib yenidən yaradılacaq. Davam etmək istədiyinizdən əminsiniz?"
        confirmText="Yenidən yarat"
        cancelText="Ləğv et"
      />
    </div>
  );
}
