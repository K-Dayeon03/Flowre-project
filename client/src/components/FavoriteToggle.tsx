import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { FavoriteTargetType } from '../api/favoriteApi';
import { useFavoriteStore } from '../store/useFavoriteStore';

interface FavoriteToggleProps {
  targetType: FavoriteTargetType;
  targetId?: number;
  targetKey?: string;
  label?: string;
}

/** 상세 화면 헤더에서 즐겨찾기 추가/삭제를 토글합니다. */
export default function FavoriteToggle({ targetType, targetId, targetKey, label }: FavoriteToggleProps) {
  const favorites = useFavoriteStore((s) => s.favorites);
  const fetchFavorites = useFavoriteStore((s) => s.fetchFavorites);
  const add = useFavoriteStore((s) => s.add);
  const remove = useFavoriteStore((s) => s.remove);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const favorite = useMemo(
    () => favorites.find((item) => {
      if (item.targetType !== targetType) return false;
      if (targetId != null && item.targetId === targetId) return true;
      if (targetKey && item.targetKey === targetKey) return true;
      return false;
    }),
    [favorites, targetId, targetKey, targetType]
  );

  const handlePress = async () => {
    if (pending) return;
    setPending(true);
    try {
      if (favorite) {
        await remove(favorite.id);
      } else {
        await add({ targetType, targetId, targetKey, label });
      }
    } catch {
      // 즐겨찾기 실패는 상세 화면 사용을 막지 않는다.
    } finally {
      setPending(false);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} disabled={pending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={[styles.icon, favorite && styles.iconActive]}>{favorite ? '★' : '☆'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  icon: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: '900',
  },
  iconActive: {
    color: Colors.warning,
  },
});
