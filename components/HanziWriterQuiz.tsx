import React, { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  char: string;
  onComplete?: () => void;
  zoom?: number; // ✅ facteur de zoom (2 = canvas 2x plus grand que WebView)
}

export function HanziWriterQuiz({ char, onComplete, zoom = 3 }: Props) {
  const { width } = useWindowDimensions();

  // taille visible de la WebView
  const displaySize = Math.min(width * 0.9, 350);

  // taille interne du canvas (plus grande = zone tactile plus souple)
  const internalSize = displaySize * zoom;

  const html = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body {
            margin:0;
            padding:0;
            height:100%;
            width:100%;
            display:flex;
            justify-content:center;
            align-items:center;
            background-color:transparent;
            overflow:hidden;
          }
          #target {
            width:${internalSize}px;
            height:${internalSize}px;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/hanzi-writer@2.2.2/dist/hanzi-writer.min.js"></script>
      </head>
      <body>
        <div id="target"></div>
        <script>
          var writer = HanziWriter.create('target', ${JSON.stringify(char)}, {
            width: ${internalSize},
            height: ${internalSize},
            showCharacter: false,
            showOutline: true,
            showHintAfterMisses: 1,
            highlightOnComplete: false,
            padding: 0
          });
          writer.quiz({
            onComplete: function() {
              window.ReactNativeWebView.postMessage('complete');
            }
          });
        </script>
      </body>
    </html>
  `,
    [char, internalSize]
  );

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={(e) => {
        if (e.nativeEvent.data === "complete") onComplete?.();
      }}
      scrollEnabled={false}
      style={{
        backgroundColor: "transparent",
        width: displaySize,   // affichage plus petit
        height: displaySize,  // carré centré
        alignSelf: "center"
      }}
    />
  );
}
