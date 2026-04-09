"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BuzzInButtonProps {
  playerId: string;
  buzzedInPlayerId: string;    // '' if nobody
  lockedOutPlayers: string[];
  onBuzzIn: () => void;
  onSubmitAnswer: (answer: string) => void;
}

export function BuzzInButton({
  playerId,
  buzzedInPlayerId,
  lockedOutPlayers,
  onBuzzIn,
  onSubmitAnswer,
}: BuzzInButtonProps) {
  const isLockedOut = lockedOutPlayers.includes(playerId);
  const isBuzzed = buzzedInPlayerId === playerId;
  const someoneElseBuzzed = buzzedInPlayerId !== "" && buzzedInPlayerId !== playerId;

  const [answer, setAnswer] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when this player buzzes in
  useEffect(() => {
    if (isBuzzed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isBuzzed]);

  // Clear answer when buzz state resets
  useEffect(() => {
    if (!isBuzzed) {
      setAnswer("");
      setSuggestions([]);
    }
  }, [isBuzzed]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = (await res.json()) as { names: string[] };
        setSuggestions(data.names.slice(0, 8));
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(answer), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answer, fetchSuggestions]);

  function handleSubmit() {
    if (!answer.trim()) return;
    onSubmitAnswer(answer.trim());
    setShowSuggestions(false);
  }

  function handleSuggestionPick(name: string) {
    setAnswer(name);
    setShowSuggestions(false);
    onSubmitAnswer(name);
  }

  if (isLockedOut) {
    return (
      <div className="bg-game-red/10 border-4 border-game-red text-center py-6 px-4">
        <p className="text-game-red font-bold text-lg uppercase tracking-widest">
          Locked Out
        </p>
        <p className="text-game-red/70 text-sm mt-1">
          Wrong guess — watch the remaining reveals
        </p>
      </div>
    );
  }

  if (someoneElseBuzzed) {
    return (
      <div className="bg-yellow/20 border-4 border-yellow text-center py-6 px-4">
        <p className="text-black font-bold text-lg uppercase tracking-widest">
          Someone else buzzed in
        </p>
        <p className="text-black/70 text-sm mt-1">Stand by…</p>
      </div>
    );
  }

  if (isBuzzed) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-3"
      >
        <div className="bg-yellow border-4 border-black text-center py-3 px-4">
          <p className="font-bold text-black uppercase tracking-widest">
            You buzzed in! Type the player name:
          </p>
        </div>

        <div className="relative">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setShowSuggestions(false);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Type a player name…"
              autoComplete="off"
              className="
                flex-1 bg-white border-4 border-black
                px-4 py-3 text-black font-bold text-lg placeholder-black/40
                focus:outline-none focus:border-yellow transition-colors
                shadow-[4px_4px_0_#000]
              "
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="
                bg-black text-white font-bold px-5 py-3 border-4 border-black
                shadow-[4px_4px_0_#555] uppercase tracking-wide
                hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed
                transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              "
            >
              Submit
            </button>
          </div>

          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border-4 border-black shadow-[4px_4px_0_#000] overflow-hidden"
              >
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onMouseDown={() => handleSuggestionPick(name)}
                    className="w-full text-left px-4 py-3 hover:bg-yellow font-semibold text-black text-sm border-b border-black/10 last:border-b-0 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Default: buzz-in button — fixed to bottom of screen
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-safe bg-game-bg/90 backdrop-blur-sm border-t-4 border-black">
      <motion.button
        onClick={onBuzzIn}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className="
          w-full py-5 text-center font-bold text-2xl uppercase tracking-widest
          bg-cyan border-8 border-black shadow-[8px_8px_0_#000]
          text-black
          transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
        "
      >
        🚨 Buzz In!
      </motion.button>
    </div>
  );
}
