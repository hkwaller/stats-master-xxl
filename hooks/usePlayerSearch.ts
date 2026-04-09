"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UsePlayerSearchOptions {
  value: string;
  setValue: (name: string) => void;
  onSubmit: (name: string) => void;
}

interface UsePlayerSearchResult {
  suggestions: string[];
  showSuggestions: boolean;
  activeIndex: number;
  setShowSuggestions: (show: boolean) => void;
  handleChange: (newValue: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSuggestionPick: (name: string) => void;
  handleFocus: () => void;
  handleBlur: () => void;
}

export function usePlayerSearch({
  value,
  setValue,
  onSubmit,
}: UsePlayerSearchOptions): UsePlayerSearchResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/players/search?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { names: string[] };
        setSuggestions(data.names.slice(0, 8));
        setActiveIndex(-1);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  function handleChange(newValue: string) {
    setValue(newValue);
    setShowSuggestions(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, suggestions.length - 1);
        if (suggestions[next]) setValue(suggestions[next]);
        return next;
      });
      setShowSuggestions(true);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, -1);
        if (next >= 0 && suggestions[next]) setValue(suggestions[next]);
        return next;
      });
      return;
    }

    if (e.key === "Tab" && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      const pick = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      setValue(pick);
      setShowSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    if (e.key === "Enter") {
      if (showSuggestions && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        const pick = suggestions[activeIndex];
        setShowSuggestions(false);
        setActiveIndex(-1);
        onSubmit(pick);
      } else {
        setShowSuggestions(false);
        onSubmit(value.trim());
      }
      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  function handleSuggestionPick(name: string) {
    setShowSuggestions(false);
    setActiveIndex(-1);
    onSubmit(name);
  }

  function handleFocus() {
    if (suggestions.length > 0) setShowSuggestions(true);
  }

  function handleBlur() {
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }, 150);
  }

  return {
    suggestions,
    showSuggestions,
    activeIndex,
    setShowSuggestions,
    handleChange,
    handleKeyDown,
    handleSuggestionPick,
    handleFocus,
    handleBlur,
  };
}
