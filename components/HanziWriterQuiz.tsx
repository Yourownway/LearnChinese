import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';

interface Props {
  char: string;
  showOutline?: boolean;
  showHintAfterMisses?: number;
  maxMistakes?: number;
  onComplete?: () => void;
  onFail?: () => void;
}

export function HanziWriterQuiz({
  char,
  showOutline = true,
  showHintAfterMisses = 3,
  maxMistakes,
  onComplete,
  onFail,
}: Props) {
  const html = useMemo(() => {
    return `\n<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"utf-8\" />\n    <style>html,body,#target{margin:0;padding:0;height:100%;display:flex;justify-content:center;align-items:center;background-color:transparent;}</style>\n    <script src=\"https://cdn.jsdelivr.net/npm/hanzi-writer@2.2.2/dist/hanzi-writer.min.js\"></script>\n  </head>\n  <body>\n    <div id=\"target\"></div>\n    <script>\n      var misses = 0;\n      var maxMistakes = ${maxMistakes ?? 'null'};\n      var writer = HanziWriter.create('target', ${JSON.stringify(char)}, {\n        width: 300,\n        height: 300,\n        showCharacter: false,\n        showOutline: ${showOutline},\n        showHintAfterMisses: ${showHintAfterMisses},\n        highlightOnComplete: false,\n        padding: 5\n      });\n      writer.quiz({\n        onMistake: function() {\n          misses++;\n          if (maxMistakes && misses >= maxMistakes) {\n            window.ReactNativeWebView.postMessage('fail');\n          }\n        },\n        onComplete: function() {\n          window.ReactNativeWebView.postMessage('complete');\n        }\n      });\n    </script>\n  </body>\n</html>`;
  }, [char, showOutline, showHintAfterMisses, maxMistakes]);

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={(e) => {
        if (e.nativeEvent.data === 'complete') {
          onComplete?.();
        } else if (e.nativeEvent.data === 'fail') {
          onFail?.();
        }
      }}
      style={{ backgroundColor: 'transparent' }}
    />
  );
}
