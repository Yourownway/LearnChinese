import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import HanziWriter, { type CharacterData } from "hanzi-writer";

type Props = {
  char: string;
  size?: number;
};

async function loadCharacterDataOffline(_char: string): Promise<CharacterData> {
  // TODO: Implement offline data loader if offline support is required.
  throw new Error("Offline data loader not implemented");
}

export const StrokeFan: React.FC<Props> = ({ char, size = 80 }) => {
  const [strokes, setStrokes] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    HanziWriter.loadCharacterData(char)
      .then((data) => {
        if (mounted) setStrokes(data.strokes);
      })
      .catch(async () => {
        try {
          const offline = await loadCharacterDataOffline(char);
          if (mounted) setStrokes(offline.strokes);
        } catch {
          if (mounted) setStrokes([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [char]);

  if (strokes.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {strokes.map((_, index) => (
        <Svg key={index} width={size} height={size} viewBox="0 0 100 100">
          {strokes.slice(0, index + 1).map((d, i) => (
            <Path key={i} d={d} stroke="#000" strokeWidth={4} fill="none" />
          ))}
        </Svg>
      ))}
    </View>
  );
};

