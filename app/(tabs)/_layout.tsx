import { useQueryClient } from '@tanstack/react-query';
import { router, Tabs } from 'expo-router';
import House from 'lucide-react-native/icons/house';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../../src/api/client';
import { useMe } from '../../src/hooks/useMe';
import { useAuthStore } from '../../src/stores/authStore';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  // Every screen in this group assumes a valid session (most directly render `useMe()` data).
  // `app/index.tsx`'s gate only checks that a refresh token exists in storage, not that it's
  // still valid server-side — a token that went bad after that check (expired, revoked, or a
  // failed refresh that didn't clear it because the failure was a network error rather than a
  // rejection, see `authStore.refreshSession`) would otherwise land here and render broken
  // "no user" screens (empty name/phone, blank-looking profile) instead of sending the person
  // back to log in.
  const { error: meError } = useMe();

  useEffect(() => {
    if (meError instanceof ApiError && meError.code === 'UNAUTHORIZED') {
      void logout().then(() => {
        queryClient.clear();
        router.replace('/(auth)/login');
      });
    }
  }, [meError, logout, queryClient]);

  // A floating/absolute tab bar doesn't get pushed up with the keyboard the way a normal
  // docked one does — it ends up stranded on top of it (FRONTEND_INSTRUCTIONS.md §9). Hiding
  // it while the keyboard is up is the standard fix. No-op on web — RN Web's Keyboard module
  // doesn't fire these events, but there's no on-screen keyboard overlap problem there either.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#047857', // emerald-700
        tabBarInactiveTintColor: '#6b7280', // gray-500
        // React Navigation's own style props, not className — the tab bar isn't a component
        // we render directly, so NativeWind has nothing to intercept here.
        tabBarStyle: {
          display: keyboardVisible ? 'none' : 'flex',
          position: 'absolute',
          bottom: insets.bottom + 16,
          left: 24,
          right: 24,
          height: 64,
          borderRadius: 999,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
