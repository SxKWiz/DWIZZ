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
        You are a world-class quantitative crypto trading analyst. Perform an in-depth, "ultra" analysis of the following recent candlestick data for the symbol ${symbol}.
        Consider momentum, volatility, recent trends, and key support/resistance levels implied by the data.
        Provide a detailed analysis, a potential trade signal, and a confidence score. The analysis is for educational purposes only and not financial advice.

        Candlestick Data (UTC Timestamp, Open, High, Low, Close):
        ${recentData.map(d => `[${d.time}, ${d.open}, ${d.high}, ${d.low}, ${d.close}]`).join('\n')}

        Based on your comprehensive analysis, provide a response in the following JSON format ONLY. Do not include any other text, explanations, or markdown formatting.
        {
          "description": "A detailed summary of your analysis, including the factors you considered (volatility, trend, etc.) and the reasoning for the trade signal.",
          "entryPrice": "A suggested entry price, formatted as a string like '$XXXX.XX'.",
          "takeProfit": "A suggested take-profit price based on a reasonable risk/reward ratio, formatted as a string like '$XXXX.XX'.",
          "stopLoss": "A suggested stop-loss price based on recent price action, formatted as a string like '$XXXX.XX'.",
          "confidence": "Your confidence in this trade signal, formatted as a string like 'XX.X%'.",
          "summary": "A very brief, one-sentence summary of the trade signal and your confidence."
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