"use client";

import { useState, useCallback, useRef } from 'react';
import { UserSummary } from '../types';
import { searchUsers } from '../api/calendarApi';

/**
 * Hook for searching and selecting participants
 * 
 * Provides debounced search with async loading.
 */
export function useParticipantSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    setQuery(searchQuery);
    
    if (searchQuery.length === 0) {
      // Show default results immediately on empty query
      setLoading(true);
      try {
        const data = await searchUsers('');
        setResults(data);
      } catch (err) {
        console.error('Error searching users:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Debounce actual search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchUsers(searchQuery);
        setResults(data);
      } catch (err) {
        console.error('Error searching users:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, []);

  const openPicker = useCallback(() => {
    setIsOpen(true);
    // Load initial results
    search('');
  }, [search]);

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    search('');
  }, [search]);

  return {
    query,
    results,
    loading,
    isOpen,
    search,
    openPicker,
    closePicker,
    clearSearch,
  };
}

