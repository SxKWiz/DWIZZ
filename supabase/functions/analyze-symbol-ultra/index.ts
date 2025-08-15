// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CandlestickData = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
};

async function performUltraAnalysisWithGemini(chartData: CandlestickData[], symbol: string) {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in Supabase secrets.");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const recentData = chartData.slice(-90);

    const prompt = `
        You are a senior quantitative trading analyst at a top-tier hedge fund, specializing in algorithmic strategies for cryptocurrency markets. Your task is to conduct a comprehensive, institutional-grade technical analysis on the provided candlestick data for ${symbol}.

        **Comprehensive Analysis Requirements:**
        1.  **Multi-faceted Pattern Recognition:** Identify dominant chart patterns (e.g., Head and Shoulders, Triangles, Channels, Flags) and significant multi-candlestick patterns (e.g., Three White Soldiers, Evening Star).
        2.  **Contextual Interpretation:** Analyze the identified patterns in the context of the broader market structure, including prevailing trends, key support and resistance zones, and volume profile indications (if inferable).
        3.  **Confluence Factors:** Look for confluence, where multiple technical indicators or patterns point to the same conclusion.
        4.  **Hypothesis Formulation:** Formulate a primary trading hypothesis (e.g., "bullish continuation," "bearish reversal") based on the evidence.
        5.  **Actionable Trade Plan:** Develop a clear, actionable trade plan with precise entry, take-profit, and stop-loss levels. The plan must be justified by the analysis.
        6.  **Confidence Assessment:** Provide a quantitative confidence score based on the strength and confluence of the technical signals.
        7.  **Strict JSON Output:** The entire response must be a single, valid JSON object with no additional text, comments, or markdown.

        **Candlestick Data (Last 90 periods - UTC Timestamp, Open, High, Low, Close):**
        ${recentData.map(d => `[${d.time}, ${d.open}, ${d.high}, ${d.low}, ${d.close}]`).join('\n')}

        **Required JSON Format:**
        {
          "description": "A detailed, professional-grade technical analysis. Start with the primary trading hypothesis. Then, detail the specific chart and candlestick patterns identified, explaining how they support the hypothesis. Mention key support/resistance levels and any confluence factors observed.",
          "entryPrice": "A precise suggested entry price, justified by a specific technical level (e.g., breakout confirmation, retest of support), formatted as a string like '$XXXX.XX'.",
          "takeProfit": "A suggested take-profit level, justified by the next major resistance, a pattern's measured move, or a specific risk/reward ratio (e.g., 2:1), formatted as a string like '$XXXX.XX'.",
          "stopLoss": "A suggested stop-loss level, justified by the invalidation point of the primary pattern or a key structural level, formatted as a string like '$XXXX.XX'.",
          "confidence": "Your confidence in this trade setup, based on the quality and confluence of signals, formatted as a string like 'XX.X%'.",
          "summary": "A concise, one-sentence executive summary of the trade plan (e.g., 'Initiate long position on a breakout above key resistance with a target at the next structural high.')."
        }
    `;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API request failed with status ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const jsonString = result.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { chartData, symbol } = await req.json()

    if (!symbol || !chartData) {
        return new Response(JSON.stringify({ error: 'Missing symbol or chartData' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const analysisResult = await performUltraAnalysisWithGemini(chartData, symbol);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in analyze-symbol-ultra function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})