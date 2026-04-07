"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStorage } from "@/lib/liveblocks/client";
import {
  useSubmitAnswer,
  useRequestHint,
  useActivatePowerup,
  useAdvanceToNext,
  useRevealAnswers,
  useRematch,
  useTickCountdown,
  useNextQuestion,
} from "@/lib/liveblocks/mutations";
import { getOrCreateGuest } from "@/lib/guest";
import { StatsCard } from "@/components/game/StatsCard";
import { PlayerGuessInput } from "@/components/game/PlayerGuessInput";
import { Scoreboard } from "@/components/game/Scoreboard";
import { PowerupBar } from "@/components/game/PowerupBar";
import { HintPanel } from "@/components/game/HintPanel";
import {
  Avatar,
  Button,
  GameLogo,
  TierBadge,
} from "@/components/design-system";
import { getAvatarUrl } from "@/lib/avatar";
import type {
  Player,
  PowerupType,
  HintType,
  Question,
  QuestionResult,
} from "@/types/game";
import { POWERUP_INITIAL_CHARGES } from "@/types/game";

interface PlayerPageProps {
  params: Promise<{ roomId: string; playerId: string }>;
}

export default function PlayerPage({ params: paramsPromise }: PlayerPageProps) {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [myId, setMyId] = useState("");

  const game = useStorage((root) => root.game);
  const submitAnswer = useSubmitAnswer();
  const requestHint = useRequestHint();
  const activatePowerup = useActivatePowerup();
  const advanceToNext = useAdvanceToNext();
  const revealAnswers = useRevealAnswers();
  const rematch = useRematch();
  const tickCountdown = useTickCountdown();
  const nextQuestion = useNextQuestion();

  useEffect(() => {
    paramsPromise.then(({ roomId, playerId }) => {
      setRoomId(roomId);
      setPlayerId(playerId);
    });
    const guest = getOrCreateGuest();
    setMyId(guest.id);
  }, [paramsPromise]);

  // ── Host-driven state machine (only runs on the host's device) ──────────────

  const isHost = game?.hostId === myId;
  const isBoss = game?.bossId === myId;
  const answeredCount = Object.keys(game?.answers ?? {}).length;

  // Countdown ticker
  useEffect(() => {
    if (!isHost || !game) return;
    if (game.command !== "starting" || game.countdownTime <= 0) return;
    const timer = setTimeout(() => tickCountdown(myId), 1000);
    return () => clearTimeout(timer);
  }, [isHost, game?.command, game?.countdownTime, myId, tickCountdown]);

  // Launch first question after countdown hits 0
  useEffect(() => {
    if (!isHost || !game) return;
    if (game.command !== "question") return;
    const sequence = (game.questionSequence as unknown as Question[]) ?? [];
    const nextIndex = (game.currentQuestionIndex ?? -1) + 1;
    if (nextIndex >= sequence.length) return;
    const nextQ = sequence[nextIndex];
    const choices = nextQ.choices ?? [];
    nextQuestion({ requesterId: myId, choices });
  }, [isHost, game?.command]);

  // Reveal when all connected players have answered
  useEffect(() => {
    if (!isHost || !game) return;
    if (game.command !== "answering") return;
    const allPlayers = (game.players as unknown as Player[]) ?? [];
    const connectedCount = allPlayers.filter((p) => p.isConnected).length;
    if (connectedCount > 0 && answeredCount >= connectedCount) {
      revealAnswers(myId);
    }
  }, [isHost, game?.command, answeredCount, myId, revealAnswers]);

  // Redirect everyone back to lobby when host triggers rematch
  useEffect(() => {
    if (!game || game.command !== "rematch") return;
    router.push(`/nhl-stats-master/${roomId}/lobby`);
  }, [game?.command]);

  // Save played question IDs to localStorage daily bucket when game finishes
  useEffect(() => {
    if (!game || game.command !== "finished") return;
    const played = (game.playedQuestions as unknown as Question[]) ?? [];
    if (played.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `nhl-played-${today}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    const merged = [...new Set([...existing, ...played.map((q) => q.id)])];
    localStorage.setItem(key, JSON.stringify(merged));
  }, [game?.command]);

  // Launch next question
  useEffect(() => {
    if (!isHost || !game) return;
    if (game.command !== "next") return;
    const sequence = (game.questionSequence as unknown as Question[]) ?? [];
    const nextIndex = (game.currentQuestionIndex ?? -1) + 1;
    if (nextIndex >= sequence.length) return;
    const nextQ = sequence[nextIndex];
    const choices = nextQ.choices ?? [];
    nextQuestion({ requesterId: myId, choices });
  }, [isHost, game?.command]);

  const isController = isHost || isBoss;

  const players = (game?.players as unknown as Player[]) ?? [];
  const me = players.find((p) => p.id === myId);
  const myRank =
    [...players]
      .sort((a, b) => b.score - a.score)
      .findIndex((p) => p.id === myId) + 1;

  const hasAnswered = myId
    ? !!(game?.answers as Record<string, string> | undefined)?.[myId]
    : false;
  const connectedPlayers = players.filter((p) => p.isConnected);

  const sharedHints = ((game?.hintsUsed as unknown as string[]) ??
    []) as HintType[];
  const myPowerupCharges: Record<PowerupType, number> = {
    eliminate:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]
        ?.eliminate ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.eliminate : 0),
    doubledown:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]
        ?.doubledown ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.doubledown : 0),
    freeze:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]
        ?.freeze ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.freeze : 0),
    extrahint:
      (game?.playerPowerups as Record<string, Record<string, number>>)?.[myId]
        ?.extrahint ??
      (game?.powerupsEnabled ? POWERUP_INITIAL_CHARGES.extrahint : 0),
  };

  function handleAnswer(answer: string) {
    if (!myId) return;
    submitAnswer({ playerId: myId, answer });
  }

  function handleHint(type: HintType) {
    requestHint({ hintType: type });
  }

  function handlePowerup(type: PowerupType) {
    if (!myId) return;
    activatePowerup({ playerId: myId, powerupType: type });
  }

  if (!game) return null;

  const currentQuestion = game.currentQuestion as unknown as Question | null;

  return (
    <main className="game-bg-pattern min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-game-card-border bg-game-bg/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <GameLogo className="text-lg" />
        {me && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-bold text-sm tabular-nums">
                {me.score} pts
              </div>
              <div className="text-xs text-game-text-muted">Rank #{myRank}</div>
            </div>
            <Avatar url={getAvatarUrl(me.id)} name={me.name} size={36} />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 max-w-lg mx-auto w-full ">
        {/* Game state: idle/lobby */}
        {game.command === "idle" && (
          <div className="text-center py-16">
            <p className="text-game-text-muted text-lg">
              Waiting for the game to start…
            </p>
          </div>
        )}

        {/* Countdown */}
        <AnimatePresence>
          {game.command === "starting" && (
            <motion.div
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="text-[30vw] font-bold text-black tabular-nums">
                {game.countdownTime || "🏒"}
              </div>
              <p className="text-game-text-muted uppercase tracking-widest">
                Get ready!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active question */}
        <AnimatePresence mode="wait">
          {(game.command === "answering" || game.command === "revealing") &&
            currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 bg-white p-8 border-8 border-black"
              >
                {/* Question header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 justify-between w-full">
                    <span className="text-xs text-game-text-muted">
                      Q {(game.currentQuestionIndex ?? 0) + 1}/
                      {game.questionCount}
                    </span>
                    <TierBadge tier={currentQuestion.difficulty} />
                  </div>
                </div>

                {/* Stats card */}
                <StatsCard
                  question={currentQuestion}
                  revealedColumns={game.revealedColumns ?? 0}
                />

                {/* Reveal: answer result */}
                {game.command === "revealing" &&
                  (() => {
                    const history =
                      (game.questionHistory as unknown as QuestionResult[]) ??
                      [];
                    const latestResult =
                      history.length > 0 ? history[history.length - 1] : null;
                    const myResult = latestResult?.playerAnswers?.[myId];
                    const isCorrect = myResult?.correct ?? false;
                    const pointsEarned = myResult?.points ?? 0;
                    const color = hasAnswered
                      ? isCorrect
                        ? "bg-lime text-black"
                        : "bg-game-red text-white"
                      : "bg-yellow text-black";

                    // Calculate rank change
                    const prevScores = players.map((p) => {
                      const pts =
                        latestResult?.playerAnswers?.[p.id]?.points ?? 0;
                      return { id: p.id, prevScore: p.score - pts };
                    });
                    prevScores.sort((a, b) => b.prevScore - a.prevScore);
                    const prevRank =
                      prevScores.findIndex((p) => p.id === myId) + 1;
                    const currentRank = myRank;

                    let rankMessage = null;
                    if (currentRank < prevRank && prevRank > 0) {
                      if (currentRank === 1)
                        rankMessage = "You took top spot! 🥇";
                      else rankMessage = `Moved up to #${currentRank}! 📈`;
                    } else if (currentRank > prevRank && prevRank > 0) {
                      rankMessage = `Dropped to #${currentRank} 📉`;
                    } else if (
                      currentRank === 1 &&
                      prevRank === 1 &&
                      history.length > 1
                    ) {
                      rankMessage = "Holding onto #1! 🛡️";
                    }

                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`${color} border-8 border-black p-6 text-center shadow-[12px_12px_0_#000] rotate-[1deg] my-4`}
                      >
                        {hasAnswered ? (
                          <>
                            <h2 className="text-5xl font-display font-bold uppercase mb-2 mt-2">
                              {isCorrect
                                ? "Nailed It! 🔥"
                                : "Oof, Incorrect! 🧊"}
                            </h2>
                            <p className="font-mono font-bold mb-2">
                              {isCorrect
                                ? `Amazing! You earned +${pointsEarned} Pts.`
                                : "Tough luck, better try again next round."}
                            </p>
                            {rankMessage && (
                              <p className="inline-block bg-black text-white font-bold uppercase tracking-widest text-sm px-3 py-1 mb-2 transform -rotate-1 shadow-[2px_2px_0_rgba(0,0,0,0.5)] border border-white/20">
                                {rankMessage}
                              </p>
                            )}
                          </>
                        ) : (
                          <h2 className="text-4xl font-display font-bold uppercase mb-2 mt-2">
                            Time's Up! ⏱️
                          </h2>
                        )}

                        <div className="bg-white border-4 border-black p-4 rotate-[-1deg] shadow-[4px_4px_0_#000] my-6">
                          <p className="text-black/80 font-bold text-xs uppercase tracking-widest mb-1">
                            The Correct Answer Was
                          </p>
                          <h3 className="text-4xl font-display font-bold text-black uppercase">
                            {currentQuestion.firstName}{" "}
                            {currentQuestion.lastName}
                          </h3>
                        </div>

                        {hasAnswered && (
                          <p className="text-sm mt-4 font-bold">
                            Your answer:{" "}
                            <span className="bg-black text-white px-3 py-1 font-mono mx-2">
                              {myResult?.answer || "—"}
                            </span>
                          </p>
                        )}

                        {isController && (
                          <Button
                            variant={isCorrect ? "secondary" : "primary"}
                            size="lg"
                            className="mt-6 w-full shadow-[4px_4px_0_#000] border-4"
                            onClick={() => advanceToNext(myId)}
                          >
                            Next Question →
                          </Button>
                        )}
                      </motion.div>
                    );
                  })()}

                {/* Answer input */}
                {game.command === "answering" && (
                  <div className="space-y-4">
                    <PlayerGuessInput
                      answerMode={game.answerMode}
                      choices={(game.choices as unknown as string[]) ?? []}
                      eliminatedChoices={
                        (game.eliminatedChoices as unknown as string[]) ?? []
                      }
                      hasAnswered={hasAnswered}
                      answeredCount={answeredCount}
                      totalPlayers={connectedPlayers.length}
                      onSubmit={handleAnswer}
                    />

                    {/* Hints */}
                    {game.hintsEnabled && (
                      <HintPanel
                        question={currentQuestion}
                        usedHints={sharedHints}
                        hintsEnabled={game.hintsEnabled}
                        onRequestHint={handleHint}
                      />
                    )}

                    {/* Powerups */}
                    {game.powerupsEnabled && (
                      <div className="pt-2">
                        <p className="text-xs text-game-text-muted uppercase tracking-widest mb-2 text-center">
                          Powerups
                        </p>
                        <PowerupBar
                          charges={myPowerupCharges}
                          answerMode={game.answerMode}
                          revealMode={game.revealMode}
                          command={game.command}
                          onActivate={handlePowerup}
                        />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
        </AnimatePresence>

        {/* Boss controls */}
        {isController && game.command === "answering" && (
          <div className="border-t border-game-card-border pt-4 space-y-2">
            <p className="text-xs text-game-red uppercase tracking-widest text-center font-bold">
              {isBoss ? "Boss Controls" : "Host Controls"}
            </p>
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => revealAnswers(myId)}
            >
              ⏭ Reveal Answers Now
            </Button>
          </div>
        )}

        {/* Game finished */}
        <AnimatePresence>
          {game.command === "finished" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 bg-white p-8 border-4 border-black"
            >
              <div className="text-center py-4">
                <div className="text-6xl mb-3">🏆</div>
                <h2 className="text-3xl font-bold uppercase tracking-widest text-game-gold">
                  Game Over!
                </h2>
              </div>

              <Scoreboard players={players} variant="final" myId={myId} />

              {/* Question history */}
              <QuestionHistory
                history={
                  (game.questionHistory as unknown as QuestionResult[]) ?? []
                }
                players={players}
                myId={myId}
              />

              {isController && (
                <div className="space-y-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => rematch(myId)}
                  >
                    🔁 Play Again
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() =>
                      router.push(`/nhl-stats-master/${roomId}/setup`)
                    }
                  >
                    Change Settings
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// ─── Question History ─────────────────────────────────────────────────────────

function QuestionHistory({
  history,
  players,
  myId,
}: {
  history: QuestionResult[];
  players: Player[];
  myId: string;
}) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-game-text-muted">
        Round Recap
      </p>
      {history.map((entry, i) => {
        const q = entry.question;
        return (
          <div
            key={q.id}
            className="bg-game-card-dark border border-game-card-border rounded-xl p-4 space-y-3"
          >
            {/* Question header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-game-text-muted mr-2">
                  Q{i + 1}
                </span>
                <span className="font-bold text-black">
                  {q.firstName} {q.lastName}
                </span>
                <span className="text-xs text-game-text-muted ml-2">
                  {q.season} · {q.teamAbbrevs} · {q.points} pts
                </span>
              </div>
            </div>

            {/* Player results */}
            <div className="space-y-1">
              {players.map((player) => {
                const result = entry.playerAnswers[player.id];
                if (!result) return null;
                const isMe = player.id === myId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 text-sm rounded-lg px-3 py-1.5 ${
                      isMe ? "bg-ice-blue/10 border border-ice-blue/20" : ""
                    }`}
                  >
                    <span
                      className={`text-base ${result.correct ? "text-game-accent-4" : "text-game-red"}`}
                    >
                      {result.correct ? "✓" : "✗"}
                    </span>
                    <span className="flex-1 font-medium truncate">
                      {player.name}
                    </span>
                    <span className="text-game-text-muted truncate max-w-[120px] text-xs">
                      {result.answer || "—"}
                    </span>
                    <span
                      className={`font-bold tabular-nums ${
                        result.points > 0
                          ? "text-game-gold"
                          : result.points < 0
                            ? "text-game-red"
                            : "text-game-text-muted"
                      }`}
                    >
                      {result.points > 0 ? `+${result.points}` : result.points}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
