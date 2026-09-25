import { useEffect, useRef, useState, useCallback } from 'react';
import { AnswersMap, CategoryKey, RoomState } from '../types/game.ts';
import { sounds } from '../utils/sound.ts';

export function useGameSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    return sessionStorage.getItem('yalla_playing_player_id');
  });
  const [roomCode, setRoomCode] = useState<string | null>(() => {
    return sessionStorage.getItem('yalla_playing_room_code');
  });
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setErrorMessage(null);

      // Attempt auto-reconnect if we have stored room & player ID
      const storedCode = sessionStorage.getItem('yalla_playing_room_code');
      const storedPlayerId = sessionStorage.getItem('yalla_playing_player_id');
      const storedName = sessionStorage.getItem('yalla_playing_player_name');
      const storedAvatar = sessionStorage.getItem('yalla_playing_player_avatar');

      if (storedCode && storedPlayerId) {
        ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          payload: {
            roomCode: storedCode,
            playerName: storedName || 'لاعب',
            avatar: storedAvatar || '🌸',
            existingPlayerId: storedPlayerId
          }
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_STATE') {
          const nextState: RoomState = data.payload;
          setRoomState(nextState);

          // Update isHost based on current playerId
          const curPid = sessionStorage.getItem('yalla_playing_player_id');
          if (curPid && nextState.hostId === curPid) {
            setIsHost(true);
          }
        } else if (data.type === 'JOINED_SUCCESS') {
          const { roomCode: rCode, playerId: pId, isHost: hostStatus } = data.payload;
          setPlayerId(pId);
          setRoomCode(rCode);
          setIsHost(hostStatus);
          sessionStorage.setItem('yalla_playing_player_id', pId);
          sessionStorage.setItem('yalla_playing_room_code', rCode);
        } else if (data.type === 'ERROR') {
          setErrorMessage(data.payload.message || 'حدث خطأ');
          sounds.playInvalid();
        }
      } catch (err) {
        console.error('Socket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
      // Try to reconnect in 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error, will retry...', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((type: string, payload: unknown = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const createRoom = useCallback((hostName: string, avatar: string, targetScore: 150 | 250 | 450) => {
    sessionStorage.setItem('yalla_playing_player_name', hostName);
    sessionStorage.setItem('yalla_playing_player_avatar', avatar);
    sounds.playPop();
    send('CREATE_ROOM', { hostName, avatar, targetScore });
  }, [send]);

  const joinRoom = useCallback((code: string, playerName: string, avatar: string) => {
    sessionStorage.setItem('yalla_playing_player_name', playerName);
    sessionStorage.setItem('yalla_playing_player_avatar', avatar);
    sessionStorage.setItem('yalla_playing_room_code', code);
    sounds.playPop();
    send('JOIN_ROOM', { roomCode: code, playerName, avatar });
  }, [send]);

  const startGame = useCallback(() => {
    sounds.playPop();
    send('START_GAME');
  }, [send]);

  const selectLetter = useCallback((letter: string) => {
    sounds.playLetterSelect();
    send('SELECT_LETTER', { letter });
  }, [send]);

  const submitAnswers = useCallback((answers: AnswersMap) => {
    sounds.playSubmitSuccess();
    send('SUBMIT_ANSWERS', { answers });
  }, [send]);

  const hostForceEndRound = useCallback(() => {
    sounds.playPop();
    send('HOST_FORCE_END_ROUND');
  }, [send]);

  const hostAdjustScore = useCallback((targetPlayerId: string, category: CategoryKey, newPoints: number) => {
    sounds.playPop();
    send('HOST_ADJUST_SCORE', { targetPlayerId, category, newPoints });
  }, [send]);

  const hostNextRound = useCallback(() => {
    sounds.playPop();
    send('HOST_NEXT_ROUND');
  }, [send]);

  const restartGame = useCallback(() => {
    sounds.playPop();
    send('RESTART_GAME');
  }, [send]);

  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('yalla_playing_room_code');
    sessionStorage.removeItem('yalla_playing_player_id');
    setRoomState(null);
    setRoomCode(null);
    setPlayerId(null);
    setIsHost(false);
    // Reload to clear state cleanly
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
