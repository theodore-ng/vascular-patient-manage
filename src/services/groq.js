const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

function getApiKey() {
  return import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || ''
}

export async function parsePatientTranscript(transcript) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No Groq API key configured')

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a medical data extraction assistant for a vascular surgery department.
Extract the following fields from the voice transcript and return ONLY a valid JSON object with these exact keys:
- name: patient's full name (string)
- age: patient's age as a number (integer)
- clinicalManifestation: clinical presentation — symptoms and signs described (string)
- underlyingDisease: comorbidities — pre-existing or concurrent conditions (string)
- imagingDiagnosis: imaging findings — radiological or diagnostic findings mentioned (string)

IMPORTANT: Translate ALL extracted text values into English, regardless of the input language.
If a field is not mentioned, use null.
Return ONLY the JSON object, no markdown, no explanation.`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${err}`)
  }

  const data = await response.json()
  const raw = data.choices[0].message.content.trim()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
    else throw new Error('Could not parse AI response as JSON')
  }

  return {
    name: parsed.name || '—',
    age: parsed.age ?? null,
    clinicalManifestation: parsed.clinicalManifestation || '—',
    underlyingDisease: parsed.underlyingDisease || '—',
    imagingDiagnosis: parsed.imagingDiagnosis || '—',
  }
}
