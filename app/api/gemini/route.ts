import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userApiKey, prompt, type } = body

    // Validate API key
    if (!userApiKey || !userApiKey.startsWith('AIza')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      )
    }

    // Prepare the request to Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${userApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    })

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json()
      return NextResponse.json(
        { error: error.error?.message || 'API call failed' },
        { status: geminiResponse.status }
      )
    }

    const data = await geminiResponse.json()

    // Extract the generated text
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return NextResponse.json({
      success: true,
      content: generatedText,
      type: type
    })

  } catch (error: any) {
    console.error('Gemini API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}