---
description: Add a "Clear All Patients" button to the app header
---

Add a "Clear All" button to the app header in `src/App.jsx` that:
1. Appears only when `patients.length > 0`
2. Shows a confirmation prompt before deleting (use `window.confirm` or an inline confirmation state — no extra modal)
3. Calls `supabase.from('patients').delete().neq('id', '')` when Supabase is enabled
4. Clears the `patients` state array
5. Styles it as a small danger button (use `--accent-color`) next to the queue count badge

Keep it compact — this is a header action, not a primary CTA.
