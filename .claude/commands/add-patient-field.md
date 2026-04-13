---
description: Add a new structured field to every patient card (e.g. "Blood Pressure", "Surgery Type")
---

Add a new patient field called "$ARGUMENTS" to the app end-to-end.

Steps:
1. Add the column to the Supabase SQL schema and show the ALTER TABLE statement
2. Add the new key to the Groq system prompt in `src/services/groq.js` so AI extracts it
3. Add the field to `localToDb` and `dbToLocal` mappings in `src/App.jsx`
4. Render the new field in `src/components/PatientCard.jsx` using the same `.card-field` pattern as existing fields
5. Pick an appropriate Lucide icon for the field

Keep the card layout consistent — one icon, one label, one value line.
