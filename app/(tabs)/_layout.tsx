import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar state={props.state as any} navigation={props.navigation as any} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="loans" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}
