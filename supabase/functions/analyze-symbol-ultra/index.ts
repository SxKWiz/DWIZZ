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
        You are a senior quantitative analyst at a top-tier investment bank. Your task is to conduct a comprehensive, institutional-grade technical analysis on the provided candlestick data for ${symbol}. Your analysis must be rigorous, data-driven, and devoid of emotion.

        **Comprehensive Analysis Protocol:**
        1.  **Market Regime Analysis:**
            *   **Sentiment:** Determine the dominant market sentiment (e.g., "Strong Bullish", "Bearish", "Ranging/Neutral").
            *   **Volatility:** Assess the current volatility environment (e.g., "High", "Low", "Contracting").
        2.  **Multi-Factor Technical Analysis:**
            *   **Price Action & Structure:** Identify major market structures, key support/resistance levels, and trendlines.
            *   **Chart & Candlestick Patterns:** Pinpoint dominant chart patterns (e.g., Head and Shoulders, Triangles) and significant candlestick formations.
            *   **Indicator Inference:** Based on the price action, infer the likely state of key technical indicators (e.g., Moving Averages, RSI, MACD). For example, "Price is consistently closing above the inferred 50-period MA, suggesting a strong uptrend."
        3.  **Trade Hypothesis & Execution Plan:**
            *   **Primary Hypothesis:** Formulate a primary trading hypothesis with a clear directional bias.
            *   **Execution Plan:** Develop a precise trade plan with entry, take-profit, and stop-loss levels justified by your analysis.
            *   **Risk/Reward:** Calculate the risk/reward ratio for the proposed trade.
            *   **Confidence Score:** Provide a quantitative confidence score based on the confluence of signals.
        4.  **Risk Management & Contingency:**
            *   **Trade Management:** Outline a simple plan for managing the trade post-entry (e.g., "Move stop-loss to breakeven once price reaches...").
            *   **Alternative Scenario:** Briefly describe the alternative scenario if the primary hypothesis is invalidated.
        5.  **Identify Drawable Patterns:** If you identify clear, significant patterns like trendlines, channels, or key horizontal levels, provide the coordinates for drawing them. The 'time' must be a UNIX timestamp (seconds) from the provided data.
        6.  **Strict JSON Output:** The entire response must be a single, valid JSON object with no additional text, comments, or markdown.

        **Candlestick Data (Last 90 periods - UNIX Timestamp, Open, High, Low, Close):**
        ${recentData.map(d => `[${d.time}, ${d.open}, ${d.high}, ${d.low}, ${d.close}]`).join('\n')}

        **Required JSON Format:**
        {
          "summary": "A concise, one-sentence executive summary of the trade plan.",
          "description": "A detailed, professional-grade technical analysis. Start with the primary hypothesis. Detail the patterns, market structure, and inferred indicator states that support it. Justify all key levels.",
          "entryPrice": "A precise suggested entry price, justified by a specific technical event, formatted as a string like '$XXXX.XX'.",
          "takeProfit": "A suggested take-profit level, justified by a major resistance or measured move, formatted as a string like '$XXXX.XX'.",
          "stopLoss": "A suggested stop-loss level, justified by the invalidation point of the primary pattern, formatted as a string like '$XXXX.XX'.",
          "confidence": "Your confidence in this trade setup, based on signal confluence, formatted as a string like 'XX.X%'.",
          "sentiment": "The dominant market sentiment (e.g., 'Strong Bullish', 'Bearish', 'Ranging/Neutral'), as a string.",
          "volatility": "The current volatility assessment (e.g., 'High', 'Low', 'Contracting'), as a string.",
          "riskRewardRatio": "The calculated risk/reward ratio for the trade, formatted as a string like 'X.XX:1'.",
          "tradeManagement": "A brief strategy for managing the trade after entry.",
          "alternativeScenario": "A brief description of what might happen if the trade setup is invalidated.",
          "drawings": [
            {
              "type": "trendline",
              "points": [
                { "time": 1672531200, "price": 20000.50 },
                { "time": 1672617600, "price": 21000.75 }
              ],
              "label": "Primary Support Trendline"
            }
          ]
        }

        The "drawings" array can be empty if no significant patterns are identified. Ensure all price values are numbers, not strings. The 'time' in the points must be a valid UNIX timestamp from the provided data.
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