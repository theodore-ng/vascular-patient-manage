---
description: Change the speech recognition language for voice input
---

Change the voice recognition language to "$ARGUMENTS".

Edit `src/components/VoiceInput.jsx` — find `recognition.lang` inside `startListening()` and update it to the correct BCP-47 language tag.

Common tags:
- Vietnamese: vi-VN
- English (US): en-US
- English (UK): en-GB
- French: fr-FR
- Japanese: ja-JP
- Korean: ko-KR
- Chinese (Simplified): zh-CN
- Thai: th-TH

Also update the voice-hint placeholder text in the JSX to reflect the new language if helpful.
