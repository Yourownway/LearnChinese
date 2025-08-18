import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Path } from "react-native-svg";

import { getStrokePaths } from "@/lib/strokes";

type Props = {
  hanzi: string;
  size?: number;
  strokeColor?: string;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function StrokeAnimator({ hanzi, size = 120, strokeColor = "#000" }: Props) {
  const strokes = getStrokePaths(hanzi);
  const animValues = useRef(strokes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    const animations = animValues.map((v, i) =>
      Animated.timing(v, {
        toValue: 0,
        duration: 500,
        delay: i * 300,
        useNativeDriver: true,
      })
    );
    Animated.stagger(150, animations).start();
  }, [animValues]);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {strokes.map((segments, i) => {
        const d = segments.join(" ");
        const dashOffset = animValues[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, 100],
        });
        return (
          <AnimatedPath
            key={i}
            d={d}
            stroke={strokeColor}
            strokeWidth={4}
            fill="none"
            strokeDasharray="100"
            strokeDashoffset={dashOffset}
          />
        );
      })}
    </Svg>
  );
}
