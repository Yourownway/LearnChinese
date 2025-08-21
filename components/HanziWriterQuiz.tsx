import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  char: string;
  // Options d’affichage / zoom
  zoom?: number;                               // facteur de zoom interne
  showGrid?: "none" | "book" | "square";       // fond : cahier, carreaux, rien
  // Options de quiz
  showOutline?: boolean;                       // silhouette grise
  showHintAfterMisses?: number;                // aide après N erreurs
  maxMistakes?: number;                        // échec au-delà de N erreurs
  // Callbacks (callback = fonction de rappel)
  onComplete?: () => void;
  onFail?: () => void;
}

export interface HanziWriterQuizHandle {
  showSolution: () => void;
  restart: () => void;
}

function HanziWriterQuizInner(
  {
    char,
    // défauts “agréables” à l’usage
    zoom = 2.7,
    showGrid = "book",
    showOutline = true,
    showHintAfterMisses = 3,
    maxMistakes,
    onComplete,
    onFail,
  }: Props,
  ref: React.Ref<HanziWriterQuizHandle>,
) {
  const { width } = useWindowDimensions();
  const webRef = useRef<WebView>(null);

  // Taille visible (responsive = mise en page adaptative)
  const displaySize = Math.min(width * 0.9, 350);
  // Canvas interne plus grand pour un tracé confortable
  const internalSize = displaySize * zoom;

  // SVG de fond selon showGrid
  const gridSvg = useMemo(() => {
    if (showGrid === "book") {
      return `
        <rect x="0" y="0" width="${internalSize}" height="${internalSize}" stroke="#999" stroke-width="2" fill="none"/>
        <line x1="0" y1="${internalSize/2}" x2="${internalSize}" y2="${internalSize/2}" stroke="#ddd" stroke-width="2"/>
        <line x1="${internalSize/2}" y1="0" x2="${internalSize/2}" y2="${internalSize}" stroke="#ddd" stroke-width="2"/>
        <line x1="0" y1="${internalSize/4}" x2="${internalSize}" y2="${internalSize/4}" stroke="#eee" stroke-width="1"/>
        <line x1="0" y1="${(internalSize*3)/4}" x2="${internalSize}" y2="${(internalSize*3)/4}" stroke="#eee" stroke-width="1"/>
      `;
    }
    if (showGrid === "square") {
      let lines = "";
      const step = internalSize / 8;
      for (let i = 1; i < 8; i++) {
        lines += `<line x1="0" y1="${i*step}" x2="${internalSize}" y2="${i*step}" stroke="#eee" stroke-width="1"/>`;
        lines += `<line x1="${i*step}" y1="0" x2="${i*step}" y2="${internalSize}" stroke="#eee" stroke-width="1"/>`;
      }
      return `
        <rect x="0" y="0" width="${internalSize}" height="${internalSize}" stroke="#999" stroke-width="2" fill="none"/>
        ${lines}
      `;
    }
    return "";
  }, [showGrid, internalSize]);

  const delayBetweenStrokes = 100;
  const strokeAnimationSpeed = 0.7;

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
            position: relative;
          }
          svg.background-grid {
            position:absolute;
            top:0;
            left:0;
            width:100%;
            height:100%;
            z-index:0;
          }
          #hanzi {
            position:absolute;
            top:0;
            left:0;
            z-index:1;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/hanzi-writer@2.2.2/dist/hanzi-writer.min.js"></script>
      </head>
      <body>
        <div id="target">
          <svg class="background-grid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${internalSize} ${internalSize}">
            ${gridSvg}
          </svg>
          <div id="hanzi"></div>
        </div>
        <script>
          var misses = 0;
          var MAX_MISTAKES = ${maxMistakes ?? "null"};

          var writer = HanziWriter.create('hanzi', ${JSON.stringify(char)}, {
            width: ${internalSize},
            height: ${internalSize},
            showCharacter: false,
            showOutline: ${showOutline},
            showHintAfterMisses: ${showHintAfterMisses},
            delayBetweenStrokes: ${delayBetweenStrokes},
            strokeAnimationSpeed: ${strokeAnimationSpeed},
            highlightOnComplete: false,
            padding: 0
          });

          function startQuiz() {
            misses = 0;
            writer.quiz({
              onMistake: function() {
                misses++;
                if (MAX_MISTAKES && misses >= MAX_MISTAKES) {
                  window.ReactNativeWebView.postMessage('fail');
                }
              },
              onComplete: function() {
                window.ReactNativeWebView.postMessage('complete');
              }
            });
          }

          startQuiz();

          function handleMessage(e) {
            if (e.data === 'solution') {
              writer.hideCharacter();
              writer.updateOptions({
                delayBetweenStrokes: ${delayBetweenStrokes} / 2,
                strokeAnimationSpeed: ${strokeAnimationSpeed} * 2,
              });
              writer.animateCharacter({
                onComplete: function() {
                  writer.updateOptions({
                    delayBetweenStrokes: ${delayBetweenStrokes},
                    strokeAnimationSpeed: ${strokeAnimationSpeed},
                  });
                }
              });
            } else if (e.data === 'restart') {
              writer.hideCharacter();
              startQuiz();
            }
          }
          document.addEventListener('message', handleMessage);
          window.addEventListener('message', handleMessage);
          <\/script>
      </body>
    </html>
  `,
    [
      char,
      internalSize,
      gridSvg,
      showOutline,
      showHintAfterMisses,
      maxMistakes,
      delayBetweenStrokes,
      strokeAnimationSpeed,
    ]
  );

  useImperativeHandle(ref, () => ({
    showSolution() {
      webRef.current?.postMessage("solution");
    },
    restart() {
      webRef.current?.postMessage("restart");
    },
  }));

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html }}
      onMessage={(e) => {
        if (e.nativeEvent.data === "complete") onComplete?.();
        else if (e.nativeEvent.data === "fail") onFail?.();
      }}
      scrollEnabled={false}
      style={{
        backgroundColor: "transparent",
        width: displaySize,
        height: displaySize,
        alignSelf: "center",
      }}
    />
  );
}

export const HanziWriterQuiz = forwardRef(HanziWriterQuizInner);
HanziWriterQuiz.displayName = "HanziWriterQuiz";

