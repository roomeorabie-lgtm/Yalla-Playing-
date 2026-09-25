import { useEffect, useRef, useState, useCallback } from 'react';
import { AnswersMap, CategoryKey, Player, RoomState } from '../types/game.ts';
import { sounds } from '../utils/sound.ts';
import { 
  supabase, 
  isSupabaseConfigured, 
  getActiveSupabaseCredentials 
} from '../utils/supabase.ts';
import { 
  calculateRoundScores, 
  fetchFullSupabaseRoomState 
} from '../utils/supabaseEngine.ts';

export function useGameSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    return sessionStorage.getItem('yalla_playing_player_id');
  });
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    return sessionStorage.getItem('yalla_playing_room_code');
  });
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [backendMode, setBackendMode] = useState<'server' | 'supabase' | 'unknown'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check whether we are talking to a dedicated Node server or running serverless/Vercel
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setBackendMode('server');
        setIsConnected(true);
        setErrorMessage(null);
        return 'server';
      }
    } catch {
      // Endpoint 404 or network unreachable
    }

    // Server not available -> we are on Vercel or static deployment
    setBackendMode('supabase');
    if (isSupabaseConfigured) {
      setIsConnected(true);
      setErrorMessage(null);
    } else {
      setIsConnected(false);
    }
    return 'supabase';
  }, []);

  // 1. Listen via Server-Sent Events (for Express backend mode)
  const startSSEListener = useCallback((code: string, pId: string) => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    try {
      const sse = new EventSource(`/api/rooms/${code}/events?playerId=${encodeURIComponent(pId)}`);
      sseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_STATE') {
            setRoomState(data.payload);
            setIsConnected(true);
            const curPid = sessionStorage.getItem('yalla_playing_player_id');
            if (curPid && data.payload.hostId === curPid) {
              setIsHost(true);
            }
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };
    } catch {}
  }, []);

  // 2. Listen via Supabase Realtime Channel (for Vercel / serverless mode)
  const subscribeToSupabaseRoom = useCallback((code: string, currentPId: string) => {
    if (!supabase) return;

    if (supabaseChannelRef.current) {
      supabase.removeChannel(supabaseChannelRef.current);
      supabaseChannelRef.current = null;
    }

    console.log(`Subscribing to Supabase Realtime for room: ${code}`);

    const channel = supabase.channel(`room:${code}`, {
      config: { broadcast: { ack: true } }
    });

    supabaseChannelRef.current = channel;

    // Listen for broadcast events
    channel
      .on('broadcast', { event: 'ROOM_STATE_SYNC' }, ({ payload }) => {
        if (payload?.roomState) {
          setRoomState(payload.roomState);
          setIsConnected(true);
          if (payload.roomState.hostId === currentPId) {
            setIsHost(true);
          }
        }
      })
      .on('broadcast', { event: 'SUBMIT_TRIGGER' }, async () => {
        // Refresh room state when a player submits
        const latest = await fetchFullSupabaseRoomState(code);
        if (latest) {
          setRoomState(latest);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, async () => {
        const latest = await fetchFullSupabaseRoomState(code);
        if (latest) setRoomState(latest);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` }, async () => {
        const latest = await fetchFullSupabaseRoomState(code);
        if (latest) setRoomState(latest);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Supabase Realtime subscribed to room:${code}`);
          setIsConnected(true);
        }
      });

    // Safety polling every 2s to guarantee 100% sync even through mobile sleep/wake
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      const state = await fetchFullSupabaseRoomState(code);
      if (state) {
        setRoomState(state);
      }
    }, 2000);
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkHealth();

    const storedCode = sessionStorage.getItem('yalla_playing_room_code');
    const storedPid = sessionStorage.getItem('yalla_playing_player_id');

    if (storedCode && storedPid) {
      if (isSupabaseConfigured) {
        fetchFullSupabaseRoomState(storedCode).then((st) => {
          if (st) {
            setRoomState(st);
            if (st.hostId === storedPid) setIsHost(true);
          }
        });
        subscribeToSupabaseRoom(storedCode, storedPid);
      } else {
        startSSEListener(storedCode, storedPid);
      }
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (sseRef.current) sseRef.current.close();
      if (supabaseChannelRef.current && supabase) supabase.removeChannel(supabaseChannelRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [checkHealth, startSSEListener, subscribeToSupabaseRoom]);

  // Create room
  const createRoom = useCallback(async (hostName: string, avatar: string, targetScore: 150 | 250 | 450) => {
    sessionStorage.setItem('yalla_playing_player_name', hostName);
    sessionStorage.setItem('yalla_playing_player_avatar', avatar);
    sounds.playPop();

    const mode = await checkHealth();

    // Mode A: Express backend active
    if (mode === 'server') {
      try {
        const res = await fetch('/api/rooms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostName, avatar, targetScore })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `خطأ (${res.status})`);
        }
        const data = await res.json();
        setPlayerId(data.playerId);
        setRoomCode(data.roomCode);
        setIsHost(true);
        setRoomState(data.roomState);
        sessionStorage.setItem('yalla_playing_player_id', data.playerId);
        sessionStorage.setItem('yalla_playing_room_code', data.roomCode);
        startSSEListener(data.roomCode, data.playerId);
        return;
      } catch (err: any) {
        console.warn('Express create failed, falling back to Supabase...', err);
      }
    }

    // Mode B: Supabase (Vercel / serverless production)
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('لتشغيل اللعبة أونلاين على Vercel، يرجى ربط Supabase من أيقونة 🗄️ في الأعلى، أو إضافتها في متغيرات Vercel.');
      sounds.playInvalid();
      return;
    }

    try {
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      const hostId = 'p_' + Math.random().toString(36).substring(2, 9);

      // Insert room into Supabase
      const { error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          target_score: targetScore,
          stage: 'LOBBY',
          current_round: 1,
          host_id: hostId,
          letter_picker_id: hostId,
          used_letters: [],
          round_scores: {},
          countdown_seconds: null,
          first_submitter_name: null,
          created_at: new Date().toISOString(),
        });

      if (roomErr) {
        console.error('Supabase room insert error:', roomErr);
        throw new Error('خطأ في قاعدة بيانات Supabase: ' + roomErr.message);
      }

      // Insert host into players
      const { error: playerErr } = await supabase
        .from('players')
        .insert({
          id: hostId,
          room_code: roomCode,
          name: hostName.trim() || 'مالك الغرفة',
          avatar: avatar || '👑',
          is_host: true,
          total_score: 0,
          is_connected: true,
          submitted_answers: null,
          last_active: new Date().toISOString(),
        });

      if (playerErr) {
        console.error('Supabase player insert error:', playerErr);
        throw new Error('خطأ في تسجيل اللاعب: ' + playerErr.message);
      }

      setPlayerId(hostId);
      setRoomCode(roomCode);
      setIsHost(true);
      sessionStorage.setItem('yalla_playing_player_id', hostId);
      sessionStorage.setItem('yalla_playing_room_code', roomCode);

      const initialState: RoomState = {
        code: roomCode,
        targetScore,
        stage: 'LOBBY',
        currentRound: 1,
        hostId,
        letterPickerId: hostId,
        currentLetter: null,
        usedLetters: [],
        players: [{
          id: hostId,
          name: hostName.trim() || 'مالك الغرفة',
          avatar: avatar || '👑',
          isHost: true,
          isConnected: true,
          totalScore: 0,
          hasSubmitted: false
        }],
        submissionsCount: 0,
        totalActivePlayers: 1,
        roundScores: {},
        winner: null,
        countdownSeconds: null,
        firstSubmitterName: null,
      };

      setRoomState(initialState);
      subscribeToSupabaseRoom(roomCode, hostId);
    } catch (err: any) {
      console.error('Create room error:', err);
      setErrorMessage(err?.message || 'تعذر إنشاء الغرفة.');
      sounds.playInvalid();
    }
  }, [checkHealth, startSSEListener, subscribeToSupabaseRoom]);

  // Join room
  const joinRoom = useCallback(async (code: string, playerName: string, avatar: string) => {
    const cleanCode = code.trim();
    sessionStorage.setItem('yalla_playing_player_name', playerName);
    sessionStorage.setItem('yalla_playing_player_avatar', avatar);
    sessionStorage.setItem('yalla_playing_room_code', cleanCode);
    sounds.playPop();

    const mode = await checkHealth();

    // Mode A: Express backend
    if (mode === 'server') {
      try {
        const res = await fetch(`/api/rooms/${cleanCode}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, avatar })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'رقم الغرفة غير صحيح أو الغرفة غير موجودة');
        }
        const data = await res.json();
        setPlayerId(data.playerId);
        setRoomCode(data.roomCode);
        setIsHost(data.isHost);
        setRoomState(data.roomState);
        sessionStorage.setItem('yalla_playing_player_id', data.playerId);
        startSSEListener(data.roomCode, data.playerId);
        return;
      } catch (err: any) {
        console.warn('Express join failed, trying Supabase...', err);
      }
    }

    // Mode B: Supabase
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('لتشغيل اللعبة أونلاين على Vercel، يرجى ربط Supabase من أيقونة 🗄️ في الأعلى، أو إضافتها في متغيرات Vercel.');
      sounds.playInvalid();
      return;
    }

    try {
      // 1. Verify room exists
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', cleanCode)
        .single();

      if (roomErr || !room) {
        throw new Error('رقم الغرفة غير صحيح أو الغرفة غير موجودة');
      }

      const pId = 'p_' + Math.random().toString(36).substring(2, 9);

      // 2. Add player
      const { error: pErr } = await supabase
        .from('players')
        .insert({
          id: pId,
          room_code: cleanCode,
          name: playerName.trim() || 'لاعب جديد',
          avatar: avatar || '🌸',
          is_host: false,
          total_score: 0,
          is_connected: true,
          submitted_answers: null,
          last_active: new Date().toISOString(),
        });

      if (pErr) {
        throw new Error('فشل تسجيل الدخول للغرفة: ' + pErr.message);
      }

      setPlayerId(pId);
      setRoomCode(cleanCode);
      setIsHost(false);
      sessionStorage.setItem('yalla_playing_player_id', pId);

      const latestState = await fetchFullSupabaseRoomState(cleanCode);
      if (latestState) {
        setRoomState(latestState);
      }

      subscribeToSupabaseRoom(cleanCode, pId);

      // Broadcast join event
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'SUBMIT_TRIGGER',
          payload: {}
        });
      }
    } catch (err: any) {
      console.error('Join room error:', err);
      setErrorMessage(err?.message || 'تعذر الانضمام للغرفة.');
      sounds.playInvalid();
    }
  }, [checkHealth, startSSEListener, subscribeToSupabaseRoom]);

  // Dispatch Action
  const dispatchAction = useCallback(async (type: string, payload: any = {}) => {
    const rCode = roomCode || sessionStorage.getItem('yalla_playing_room_code');
    const pId = playerId || sessionStorage.getItem('yalla_playing_player_id');
    if (!rCode || !pId) return;

    // Mode A: Express
    if (backendMode === 'server') {
      try {
        const res = await fetch(`/api/rooms/${rCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: pId, action: type, payload })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.roomState) setRoomState(data.roomState);
        }
        return;
      } catch (err) {
        console.warn('Action server error:', err);
      }
    }

    // Mode B: Supabase
    if (!supabase || !roomState) return;

    try {
      switch (type) {
        case 'START_GAME': {
          await supabase
            .from('rooms')
            .update({
              stage: 'CHOOSING_LETTER',
              current_round: 1,
              current_letter: null,
              used_letters: [],
              round_scores: {},
              countdown_seconds: null,
              first_submitter_name: null,
            })
            .eq('code', rCode);

          await supabase
            .from('players')
            .update({ total_score: 0, submitted_answers: null })
            .eq('room_code', rCode);

          const updated = await fetchFullSupabaseRoomState(rCode);
          if (updated) {
            setRoomState(updated);
            supabaseChannelRef.current?.send({
              type: 'broadcast',
              event: 'ROOM_STATE_SYNC',
              payload: { roomState: updated }
            });
          }
          break;
        }

        case 'SELECT_LETTER': {
          const letter = payload.letter;
          const used = roomState.usedLetters.includes(letter)
            ? roomState.usedLetters
            : [...roomState.usedLetters, letter];

          await supabase
            .from('rooms')
            .update({
              current_letter: letter,
              used_letters: used,
              stage: 'PLAYING',
              countdown_seconds: null,
              first_submitter_name: null,
            })
            .eq('code', rCode);

          await supabase
            .from('players')
            .update({ submitted_answers: null })
            .eq('room_code', rCode);

          const updated = await fetchFullSupabaseRoomState(rCode);
          if (updated) {
            setRoomState(updated);
            supabaseChannelRef.current?.send({
              type: 'broadcast',
              event: 'ROOM_STATE_SYNC',
              payload: { roomState: updated }
            });
          }
          break;
        }

        case 'SUBMIT_ANSWERS': {
          const answers: AnswersMap = payload.answers;
          await supabase
            .from('players')
            .update({ submitted_answers: answers })
            .eq('id', pId)
            .eq('room_code', rCode);

          // Insert into answers table
          const rows = (Object.keys(answers) as CategoryKey[]).map(cat => ({
            room_code: rCode,
            player_id: pId,
            round_number: roomState.currentRound,
            category: cat,
            answer: answers[cat],
            points: 0
          }));
          await supabase.from('answers').insert(rows);

          // Notify all clients of submission
          supabaseChannelRef.current?.send({
            type: 'broadcast',
            event: 'SUBMIT_TRIGGER',
            payload: {}
          });

          // Check if countdown should start
          const latest = await fetchFullSupabaseRoomState(rCode);
          if (!latest) return;
          setRoomState(latest);

          const allSubmitted = latest.players.every(p => p.hasSubmitted);

          const finalizeRound = async () => {
            const sb = supabase;
            if (!sb) return;

            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            const currentPlayers = latest.players;
            const submittedMap: Record<string, Record<CategoryKey, string>> = {};

            // Fetch latest submissions from players table
            const { data: dbPlayers } = await sb
              .from('players')
              .select('*')
              .eq('room_code', rCode);

            for (const p of dbPlayers || []) {
              submittedMap[p.id] = p.submitted_answers || {
                name: '', animal: '', plant: '', object: '', country: ''
              };
            }

            const roundScores = calculateRoundScores(currentPlayers, submittedMap, latest.currentLetter || '');

            // Update scores in players table
            for (const [playerId, score] of Object.entries(roundScores)) {
              const prev = currentPlayers.find(x => x.id === playerId)?.totalScore || 0;
              await sb
                .from('players')
                .update({ total_score: prev + score.roundTotal })
                .eq('id', playerId)
                .eq('room_code', rCode);
            }

            await sb
              .from('rooms')
              .update({
                stage: 'ROUND_RESULTS',
                round_scores: roundScores,
                countdown_seconds: null,
                first_submitter_name: null,
              })
              .eq('code', rCode);

            const finalState = await fetchFullSupabaseRoomState(rCode);
            if (finalState) {
              setRoomState(finalState);
              supabaseChannelRef.current?.send({
                type: 'broadcast',
                event: 'ROOM_STATE_SYNC',
                payload: { roomState: finalState }
              });
            }
          };

          if (allSubmitted) {
            await finalizeRound();
          } else if (latest.countdownSeconds === null) {
            // First submitter -> start 5-second countdown!
            const submitterName = latest.players.find(x => x.id === pId)?.name || 'أحد اللاعبين';
            let secondsLeft = 5;

            const sb = supabase;
            if (!sb) return;

            await sb
              .from('rooms')
              .update({
                countdown_seconds: secondsLeft,
                first_submitter_name: submitterName
              })
              .eq('code', rCode);

            countdownIntervalRef.current = setInterval(async () => {
              secondsLeft -= 1;
              if (secondsLeft <= 0) {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                await finalizeRound();
              } else {
                await sb
                  .from('rooms')
                  .update({ countdown_seconds: secondsLeft })
                  .eq('code', rCode);

                const interim = await fetchFullSupabaseRoomState(rCode);
                if (interim) {
                  setRoomState(interim);
                  supabaseChannelRef.current?.send({
                    type: 'broadcast',
                    event: 'ROOM_STATE_SYNC',
                    payload: { roomState: interim }
                  });
                }
              }
            }, 1000);
          }
          break;
        }

        case 'HOST_NEXT_ROUND': {
          const hasWinner = roomState.players.some(p => p.totalScore >= roomState.targetScore);
          if (hasWinner) {
            await supabase.from('rooms').update({ stage: 'GAME_OVER' }).eq('code', rCode);
          } else {
            const nextRound = roomState.currentRound + 1;
            const playerIds = roomState.players.map(p => p.id);
            const pickerIndex = nextRound % playerIds.length;
            const nextPickerId = playerIds[pickerIndex] || roomState.hostId;

            await supabase
              .from('rooms')
              .update({
                stage: 'CHOOSING_LETTER',
                current_round: nextRound,
                current_letter: null,
                letter_picker_id: nextPickerId,
                countdown_seconds: null,
                first_submitter_name: null,
              })
              .eq('code', rCode);

            await supabase
              .from('players')
              .update({ submitted_answers: null })
              .eq('room_code', rCode);
          }

          const updated = await fetchFullSupabaseRoomState(rCode);
          if (updated) {
            setRoomState(updated);
            supabaseChannelRef.current?.send({
              type: 'broadcast',
              event: 'ROOM_STATE_SYNC',
              payload: { roomState: updated }
            });
          }
          break;
        }

        case 'RESTART_GAME': {
          await supabase
            .from('rooms')
            .update({
              stage: 'LOBBY',
              current_round: 1,
              current_letter: null,
              used_letters: [],
              round_scores: {},
              countdown_seconds: null,
              first_submitter_name: null,
            })
            .eq('code', rCode);

          await supabase
            .from('players')
            .update({ total_score: 0, submitted_answers: null })
            .eq('room_code', rCode);

          const updated = await fetchFullSupabaseRoomState(rCode);
          if (updated) {
            setRoomState(updated);
            supabaseChannelRef.current?.send({
              type: 'broadcast',
              event: 'ROOM_STATE_SYNC',
              payload: { roomState: updated }
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Supabase dispatch action error:', err);
    }
  }, [backendMode, playerId, roomCode, roomState]);

  const startGame = useCallback(() => {
    sounds.playPop();
    dispatchAction('START_GAME');
  }, [dispatchAction]);

  const selectLetter = useCallback((letter: string) => {
    sounds.playLetterSelect();
    dispatchAction('SELECT_LETTER', { letter });
  }, [dispatchAction]);

  const submitAnswers = useCallback((answers: AnswersMap) => {
    sounds.playSubmitSuccess();
    dispatchAction('SUBMIT_ANSWERS', { answers });
  }, [dispatchAction]);

  const hostForceEndRound = useCallback(() => {
    sounds.playPop();
    dispatchAction('HOST_FORCE_END_ROUND');
  }, [dispatchAction]);

  const hostAdjustScore = useCallback((targetPlayerId: string, category: CategoryKey, newPoints: number) => {
    sounds.playPop();
    dispatchAction('HOST_ADJUST_SCORE', { targetPlayerId, category, newPoints });
  }, [dispatchAction]);

  const hostNextRound = useCallback(() => {
    sounds.playPop();
    dispatchAction('HOST_NEXT_ROUND');
  }, [dispatchAction]);

  const restartGame = useCallback(() => {
    sounds.playPop();
    dispatchAction('RESTART_GAME');
  }, [dispatchAction]);

  const leaveRoom = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    if (supabaseChannelRef.current && supabase) supabase.removeChannel(supabaseChannelRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    sessionStorage.removeItem('yalla_playing_room_code');
    sessionStorage.removeItem('yalla_playing_player_id');
    setRoomState(null);
    setRoomCode(null);
    setPlayerId(null);
    setIsHost(false);
    window.location.href = window.location.pathname;
  }, []);

  return {
    roomState,
    roomCode,
    playerId,
    isHost,
    isConnected,
    errorMessage,
    backendMode,
    setErrorMessage,
    checkHealth,
    createRoom,
    joinRoom,
    startGame,
    selectLetter,
    submitAnswers,
    hostForceEndRound,
    hostAdjustScore,
    hostNextRound,
    restartGame,
    leaveRoom,
  };
}
