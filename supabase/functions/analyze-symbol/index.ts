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

async function performAnalysisWithGemini(chartData: CandlestickData[], symbol: string) {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in Supabase secrets.");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const recentData = chartData.slice(-30);

    const prompt = `
        You are a professional quantitative trading analyst specializing in cryptocurrency markets. Your task is to perform a technical analysis on the provided candlestick data for ${symbol}.

        **Analysis Requirements:**
        1.  **Identify Key Patterns:** Scan the data for significant candlestick patterns (e.g., Doji, Hammer, Engulfing patterns) and simple chart patterns (e.g., support/resistance flips, trendlines).
        2.  **Interpret Implications:** Briefly explain what these patterns typically indicate in the context of the current market trend.
        3.  **Formulate a Trade Signal:** Based on your analysis, provide a clear, actionable trade signal. This is for educational purposes and is not financial advice.
        4.  **Strict JSON Output:** The entire response must be a single, valid JSON object with no additional text, comments, or markdown.

        **Candlestick Data (Last 30 periods - UTC Timestamp, Open, High, Low, Close):**
        ${recentData.map(d => `[${d.time}, ${d.open}, ${d.high}, ${d.low}, ${d.close}]`).join('\n')}

        **Required JSON Format:**
        {
          "description": "A concise technical analysis summary, mentioning the identified patterns and their implications for the potential trade.",
          "entryPrice": "A precise suggested entry price, formatted as a string like '$XXXX.XX'.",
          "takeProfit": "A suggested take-profit level based on key resistance or a favorable risk/reward ratio, formatted as a string like '$XXXX.XX'.",
          "stopLoss": "A suggested stop-loss level based on key support or pattern invalidation, formatted as a string like '$XXXX.XX'."
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

    const analysisResult = await performAnalysisWithGemini(chartData, symbol);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error in analyze-symbol function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})