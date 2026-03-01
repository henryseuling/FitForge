import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.elevated,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  return (
    <View style={{ marginHorizontal: 20, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
      <Skeleton width="60%" height={16} borderRadius={4} />
      <Skeleton width="100%" height={12} borderRadius={4} />
      <Skeleton width="80%" height={12} borderRadius={4} />
    </View>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ marginHorizontal: 20, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton width={32} height={32} borderRadius={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="50%" height={14} borderRadius={4} />
            <Skeleton width="30%" height={10} borderRadius={4} />
          </View>
          <Skeleton width={48} height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}
