import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { initialTitle, initialDescription } = await req.json();
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 500 });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Return ONLY raw JSON with fields: improvedTitle, improvedDescription, suggestedCategory (blood/tutor/repair/emergency/other), suggestedUrgency (high/medium/low). Title: ${initialTitle}. Description: ${initialDescription}` }] }]
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return NextResponse.json(JSON.parse(cleaned));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
