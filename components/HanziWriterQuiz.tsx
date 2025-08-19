import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';

interface Props {
  char: string;
  onComplete?: () => void;
}

export function HanziWriterQuiz({ char, onComplete }: Props) {
  const html = useMemo(() => {
    return `\n<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset=\"utf-8\" />\n    <style>html,body,#target{margin:0;padding:0;height:100%;display:flex;justify-content:center;align-items:center;background-color:transparent;}</style>\n    <script src=\"https://cdn.jsdelivr.net/npm/hanzi-writer@2.2.2/dist/hanzi-writer.min.js\"></script>\n  </head>\n  <body>\n    <div id=\"target\"></div>\n    <script>\n      var writer = HanziWriter.create('target', ${JSON.stringify(char)}, {\n        width: 300,\n        height: 300,\n        showCharacter: false,\n        showOutline: false,\n        showHintAfterMisses: 1,\n        highlightOnComplete: false,\n        padding: 5\n      });\n      writer.quiz({\n        onComplete: function() {\n          window.ReactNativeWebView.postMessage('complete');\n        }\n      });\n    </script>\n  </body>\n</html>`;
  }, [char]);

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={(e) => {
        if (e.nativeEvent.data === 'complete') {
          onComplete?.();
        }
      }}
      style={{ backgroundColor: 'transparent' }}
    />
  );
}
