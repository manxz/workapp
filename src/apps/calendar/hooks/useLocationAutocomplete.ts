import { useState, useCallback, useRef, useEffect } from 'react';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export function useLocationAutocomplete() {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch predictions with debounce
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await response.json();
      setPredictions(data.predictions || []);
      setIsOpen(data.predictions?.length > 0);
    } catch (error) {
      console.error('[LocationAutocomplete] Error:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  }, [fetchPredictions]);

  // Select a prediction
  const selectPrediction = useCallback((prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    return prediction.description;
  }, []);

  // Close dropdown
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Reset state
  const reset = useCallback((initialValue: string = '') => {
    setQuery(initialValue);
    setPredictions([]);
    setIsOpen(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    predictions,
    isLoading,
    isOpen,
    handleInputChange,
    selectPrediction,
    close,
    reset,
  };
}



