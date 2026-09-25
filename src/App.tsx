/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket.ts';
import { Header } from './components/Header.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { CreateRoomModal } from './components/CreateRoomModal.tsx';
import { JoinRoomModal } from './components/JoinRoomModal.tsx';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { ChoosingLetterScreen } from './components/ChoosingLetterScreen.tsx';
import { PlayingScreen } from './components/PlayingScreen.tsx';
import { RoundResultsScreen } from './components/RoundResultsScreen.tsx';
import { GameOverScreen } from './components/GameOverScreen.tsx';
import { SupabaseConfigModal } from './components/SupabaseConfigModal.tsx';
import { sounds } from './utils/sound.ts';
import { WifiOff, AlertTriangle } from 'lucide-react';

export default function App() {
  const {
    roomState,
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
    checkHealth,
  } = useGameSocket();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [invitedRoomCode, setInvitedRoomCode] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Check URL parameters for direct room join links (e.g. ?room=4827)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code && code.trim().length === 4) {
      setInvitedRoomCode(code.trim());
      // If not already in room, open quick join automatically
      if (!roomState) {
        setIsJoinOpen(true);
      }
    }
  }, [roomState]);

  const handleCreateRoom = (name: string, avatar: string, targetScore: 150 | 250 | 450) => {
    createRoom(name, avatar, targetScore);
    setIsCreateOpen(false);
  };

  const handleJoinRoom = (code: string, name: string, avatar: string) => {
    joinRoom(code, name, avatar);
    setIsJoinOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9] text-[#2C243B] font-['Tajawal',sans-serif]">
      {/* Header */}
      <Header
        roomState={roomState}
        onLeaveRoom={leaveRoom}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
      />

      {/* Disconnection Warning if server is unreachable */}
      {!isConnected && (
        <div className="w-full bg-rose-600 text-white text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-3">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت أو الضغط لإعادة المحاولة.</span>
          <button
            onClick={() => checkHealth()}
            className="bg-white text-rose-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-50 cursor-pointer shadow-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="max-w-md mx-auto mt-4 px-4 w-full">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-4">
        {!roomState ? (
          <HomeScreen
            onCreateRoomClick={() => {
              sounds.playPop();
              setIsCreateOpen(true);
            }}
            onQuickJoinClick={() => {
              sounds.playPop();
              setIsJoinOpen(true);
            }}
            invitedRoomCode={invitedRoomCode}
          />
        ) : roomState.stage === 'LOBBY' ? (
          <LobbyScreen
            roomState={roomState}
            playerId={playerId}
            isHost={isHost}
            onStartGame={startGame}
          />
        ) : roomState.stage === 'CHOOSING_LETTER' ? (
          <ChoosingLetterScreen
            roomState={roomState}
            playerId={playerId}
            onSelectLetter={selectLetter}
          />
        ) : roomState.stage === 'PLAYING' ? (
          <PlayingScreen
            roomState={roomState}
            playerId={playerId}
            isHost={isHost}
            onSubmitAnswers={submitAnswers}
            onForceEndRound={hostForceEndRound}
          />
        ) : roomState.stage === 'ROUND_RESULTS' ? (
          <RoundResultsScreen
            roomState={roomState}
            playerId={playerId}
            isHost={isHost}
            onNextRound={hostNextRound}
            onAdjustScore={hostAdjustScore}
          />
        ) : roomState.stage === 'GAME_OVER' ? (
          <GameOverScreen
            roomState={roomState}
            isHost={isHost}
            onRestartGame={restartGame}
            onLeaveRoom={leaveRoom}
          />
        ) : null}
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateRoom}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoin={handleJoinRoom}
        initialRoomCode={invitedRoomCode}
        serverError={errorMessage}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}
