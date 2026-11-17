import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

const DEFAULT_DURATION_MS = 4000;

// No toast library in this app yet — this is intentionally tiny (one timed banner, no queue)
// rather than pulling in a dependency for what's so far a single use case (warning the user
// that leaving a live match doesn't pause/end it, match/[id]/lineup.tsx).
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = setTimeout(() => setMessage(null), DEFAULT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [message]);

  return { message, showToast: setMessage };
}

export function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      className="absolute left-6 right-6 top-20 z-50 items-center rounded-lg bg-black px-4 py-3"
    >
      <Text className="text-center text-sm font-bold text-white">{message}</Text>
    </View>
  );
}
