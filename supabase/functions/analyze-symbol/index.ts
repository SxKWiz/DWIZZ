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
        You are a professional quantitative trading analyst specializing in cryptocurrency markets. Your task is to perform a technical analysis on the provided candlestick data for ${symbol}. Your analysis must be objective and data-driven.

        **Analysis Requirements:**
        1.  **Market Sentiment:** Determine the immediate market sentiment (e.g., "Bullish", "Bearish", "Neutral") based on the most recent price action.
        2.  **Key Patterns:** Identify the most significant candlestick or simple chart pattern in the recent data.
        3.  **Formulate a Trade Signal:** Based on your analysis, provide a clear, actionable trade signal. This is for educational purposes and is not financial advice.
        4.  **Risk/Reward:** Calculate the risk/reward ratio for the proposed trade.
        5.  **Identify Drawable Patterns:** If you identify a clear, simple pattern like a trendline (support or resistance), provide the coordinates for drawing it. The 'time' must be a UNIX timestamp (seconds) from the provided data.
        6.  **Strict JSON Output:** The entire response must be a single, valid JSON object with no additional text, comments, or markdown.

        **Candlestick Data (Last 30 periods - UNIX Timestamp, Open, High, Low, Close):**
        ${recentData.map(d => `[${d.time}, ${d.open}, ${d.high}, ${d.low}, ${d.close}]`).join('\n')}

        **Required JSON Format:**
        {
          "description": "A concise technical analysis summary, mentioning the identified pattern and its implications for the potential trade.",
          "entryPrice": "A precise suggested entry price, formatted as a string like '$XXXX.XX'.",
          "takeProfit": "A suggested take-profit level based on key resistance or a favorable risk/reward ratio, formatted as a string like '$XXXX.XX'.",
          "stopLoss": "A suggested stop-loss level based on key support or pattern invalidation, formatted as a string like '$XXXX.XX'.",
          "sentiment": "The immediate market sentiment (e.g., 'Bullish', 'Bearish', 'Neutral'), as a string.",
          "riskRewardRatio": "The calculated risk/reward ratio for the trade, formatted as a string like 'X.XX:1'.",
          "drawings": [
            {
              "type": "trendline",
              "points": [
                { "time": 1672531200, "price": 20000.50 },
                { "time": 1672617600, "price": 21000.75 }
              ],
              "label": "Support Trendline"
            }
          ]
        }

        The "drawings" array can be empty if no simple, clear pattern is identified. Ensure all price values are numbers, not strings. The 'time' in the points must be a valid UNIX timestamp from the provided data.
    `;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0,
            }
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