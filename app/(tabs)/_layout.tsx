import { Tabs } from 'expo-router';

// The bottom nav bar is rendered once, globally, in the root layout (so it's
// present on every screen, not just these four) — this navigator supplies no
// tab bar UI of its own.
export default function TabsLayout() {
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="loans" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}
