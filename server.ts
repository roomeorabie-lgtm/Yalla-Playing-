import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  CategoryKey, 
  GameStage, 
  Player, 
  PlayerRoundScore, 
  RoomState 
} from './src/types/game.ts';
import { 
  checkStartsWithLetter, 
  normalizeForComparison 
} from './src/utils/arabic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  ws: WebSocket | null;
  totalScore: number;
  submittedAnswers: Record<CategoryKey, string> | null;
  lastActive: number;
}

interface ServerRoom {
  code: string;
  targetScore: 150 | 250 | 450;
  stage: GameStage;
  currentRound: number;
  hostId: string;
  letterPickerIndex: number;
  currentLetter: string | null;
  usedLetters: string[];
  players: Map<string, ServerPlayer>;
  roundScores: Record<string, PlayerRoundScore>;
  createdAt: number;
  countdownTimer: NodeJS.Timeout | null;
  countdownSeconds: number | null;
  firstSubmitterName: string | null;
}

// In-memory room store
const rooms = new Map<string, ServerRoom>();

// Map ws to { roomCode, playerId }
const socketMetadata = new WeakMap<WebSocket, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  let code = '';
  let attempts = 0;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
  } while (rooms.has(code) && attempts < 1000);
  return code;
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 9);
}

function clearRoomCountdown(room: ServerRoom) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  room.countdownSeconds = null;
  room.firstSubmitterName = null;
}

function calculateRoundScores(room: ServerRoom) {
  const scores: Record<string, PlayerRoundScore> = {};
  const activePlayers = Array.from(room.players.values()).filter(p => p.submittedAnswers !== null);
  const targetLetter = room.currentLetter || '';
  const categories: CategoryKey[] = ['name', 'animal', 'plant', 'object', 'country'];

  // Initialize for all players in room
  for (const [pId] of room.players) {
    scores[pId] = {
      playerId: pId,
      answers: {
        name: { answer: '', points: 0, status: 'EMPTY', reason: 'خانة فارغة (0 نقطة)' },
        animal: { answer: '', points: 0, status: 'EMPTY', reason: 'خانة فارغة (0 نقطة)' },
        plant: { answer: '', points: 0, status: 'EMPTY', reason: 'خانة فارغة (0 نقطة)' },
        object: { answer: '', points: 0, status: 'EMPTY', reason: 'خانة فارغة (0 نقطة)' },
        country: { answer: '', points: 0, status: 'EMPTY', reason: 'خانة فارغة (0 نقطة)' },
      },
      roundTotal: 0
    };
  }

  for (const cat of categories) {
    const wordMap = new Map<string, string[]>();

    for (const p of activePlayers) {
      const rawAnswer = p.submittedAnswers ? (p.submittedAnswers[cat] || '').trim() : '';
      const isValid = checkStartsWithLetter(rawAnswer, targetLetter);

      if (!rawAnswer) {
        scores[p.id].answers[cat] = {
          answer: '',
          points: 0,
          status: 'EMPTY',
          reason: 'خانة فارغة'
        };
      } else if (!isValid) {
        scores[p.id].answers[cat] = {
          answer: rawAnswer,
          points: 0,
          status: 'INVALID_LETTER',
          reason: `لا تبدأ بحرف (${targetLetter})`
        };
      } else {
        const norm = normalizeForComparison(rawAnswer);
        if (!wordMap.has(norm)) {
          wordMap.set(norm, []);
        }
        wordMap.get(norm)!.push(p.id);
      }
    }

    // Award points
    for (const [, playerIds] of wordMap.entries()) {
      if (playerIds.length === 1) {
        const pId = playerIds[0];
        const p = room.players.get(pId);
        if (p && p.submittedAnswers) {
          scores[pId].answers[cat] = {
            answer: p.submittedAnswers[cat],
            points: 10,
            status: 'UNIQUE',
            reason: 'إجابة فريدة (+10)'
          };
        }
      } else {
        for (const pId of playerIds) {
          const p = room.players.get(pId);
          if (p && p.submittedAnswers) {
            const others = playerIds
              .filter(id => id !== pId)
              .map(id => room.players.get(id)?.name || 'لاعب');
            scores[pId].answers[cat] = {
              answer: p.submittedAnswers[cat],
              points: 5,
              status: 'DUPLICATE',
              duplicateWithNames: others,
              reason: `مكررة مع (${others.join('، ')}) (+5)`
            };
          }
        }
      }
    }
  }

  // Calculate round total and add to player total
  for (const [pId, pScore] of Object.entries(scores)) {
    const rTotal = Object.values(pScore.answers).reduce((sum, a) => sum + a.points, 0);
    pScore.roundTotal = rTotal;
    const player = room.players.get(pId);
    if (player) {
      player.totalScore += rTotal;
    }
  }

  room.roundScores = scores;
}

function getSerializableRoomState(room: ServerRoom): RoomState {
  const playersList: Player[] = Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    isHost: p.isHost,
    isConnected: p.ws !== null && p.ws.readyState === WebSocket.OPEN,
    totalScore: p.totalScore,
    hasSubmitted: p.submittedAnswers !== null
  }));

  const playerKeys = Array.from(room.players.keys());
  const pickerIndex = room.letterPickerIndex % (playerKeys.length || 1);
  const letterPickerId = playerKeys[pickerIndex] || room.hostId;

  // Find winner if any reached target score
  let winner: Player | null = null;
  const playersOverTarget = playersList.filter(p => p.totalScore >= room.targetScore);
  if (playersOverTarget.length > 0) {
    winner = [...playersOverTarget].sort((a, b) => b.totalScore - a.totalScore)[0];
  }

  const submissionsCount = playersList.filter(p => p.hasSubmitted).length;

  return {
    code: room.code,
    targetScore: room.targetScore,
    stage: room.stage,
    currentRound: room.currentRound,
    hostId: room.hostId,
    letterPickerId,
    currentLetter: room.currentLetter,
    usedLetters: room.usedLetters,
    players: playersList,
    submissionsCount,
    totalActivePlayers: playersList.length,
    roundScores: room.roundScores,
    winner,
    countdownSeconds: room.countdownSeconds,
    firstSubmitterName: room.firstSubmitterName,
  };
}

function broadcastRoom(room: ServerRoom) {
  const state = getSerializableRoomState(room);
  const payload = JSON.stringify({ type: 'ROOM_STATE', payload: state });

  for (const player of room.players.values()) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints for room info & verification
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', game: 'Yalla Playing', time: Date.now() });
  });

  app.get('/api/room/:code', (req, res) => {
    const code = req.params.code;
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'الغرفة غير موجودة' });
    }
    return res.json({
      code: room.code,
      targetScore: room.targetScore,
      stage: room.stage,
      playerCount: room.players.size,
    });
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        const { type, payload } = msg;

        switch (type) {
          case 'CREATE_ROOM': {
            const { hostName, avatar, targetScore } = payload;
            const roomCode = generateRoomCode();
            const hostId = generatePlayerId();

            const hostPlayer: ServerPlayer = {
              id: hostId,
              name: (hostName || 'مالك الغرفة').trim(),
              avatar: avatar || '👑',
              isHost: true,
              ws,
              totalScore: 0,
              submittedAnswers: null,
              lastActive: Date.now(),
            };

            const newRoom: ServerRoom = {
              code: roomCode,
              targetScore: [150, 250, 450].includes(targetScore) ? targetScore : 150,
              stage: 'LOBBY',
              currentRound: 1,
              hostId,
              letterPickerIndex: 0,
              currentLetter: null,
              usedLetters: [],
              players: new Map([[hostId, hostPlayer]]),
              roundScores: {},
              createdAt: Date.now(),
              countdownTimer: null,
              countdownSeconds: null,
              firstSubmitterName: null,
            };

            rooms.set(roomCode, newRoom);
            socketMetadata.set(ws, { roomCode, playerId: hostId });

            ws.send(JSON.stringify({
              type: 'JOINED_SUCCESS',
              payload: { roomCode, playerId: hostId, isHost: true }
            }));

            broadcastRoom(newRoom);
            break;
          }

          case 'JOIN_ROOM': {
            const { roomCode, playerName, avatar, existingPlayerId } = payload;
            const room = rooms.get(roomCode?.toString().trim());

            if (!room) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'رقم الغرفة غير صحيح أو الغرفة غير موجودة' }
              }));
              return;
            }

            // Check if reconnecting existing player
            if (existingPlayerId && room.players.has(existingPlayerId)) {
              const existingPlayer = room.players.get(existingPlayerId)!;
              existingPlayer.ws = ws;
              existingPlayer.lastActive = Date.now();
              if (playerName) existingPlayer.name = playerName.trim();
              if (avatar) existingPlayer.avatar = avatar;

              socketMetadata.set(ws, { roomCode: room.code, playerId: existingPlayerId });

              ws.send(JSON.stringify({
                type: 'JOINED_SUCCESS',
                payload: { roomCode: room.code, playerId: existingPlayerId, isHost: existingPlayer.isHost }
              }));

              broadcastRoom(room);
              return;
            }

            // New player joining
            const newPlayerId = generatePlayerId();
            const newPlayer: ServerPlayer = {
              id: newPlayerId,
              name: (playerName || 'لاعب جديد').trim(),
              avatar: avatar || '🌸',
              isHost: false,
              ws,
              totalScore: 0,
              submittedAnswers: null,
              lastActive: Date.now(),
            };

            room.players.set(newPlayerId, newPlayer);
            socketMetadata.set(ws, { roomCode: room.code, playerId: newPlayerId });

            ws.send(JSON.stringify({
              type: 'JOINED_SUCCESS',
              payload: { roomCode: room.code, playerId: newPlayerId, isHost: false }
            }));

            broadcastRoom(room);
            break;
          }

          case 'START_GAME': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.hostId !== meta.playerId) return;

            clearRoomCountdown(room);
            room.stage = 'CHOOSING_LETTER';
            room.currentRound = 1;
            room.letterPickerIndex = 0;
            room.currentLetter = null;
            room.usedLetters = [];
            room.roundScores = {};

            // Reset scores & submissions for all players
            for (const p of room.players.values()) {
              p.totalScore = 0;
              p.submittedAnswers = null;
            }

            broadcastRoom(room);
            break;
          }

          case 'SELECT_LETTER': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.stage !== 'CHOOSING_LETTER') return;

            const playerKeys = Array.from(room.players.keys());
            const currentPickerId = playerKeys[room.letterPickerIndex % playerKeys.length];

            // Only picker or host can select letter
            if (meta.playerId !== currentPickerId && meta.playerId !== room.hostId) {
              return;
            }

            const letter = payload.letter;
            if (!letter) return;

            clearRoomCountdown(room);
            room.currentLetter = letter;
            if (!room.usedLetters.includes(letter)) {
              room.usedLetters.push(letter);
            }
            room.stage = 'PLAYING';

            // Clear previous round submissions
            for (const p of room.players.values()) {
              p.submittedAnswers = null;
            }

            broadcastRoom(room);
            break;
          }

          case 'SUBMIT_ANSWERS': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.stage !== 'PLAYING') return;

            const player = room.players.get(meta.playerId);
            if (!player) return;

            // Record this player's submitted answers
            player.submittedAnswers = {
              name: (payload.answers?.name || '').trim(),
              animal: (payload.answers?.animal || '').trim(),
              plant: (payload.answers?.plant || '').trim(),
              object: (payload.answers?.object || '').trim(),
              country: (payload.answers?.country || '').trim(),
            };

            // Check if ALL players have submitted
            const allSubmitted = Array.from(room.players.values())
              .every(p => p.submittedAnswers !== null);

            if (allSubmitted) {
              // Immediately finalize round
              clearRoomCountdown(room);
              calculateRoundScores(room);
              room.stage = 'ROUND_RESULTS';
              broadcastRoom(room);
              return;
            }

            // If not all submitted, trigger the 5-second countdown on FIRST submission!
            if (room.countdownSeconds === null) {
              room.countdownSeconds = 5;
              room.firstSubmitterName = player.name;
              broadcastRoom(room);

              room.countdownTimer = setInterval(() => {
                if (room.countdownSeconds === null) {
                  if (room.countdownTimer) clearInterval(room.countdownTimer);
                  return;
                }

                room.countdownSeconds -= 1;

                if (room.countdownSeconds <= 0) {
                  // Timer expired! Finalize round
                  clearRoomCountdown(room);

                  // Fill missing players with empty answers
                  for (const p of room.players.values()) {
                    if (p.submittedAnswers === null) {
                      p.submittedAnswers = {
                        name: '',
                        animal: '',
                        plant: '',
                        object: '',
                        country: '',
                      };
                    }
                  }

                  calculateRoundScores(room);
                  room.stage = 'ROUND_RESULTS';
                  broadcastRoom(room);
                } else {
                  // Broadcast countdown tick (5, 4, 3, 2, 1)
                  broadcastRoom(room);
                }
              }, 1000);
            } else {
              // Countdown is already active, simply broadcast updated submission count
              broadcastRoom(room);
            }
            break;
          }

          case 'HOST_FORCE_END_ROUND': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.hostId !== meta.playerId) return;

            clearRoomCountdown(room);

            // Fill unsubmitted with empty
            for (const p of room.players.values()) {
              if (p.submittedAnswers === null) {
                p.submittedAnswers = {
                  name: '',
                  animal: '',
                  plant: '',
                  object: '',
                  country: '',
                };
              }
            }

            calculateRoundScores(room);
            room.stage = 'ROUND_RESULTS';
            broadcastRoom(room);
            break;
          }

          case 'HOST_ADJUST_SCORE': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.hostId !== meta.playerId) return;

            const { targetPlayerId, category, newPoints } = payload;
            const pScore = room.roundScores[targetPlayerId];
            const player = room.players.get(targetPlayerId);

            if (pScore && player && [0, 5, 10].includes(newPoints)) {
              const oldPoints = pScore.answers[category as CategoryKey]?.points || 0;
              const delta = newPoints - oldPoints;
              
              pScore.answers[category as CategoryKey].points = newPoints;
              pScore.answers[category as CategoryKey].status = 'MANUAL';
              pScore.answers[category as CategoryKey].reason = `تم التعديل بواسطة المالك (${newPoints > 0 ? '+' + newPoints : 0})`;
              
              pScore.roundTotal += delta;
              player.totalScore += delta;

              broadcastRoom(room);
            }
            break;
          }

          case 'HOST_NEXT_ROUND': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.hostId !== meta.playerId) return;

            clearRoomCountdown(room);

            // Check if someone reached target score
            const hasWinner = Array.from(room.players.values()).some(p => p.totalScore >= room.targetScore);
            if (hasWinner) {
              room.stage = 'GAME_OVER';
              broadcastRoom(room);
              return;
            }

            // Next round
            room.currentRound += 1;
            room.letterPickerIndex = (room.letterPickerIndex + 1) % (room.players.size || 1);
            room.currentLetter = null;
            room.stage = 'CHOOSING_LETTER';

            for (const p of room.players.values()) {
              p.submittedAnswers = null;
            }

            broadcastRoom(room);
            break;
          }

          case 'RESTART_GAME': {
            const meta = socketMetadata.get(ws);
            if (!meta) return;
            const room = rooms.get(meta.roomCode);
            if (!room || room.hostId !== meta.playerId) return;

            clearRoomCountdown(room);
            room.stage = 'LOBBY';
            room.currentRound = 1;
            room.letterPickerIndex = 0;
            room.currentLetter = null;
            room.usedLetters = [];
            room.roundScores = {};

            for (const p of room.players.values()) {
              p.totalScore = 0;
              p.submittedAnswers = null;
            }

            broadcastRoom(room);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      const meta = socketMetadata.get(ws);
      if (meta) {
        const room = rooms.get(meta.roomCode);
        if (room) {
          const player = room.players.get(meta.playerId);
          if (player) {
            player.ws = null;
            broadcastRoom(room);
          }
        }
      }
    });
  });

  // Serve static files in production, or mount Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Yalla Playing server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
