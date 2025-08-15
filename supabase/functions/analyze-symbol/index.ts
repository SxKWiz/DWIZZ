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

// Simple analysis logic (for demonstration)
function performAnalysis(chartData: CandlestickData[]) {
    if (!chartData || chartData.length === 0) {
        return {
            description: "Not enough data to perform analysis.",
            entryPrice: "N/A",
            takeProfit: "N/A",
            stopLoss: "N/A"
        };
    }

    const lastCandle = chartData[chartData.length - 1];
    const previousCandle = chartData.length > 1 ? chartData[chartData.length - 2] : lastCandle;

    const isBullish = lastCandle.close > lastCandle.open;
    const trend = lastCandle.close > previousCandle.close ? "upward" : "downward";

    const entryPrice = (lastCandle.close * 1.001).toFixed(2);
    const takeProfit = (lastCandle.close * 1.02).toFixed(2);
    const stopLoss = (lastCandle.close * 0.99).toFixed(2);

    return {
        description: `The last candle was ${isBullish ? 'bullish' : 'bearish'} with a general ${trend} trend. Based on this, a potential long entry is suggested. This is a simplified analysis for demonstration purposes.`,
        entryPrice: `$${entryPrice}`,
        takeProfit: `$${takeProfit}`,
        stopLoss: `$${stopLoss}`
    };
}


serve(async (req: Request) => {
  // Handle CORS preflight request
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

    const analysisResult = performAnalysis(chartData);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})