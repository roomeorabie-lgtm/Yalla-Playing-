import { supabase, isSupabaseConfigured } from './supabase.ts';
import { 
  AnswersMap, 
  CategoryKey, 
  GameStage, 
  Player, 
  PlayerRoundScore, 
  RoomState 
} from '../types/game.ts';
import { checkStartsWithLetter, normalizeForComparison } from './arabic.ts';

const CATEGORIES: CategoryKey[] = ['name', 'animal', 'plant', 'object', 'country'];

export function calculateRoundScores(
  players: Player[], 
  submittedAnswers: Record<string, Record<CategoryKey, string>>, 
  targetLetter: string
): Record<string, PlayerRoundScore> {
  const scores: Record<string, PlayerRoundScore> = {};

  for (const p of players) {
    scores[p.id] = {
      playerId: p.id,
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

  for (const cat of CATEGORIES) {
    const wordMap = new Map<string, string[]>();

    for (const p of players) {
      const pAnswers = submittedAnswers[p.id];
      const rawAnswer = pAnswers ? (pAnswers[cat] || '').trim() : '';
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
        const pAns = submittedAnswers[pId];
        if (pAns) {
          scores[pId].answers[cat] = {
            answer: pAns[cat],
            points: 10,
            status: 'UNIQUE',
            reason: 'إجابة فريدة (+10)'
          };
        }
      } else {
        for (const pId of playerIds) {
          const pAns = submittedAnswers[pId];
          if (pAns) {
            const others = playerIds
              .filter(id => id !== pId)
              .map(id => players.find(x => x.id === id)?.name || 'لاعب');
            scores[pId].answers[cat] = {
              answer: pAns[cat],
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

  // Calculate round total
  for (const [pId, pScore] of Object.entries(scores)) {
    const rTotal = Object.values(pScore.answers).reduce((sum, a) => sum + a.points, 0);
    pScore.roundTotal = rTotal;
  }

  return scores;
}

export async function fetchFullSupabaseRoomState(roomCode: string): Promise<RoomState | null> {
  if (!supabase) return null;

  try {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', roomCode)
      .single();

    if (roomError || !roomData) {
      console.warn('Supabase room query error:', roomError);
      return null;
    }

    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_code', roomCode)
      .order('is_host', { ascending: false });

    if (playersError || !playersData) {
      console.warn('Supabase players query error:', playersError);
      return null;
    }

    const players: Player[] = playersData.map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.is_host,
      isConnected: p.is_connected,
      totalScore: p.total_score || 0,
      hasSubmitted: Boolean(p.submitted_answers)
    }));

    let winner: Player | null = null;
    const overTarget = players.filter(p => p.totalScore >= roomData.target_score);
    if (overTarget.length > 0) {
      winner = [...overTarget].sort((a, b) => b.totalScore - a.totalScore)[0];
    }

    const submissionsCount = players.filter(p => p.hasSubmitted).length;

    return {
      code: roomData.code,
      targetScore: roomData.target_score,
      stage: roomData.stage as GameStage,
      currentRound: roomData.current_round,
      hostId: roomData.host_id,
      letterPickerId: roomData.letter_picker_id || roomData.host_id,
      currentLetter: roomData.current_letter,
      usedLetters: roomData.used_letters || [],
      players,
      submissionsCount,
      totalActivePlayers: players.length,
      roundScores: roomData.round_scores || {},
      winner,
      countdownSeconds: roomData.countdown_seconds,
      firstSubmitterName: roomData.first_submitter_name,
    };
  } catch (err) {
    console.error('fetchFullSupabaseRoomState failed:', err);
    return null;
  }
}
