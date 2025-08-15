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

function performUltraAnalysis(chartData: CandlestickData[]) {
    if (!chartData || chartData.length < 10) {
        return {
            description: "Not enough data for Ultra analysis.",
            entryPrice: "N/A",
            takeProfit: "N/A",
            stopLoss: "N/A",
            confidence: "Low",
            summary: "Insufficient data."
        };
    }

    const recentData = chartData.slice(-10);
    const lastCandle = recentData[recentData.length - 1];
    const firstCandle = recentData[0];

    const priceChange = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
    const isBullish = lastCandle.close > lastCandle.open;
    const trend = priceChange > 0 ? "upward" : "downward";
    const volatility = recentData.reduce((acc, c) => acc + (c.high - c.low), 0) / recentData.length;
    const confidence = Math.min(95, 60 + Math.abs(priceChange) * 5 + (isBullish ? 5 : -5) - (volatility / lastCandle.close * 100)).toFixed(1);

    const entryPrice = (lastCandle.close * 1.001).toFixed(2);
    const takeProfit = (lastCandle.close * (1 + (volatility / lastCandle.close) * 2)).toFixed(2);
    const stopLoss = (lastCandle.close * (1 - (volatility / lastCandle.close))).toFixed(2);

    return {
        description: `Over the last 10 periods, the price has shown a ${Math.abs(priceChange).toFixed(2)}% ${trend} movement. The most recent candle was ${isBullish ? 'bullish' : 'bearish'}. Current volatility suggests a wider stop-loss. This Ultra analysis indicates a potential long entry with a calculated risk/reward profile.`,
        entryPrice: `$${entryPrice}`,
        takeProfit: `$${takeProfit}`,
        stopLoss: `$${stopLoss}`,
        confidence: `${confidence}%`,
        summary: `A ${trend} trend was detected with ${confidence}% confidence based on recent volatility and price action.`
    };
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

    const analysisResult = performUltraAnalysis(chartData);

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