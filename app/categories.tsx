import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GhostButton } from '@/components/GhostButton';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';

export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const transactions = useAppStore((s) => s.transactions);
  const addCategory = useAppStore((s) => s.addCategory);
  const renameCategory = useAppStore((s) => s.renameCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const toast = useToastStore((s) => s.show);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newName, setNewName] = useState('');

  function usageCount(name: string) {
    return transactions.filter((t) => t.category === name).length;
  }

  function startEdit(name: string) {
    setEditing(name);
    setDraft(name);
  }

  function saveEdit(oldName: string) {
    renameCategory(oldName, draft);
    setEditing(null);
  }

  function remove(name: string) {
    const used = usageCount(name);
    if (used > 0) {
      toast(`${used} transaction${used === 1 ? '' : 's'} still use${used === 1 ? 's' : ''} "${name}" — rename it instead`);
      return;
    }
    deleteCategory(name);
    toast('Category removed');
  }

  function addNew() {
    if (!newName.trim()) return;
    if (settings.categories.some((c) => c.toLowerCase() === newName.trim().toLowerCase())) {
      toast('That category already exists');
      return;
    }
    addCategory(newName);
    setNewName('');
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">Categories</AppText>
      </View>

      <GlassCard padding={4}>
        {settings.categories.map((name, i) => (
          <View
            key={name}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: theme.line,
            }}
          >
            {editing === name ? (
              <>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  autoFocus
                  style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 12, padding: 10, color: theme.ink, fontSize: 13.5 }}
                />
                <Pressable onPress={() => saveEdit(name)} hitSlop={8}>
                  <AppText variant="body" color={theme.accentColor}>
                    Save
                  </AppText>
                </Pressable>
                <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                  <AppText variant="body2">Cancel</AppText>
                </Pressable>
              </>
            ) : (
              <>
                <AppText variant="body" style={{ flex: 1 }}>
                  {name}
                </AppText>
                <Pressable onPress={() => startEdit(name)} hitSlop={8}>
                  <AppText variant="body2">Rename</AppText>
                </Pressable>
                <Pressable onPress={() => remove(name)} hitSlop={8}>
                  <AppText variant="body2" color={theme.tone('neg')}>
                    Delete
                  </AppText>
                </Pressable>
              </>
            )}
          </View>
        ))}
      </GlassCard>

      <GlassCard>
        <AppText variant="label" style={{ marginBottom: 8 }}>
          Add a category
        </AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Subscriptions"
            placeholderTextColor={theme.ink3}
            style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 12, color: theme.ink, fontSize: 13.5 }}
          />
          <GhostButton label="Add" onPress={addNew} />
        </View>
      </GlassCard>
    </Screen>
  );
}
