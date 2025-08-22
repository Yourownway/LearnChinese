#!/usr/bin/env node
const fs = require('fs');

async function main() {
  const text = process.argv[2] || '你好，世界';
  const response = await fetch('http://localhost:5002/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const outFile = 'piper-output.wav';
  fs.writeFileSync(outFile, audioBuffer);
  console.log(`Saved TTS audio to ${outFile}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
