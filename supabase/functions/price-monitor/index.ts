// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define types for clarity
type PriceAlert = {
  id: string;
  user_id: string;
  symbol: string;
  entry_price: number;
  take_profit: number;
  stop_loss: number;
  is_long: boolean;
  is_entered: boolean;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all active price alerts
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('price_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: 'No active alerts to process.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Group alerts by symbol to minimize API calls
    const alertsBySymbol = alerts.reduce((acc, alert) => {
      if (!acc[alert.symbol]) {
        acc[alert.symbol] = [];
      }
      acc[alert.symbol].push(alert);
      return acc;
    }, {} as Record<string, PriceAlert[]>);

    // 3. Fetch current prices for all unique symbols
    const symbols = Object.keys(alertsBySymbol);
    const priceUrl = new URL('https://api.binance.com/api/v3/ticker/price');
    priceUrl.searchParams.append('symbols', JSON.stringify(symbols));
    
    const priceResponse = await fetch(priceUrl);
    if (!priceResponse.ok) {
        const errorBody = await priceResponse.text();
        console.error("Binance API Error:", errorBody);
        throw new Error(`Failed to fetch prices from Binance. Status: ${priceResponse.status}`);
    }
    const prices: { symbol: string; price: string }[] = await priceResponse.json();
    
    const currentPrices = prices.reduce((acc, p) => {
        acc[p.symbol] = parseFloat(p.price);
        return acc;
    }, {} as Record<string, number>);

    const notificationsToInsert: any[] = [];
    const alertsToUpdate: any[] = [];
    const alertsToDeactivate: string[] = [];

    // 4. Process alerts for each symbol
    for (const symbol of symbols) {
      const currentPrice = currentPrices[symbol];
      if (currentPrice === undefined) continue;

      for (const alert of alertsBySymbol[symbol]) {
        const { id, user_id, entry_price, take_profit, stop_loss, is_long, is_entered } = alert;

        // Check for entry if not already entered
        if (!is_entered) {
          let entryTriggered = false;
          if (is_long && currentPrice >= entry_price) entryTriggered = true;
          if (!is_long && currentPrice <= entry_price) entryTriggered = true;

          if (entryTriggered) {
            notificationsToInsert.push({
              user_id,
              message: `${symbol.replace('USDT', '/USDT')} has crossed the Entry Price at ${entry_price}.`,
            });
            alertsToUpdate.push({ id, is_entered: true });
            alert.is_entered = true; // Update local copy for subsequent checks in this run
          }
        }

        // Check for TP/SL only if trade is entered
        if (alert.is_entered) {
          let tpTriggered = false;
          if (is_long && currentPrice >= take_profit) tpTriggered = true;
          if (!is_long && currentPrice <= take_profit) tpTriggered = true;

          if (tpTriggered) {
            notificationsToInsert.push({
              user_id,
              message: `${symbol.replace('USDT', '/USDT')} has reached the Take Profit level at ${take_profit}.`,
            });
            alertsToDeactivate.push(id);
            continue; // Stop processing this alert if TP is hit
          }

          let slTriggered = false;
          if (is_long && currentPrice <= stop_loss) slTriggered = true;
          if (!is_long && currentPrice >= stop_loss) slTriggered = true;

          if (slTriggered) {
            notificationsToInsert.push({
              user_id,
              message: `${symbol.replace('USDT', '/USDT')} has hit the Stop Loss level at ${stop_loss}.`,
            });
            alertsToDeactivate.push(id);
          }
        }
      }
    }

    // 5. Batch database operations
    if (notificationsToInsert.length > 0) {
      const { error } = await supabaseAdmin.from('notifications').insert(notificationsToInsert);
      if (error) console.error('Error inserting notifications:', error);
    }
    if (alertsToUpdate.length > 0) {
      const { error } = await supabaseAdmin.from('price_alerts').upsert(alertsToUpdate);
      if (error) console.error('Error updating alerts (is_entered):', error);
    }
    if (alertsToDeactivate.length > 0) {
      const { error } = await supabaseAdmin
        .from('price_alerts')
        .update({ is_active: false })
        .in('id', alertsToDeactivate);
      if (error) console.error('Error deactivating alerts:', error);
    }

    return new Response(JSON.stringify({ success: true, processed: alerts.length, notifications: notificationsToInsert.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in price-monitor function:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});