const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export const VASCULAR_GROUPS = [
  'Carotid stenosis',
  'Aortic Disease - Abdominal',
  'Aortic Disease - Thoracic',
  'Peripheral Arterial (PAD) (Aorto-iliac, Fem-pop, Tibial)',
  'Hemodialysis Access (AV Fistula, AV Graft)',
  'Venous Disease (CVI, DVT, Varicose veins)',
  'Visceral / Renal (Mesenteric ischemia, Renal stenosis)',
  'Vascular Trauma',
  'Others',
]

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

IMPORTANT: Translate all clinical text values (clinicalManifestation, underlyingDisease, imagingDiagnosis) into English. Preserve the patient's name exactly as spoken — do not translate it.
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

export async function autoGroupPatients(patients) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No Groq API key configured')

  const patientData = patients.map(p => ({
    id: p.id,
    clinicalManifestation: p.clinicalManifestation,
    underlyingDisease: p.underlyingDisease,
    imagingDiagnosis: p.imagingDiagnosis,
  }))

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
          content: `You are a vascular surgery classification assistant. Classify each patient into exactly one of these groups based on their imaging diagnosis, clinical manifestation, and comorbidities:

${VASCULAR_GROUPS.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Return ONLY a JSON array. Each element must have "id" (the patient ID string) and "group" (exact group name from the list above, or null if classification is unclear).
No markdown, no explanation.`,
        },
        {
          role: 'user',
          content: JSON.stringify(patientData),
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
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) parsed = JSON.parse(match[0])
    else throw new Error('Could not parse AI response as JSON')
  }

  return parsed // [{ id, group }]
}
