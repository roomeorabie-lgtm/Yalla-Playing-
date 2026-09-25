import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Player, RoomState, AnswersMap, CategoryKey } from '../types/game.ts';

// 1. Check environment variables first, then stored user config if any
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('yalla_supabase_url') || '' : '';
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('yalla_supabase_key') || '' : '';

const activeUrl = storedUrl || envUrl;
const activeKey = storedKey || envKey;

export const isSupabaseConfigured = Boolean(
  activeUrl && 
  activeKey && 
  !activeUrl.includes('your-project') &&
  !activeKey.includes('your-anon-key') &&
  activeUrl.startsWith('https://')
);

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    clientInstance = createClient(activeUrl, activeKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log('✅ Supabase Client initialized successfully for URL:', activeUrl);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase Client:', err);
  }
} else {
  console.log('ℹ️ Running with Built-in Realtime Server (Express + SSE + WebSockets). Supabase URL/Key not configured.');
}

export const supabase = clientInstance;

export function getActiveSupabaseCredentials() {
  return {
    url: activeUrl,
    key: activeKey,
    isConfigured: isSupabaseConfigured,
  };
}

export function setCustomSupabaseCredentials(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('yalla_supabase_url', url.trim());
    localStorage.setItem('yalla_supabase_key', key.trim());
    window.location.reload();
  }
}

/**
 * Creates room in Supabase if configured
 */
export async function supabaseCreateRoom(
  roomCode: string, 
  hostPlayer: Player, 
  targetScore: number
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true }; // Supabase not configured, handled by server

  try {
    const { error: roomError } = await supabase
      .from('rooms')
      .insert({
        code: roomCode,
        target_score: targetScore,
        stage: 'LOBBY',
        current_round: 1,
        host_id: hostPlayer.id,
        letter_picker_id: hostPlayer.id,
        used_letters: [],
        created_at: new Date().toISOString(),
      });

    if (roomError) {
      console.warn('⚠️ Supabase room insert notice (will use primary backend):', roomError);
      return { success: false, error: roomError.message };
    }

    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: hostPlayer.id,
        room_code: roomCode,
        name: hostPlayer.name,
        avatar: hostPlayer.avatar,
        is_host: true,
        total_score: 0,
        is_connected: true,
      });

    if (playerError) {
      console.warn('⚠️ Supabase player insert notice:', playerError);
    }

    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Supabase createRoom exception:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Inserts player to Supabase room if configured
 */
export async function supabaseJoinRoom(
  roomCode: string, 
  player: Player
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase
      .from('players')
      .upsert({
        id: player.id,
        room_code: roomCode,
        name: player.name,
        avatar: player.avatar,
        is_host: player.isHost,
        total_score: player.totalScore,
        is_connected: true,
      });

    if (error) {
      console.warn('⚠️ Supabase joinRoom notice:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('⚠️ Supabase joinRoom exception:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Submits player answers to Supabase if configured
 */
export async function supabaseSubmitAnswers(
  roomCode: string,
  playerId: string,
  roundNumber: number,
  answers: AnswersMap
): Promise<void> {
  if (!supabase) return;

  try {
    const rows = (Object.keys(answers) as CategoryKey[]).map((cat) => ({
      room_code: roomCode,
      player_id: playerId,
      round_number: roundNumber,
      category: cat,
      answer: answers[cat],
      points: 0,
    }));

    await supabase.from('answers').insert(rows);
  } catch (err) {
    console.warn('⚠️ Supabase submit answers notice:', err);
  }
}
