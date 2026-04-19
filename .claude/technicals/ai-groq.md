# AI & Groq Patterns

---

## Structured extraction from free-form speech/text

**Pattern:** When using an LLM to extract structured data from voice or unstructured text:
1. Instruct the model to return **only** a JSON object — no markdown, no explanation.
2. Add a regex fallback to strip markdown code fences if the model wraps the JSON anyway.
3. After parsing, validate that meaningful fields were extracted before acting on the result.
4. Use `temperature: 0.1` for extraction — lower = more consistent JSON output.

```js
// JSON parse with fallback
let parsed
try {
  parsed = JSON.parse(raw)
} catch {
  const match = raw.match(/\{[\s\S]*\}/)   // single object
  if (match) parsed = JSON.parse(match[0])
  else throw new Error('Could not parse AI response as JSON')
}

// Array responses (e.g. auto-group)
const match = raw.match(/\[[\s\S]*\]/)
if (match) parsed = JSON.parse(match[0])
```

---

## Batch classification (auto-group)

**Pattern:** Instead of one API call per patient, send all patients in a single call and ask the model to return a `[{id, group}]` array. Much faster and cheaper.

```js
const payload = patients.map(p => ({
  id: p.id,
  clinicalManifestation: p.clinicalManifestation,
  underlyingDisease: p.underlyingDisease,
  imagingDiagnosis: p.imagingDiagnosis,
}))

const systemPrompt = `
Classify each patient into exactly one of these groups: ${VASCULAR_GROUPS.join(', ')}.
Return ONLY a JSON array: [{"id": "...", "group": "..."}]
`
```

**Preview-before-apply UX:** Show the model's proposed assignments for the surgeon to review before committing. This lets them catch misclassifications without any harm.
