import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { initialTitle, initialDescription } = await req.json();
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'AI configuration missing.' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Return ONLY raw JSON with fields: improvedTitle, improvedDescription, suggestedCategory (blood/tutor/repair/emergency/other), suggestedUrgency (high/medium/low). Title: ${initialTitle}. Description: ${initialDescription}. Do not include markdown formatting.` 
            }] 
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const message = errorJson.error?.message || '';
      
      if (message.includes('leaked')) {
        return NextResponse.json({ 
          error: 'The AI API key has been disabled for security reasons. Please update your environment variables with a fresh key.' 
        }, { status: 403 });
      }

      return NextResponse.json({ error: message || 'AI service unavailable' }, { status: response.status });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return NextResponse.json({ error: 'AI failed to generate a response' }, { status: 500 });
    }

    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      const result = JSON.parse(cleaned);
      return NextResponse.json(result);
    } catch (parseError) {
      return NextResponse.json({ error: 'AI returned invalid data format' }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
