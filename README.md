📚 User Stories — Chinese Revision App
🥋 Module 1 — Revision Game
0) Data Model & Loading

As a developer, I want the local JSON to include a series field (number) so I can group characters by word list for exercises.

{
  "id": "1",
  "series": 1,
  "hanzi": "你",
  "pinyin": "nǐ",
  "numeric": "ni3",
  "fr": "tu",
  "audioUrl": "https://cdn.example.com/audio/ni3.mp3"
}


Local-first loading from constants/words.json

API fetch + cache ready for future use

1) Settings Page (/module/1/settings)

As a user, I want to configure my game before starting:

Select series → choose one, multiple, or all characters

Set maxQuestions → fixed number or unlimited

Toggle noRepeatHintType → prevent same hintType (汉字 / pinyin / FR) twice in a row

Start button → launches the game with selected settings

2) Question Generator

As a user, I want:

Characters shuffled (shuffledCharacters) so question order is random

5 choices per question (choices array), all pulled from filtered characters (1 correct + 4 distractors)

Random hintType per question, respecting noRepeatHintType if enabled

3) Gameplay — Hints & Errors

As a user, I want progressive hints (“pistes”) when I’m stuck:

Button Hint → reveal next letter (pinyin accented or FR translation)

Max 3 hints → auto reveal answer (revealAnswer())

Score impact: –1 per hint; if 3 hints → 0 points for the question

If errorCount reaches 3 → reveal answer (score 0)

4) Scoring & History

As a user, I want:

Scoring: +5 base, –1 per error, –1 per hint, 0 if revealed (by hints or errors)

History saved in AsyncStorage:

Selected series or "custom"

Total score

Date

Per-character stats (errors, hints used)

Restart Game button → same settings, reset everything

5) Audio & Offline

As a user, I want to hear pronunciation:

If audioUrl:

Play with expo-audio

Store in audioCacheLRU (max 5 files, oldest removed first)

Button disabled if no cache & no network

Else: Play via TTS (expo-speech)

Always offline-first: load from local JSON; API fetch optional later

🪄 Module 2 — (to be defined)

(Reserved space for future User Stories)

🎯 Extra Dev Notes

Code terms: hint, hintCount, maxHints, errorCount, score, selectedSeries, maxQuestions, noRepeatHintType, shuffledCharacters, choices, audioCacheLRU, playAudio(), playTTS()

UI text in French, code in English

AsyncStorage used for cache & history

LRU logic in separate utility (lib/lruCache.ts)

Data & audio loading in lib/data.ts and lib/audio.ts