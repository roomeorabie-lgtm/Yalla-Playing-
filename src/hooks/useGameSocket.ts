import { useEffect, useRef, useState, useCallback } from 'react';
import { AnswersMap, CategoryKey, RoomState } from '../types/game.ts';
import { sounds } from '../utils/sound.ts';
import { supabase, isSupabaseConfigured, supabaseCreateRoom, supabaseJoinRoom } from '../utils/supabase.ts';

export function useGameSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    return sessionStorage.getItem('yalla_playing_player_id');
  });
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    return sessionStorage.getItem('yalla_playing_room_code');
  });
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true); // Start true, verified via health check
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Check server health immediately on mount
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setIsConnected(true);
        setErrorMessage(null);
        return true;
      }
    } catch {
      // Backend error
    }
    return false;
  }, []);

  // 2. Listen to live updates via Server-Sent Events (SSE) for 100% reliable real-time sync
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

      sse.onerror = () => {
        // SSE temporary drop, browser auto-retries
      };
    } catch (err) {
      console.warn('Failed to start SSE, will use polling fallback', err);
    }
  }, []);

  // 3. Fallback state fetcher
  const fetchRoomState = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/rooms/${code}/state`);
      if (res.ok) {
        const state: RoomState = await res.json();
        setRoomState(state);
        setIsConnected(true);
        const curPid = sessionStorage.getItem('yalla_playing_player_id');
        if (curPid && state.hostId === curPid) {
          setIsHost(true);
        }
      }
    } catch {}
  }, []);

  // 4. WebSocket connection (optional accelerator)
  const connectWebSocket = useCallback((code?: string, pId?: string) => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);

        const rCode = code || sessionStorage.getItem('yalla_playing_room_code');
        const plId = pId || sessionStorage.getItem('yalla_playing_player_id');
        const pName = sessionStorage.getItem('yalla_playing_player_name');
        const pAvatar = sessionStorage.getItem('yalla_playing_player_avatar');

        if (rCode && plId) {
          ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            payload: {
              roomCode: rCode,
              playerName: pName || 'لاعب',
              avatar: pAvatar || '🌸',
              existingPlayerId: plId
            }
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_STATE') {
            setRoomState(data.payload);
            setIsConnected(true);
            const curPid = sessionStorage.getItem('yalla_playing_player_id');
            if (curPid && data.payload.hostId === curPid) {
              setIsHost(true);
            }
          } else if (data.type === 'JOINED_SUCCESS') {
            const { roomCode: rCode, playerId: returnedPid, isHost: hostStatus } = data.payload;
            setPlayerId(returnedPid);
            setRoomCode(rCode);
            setIsHost(hostStatus);
            sessionStorage.setItem('yalla_playing_player_id', returnedPid);
            sessionStorage.setItem('yalla_playing_room_code', rCode);
            startSSEListener(rCode, returnedPid);
          } else if (data.type === 'ERROR') {
            setErrorMessage(data.payload.message || 'حدث خطأ');
            sounds.playInvalid();
          }
        } catch (err) {
          console.error('Socket message parse error:', err);
        }
      };

      ws.onerror = () => {
        // Quietly failover to SSE and HTTP REST
      };

      ws.onclose = () => {
        socketRef.current = null;
      };
    } catch {
      // Environments with strict CSP or WebSocket blocking
    }
  }, [startSSEListener]);

  // Initial mount verification
  useEffect(() => {
    checkHealth();
    connectWebSocket();

    const storedCode = sessionStorage.getItem('yalla_playing_room_code');
    const storedPid = sessionStorage.getItem('yalla_playing_player_id');

    if (storedCode && storedPid) {
      fetchRoomState(storedCode);
      startSSEListener(storedCode, storedPid);
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (sseRef.current) sseRef.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [checkHealth, connectWebSocket, fetchRoomState, startSSEListener]);

  // Dispatch action to server (Tries WebSocket first, falls back immediately to HTTP REST)
  const dispatchAction = useCallback(async (type: string, payload: any = {}) => {
    const rCode = roomCode || sessionStorage.getItem('yalla_playing_room_code');
    const pId = playerId || sessionStorage.getItem('yalla_playing_player_id');

    // 1. Try WebSocket if available
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
      return;
    }

    // 2. HTTP REST fallback
    if (rCode && pId) {
      try {
        const res = await fetch(`/api/rooms/${rCode}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: pId, action: type, payload })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.roomState) {
            setRoomState(data.roomState);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setErrorMessage(errData.error || 'تعذر تنفيذ العملية');
        }
      } catch (err: any) {
        console.error('Action error:', err);
        setErrorMessage('تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت.');
      }
    }
  }, [roomCode, playerId]);

  // Create room handler
  const createRoom = useCallback(async (hostName: string, avatar: string, targetScore: 150 | 250 | 450) => {
    sessionStorage.setItem('yalla_playing_player_name', hostName);
    sessionStorage.setItem('yalla_playing_player_avatar', avatar);
    sounds.playPop();

    // 1. Try WebSocket if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Dispatching CREATE_ROOM via WebSocket...');
      socketRef.current.send(JSON.stringify({
        type: 'CREATE_ROOM',
        payload: { hostName, avatar, targetScore }
      }));
      return;
    }

    // 2. REST API execution
    try {
      console.log('Sending room creation request to /api/rooms/create...');
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName, avatar, targetScore })
      });

      if (!res.ok) {
        let errDetail = `خطأ في الخادم (${res.status} ${res.statusText})`;
        try {
          const errData = await res.json();
          if (errData.error) errDetail = errData.error;
        } catch {}
        console.error('❌ Room creation failed HTTP error:', res.status, res.statusText, errDetail);
        throw new Error(errDetail);
      }

      const data = await res.json();
      console.log('✅ Room created successfully:', data.roomCode, 'Host ID:', data.playerId);

      setPlayerId(data.playerId);
      setRoomCode(data.roomCode);
      setIsHost(true);
      setRoomState(data.roomState);
      sessionStorage.setItem('yalla_playing_player_id', data.playerId);
      sessionStorage.setItem('yalla_playing_room_code', data.roomCode);

      // Mirror to Supabase if configured
      if (isSupabaseConfigured) {
        supabaseCreateRoom(data.roomCode, {
          id: data.playerId,
          name: hostName,
          avatar: avatar,
          isHost: true,
          isConnected: true,
          totalScore: 0,
          hasSubmitted: false
        }, targetScore).catch(err => console.warn('Supabase mirror note:', err));
      }

      startSSEListener(data.roomCode, data.playerId);
      connectWebSocket(data.roomCode, data.playerId);
    } catch (err: any) {
      console.error('❌ Detailed create room error:', err);
      setErrorMessage(err?.message || 'فشل إنشاء الغرفة. يرجى المحاولة مرة أخرى.');
      sounds.playInvalid();
    }
  }, [connectWebSocket, startSSEListener]);

  // Join room handler
  const joinRoom = useCallback(async (code: string, playerName: string, avatar: string) => {
    const cleanCode = code.trim();
    sessionStorage.setItem('yalla_playing_player_name', playerName);
    sessionStorage.setItem('yalla_playing_player_avatar', avatar);
    sessionStorage.setItem('yalla_playing_room_code', cleanCode);
    sounds.playPop();

    // 1. Try WebSocket if open
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Dispatching JOIN_ROOM via WebSocket...');
      socketRef.current.send(JSON.stringify({
        type: 'JOIN_ROOM',
        payload: { roomCode: cleanCode, playerName, avatar }
      }));
      return;
    }

    // 2. REST API execution
    try {
      console.log(`Sending join room request to /api/rooms/${cleanCode}/join...`);
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, avatar })
      });

      if (!res.ok) {
        let errDetail = 'رقم الغرفة غير صحيح أو الغرفة غير موجودة';
        try {
          const errData = await res.json();
          if (errData.error) errDetail = errData.error;
        } catch {}
        console.error('❌ Join room failed HTTP error:', res.status, res.statusText, errDetail);
        throw new Error(errDetail);
      }

      const data = await res.json();
      console.log('✅ Joined room successfully:', data.roomCode, 'Player ID:', data.playerId);

      setPlayerId(data.playerId);
      setRoomCode(data.roomCode);
      setIsHost(data.isHost);
      setRoomState(data.roomState);
      sessionStorage.setItem('yalla_playing_player_id', data.playerId);

      // Mirror to Supabase if configured
      if (isSupabaseConfigured) {
        supabaseJoinRoom(data.roomCode, {
          id: data.playerId,
          name: playerName,
          avatar: avatar,
          isHost: data.isHost,
          isConnected: true,
          totalScore: 0,
          hasSubmitted: false
        }).catch(err => console.warn('Supabase mirror join note:', err));
      }

      startSSEListener(data.roomCode, data.playerId);
      connectWebSocket(data.roomCode, data.playerId);
    } catch (err: any) {
      console.error('❌ Detailed join room error:', err);
      setErrorMessage(err?.message || 'تعذر الانضمام للغرفة.');
      sounds.playInvalid();
    }
  }, [connectWebSocket, startSSEListener]);

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
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
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
