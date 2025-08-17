import { useEffect, useState, useRef } from 'react';
import TradingChart, { ChartData } from '@/components/TradingChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import AnalysisPanel from '@/components/AnalysisPanel';
import * as LightweightCharts from 'lightweight-charts';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import RecentHistory from '@/components/RecentHistory';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { AnalysisResult } from '@/components/AnalysisResultDisplay';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const timeframeOptions = [
    { value: '1m', label: '1 Minute' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
];

const Home = () => {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [searchTerm, setSearchTerm] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('1d');
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [activeAlert, setActiveAlert] = useState<any | null>(null);
    const [latestCandle, setLatestCandle] = useState<ChartData | null>(null);
    const { user } = useAuth();

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (debouncedSearchTerm) {
            setSymbol(debouncedSearchTerm.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }
    }, [debouncedSearchTerm]);

    useEffect(() => {
        const fetchActiveAlert = async () => {
            if (!user || !symbol) {
                setActiveAlert(null);
                return;
            }
            const { data, error } = await supabase
                .from('price_alerts')
                .select('*')
                .eq('user_id', user.id)
                .eq('symbol', symbol)
                .eq('is_active', true)
                .maybeSingle();

            if (error) {
                console.error("Error fetching active alert:", error);
            } else {
                setActiveAlert(data);
            }
        };

        fetchActiveAlert();
    }, [symbol, user]);

    useEffect(() => {
        const fetchChartData = async () => {
            if (!symbol) return;

            setLoadingChart(true);
            setAnalysisResult(null);
            setLatestCandle(null);
            try {
                const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=1000`);
                if (!response.ok) {
                    throw new Error('Failed to fetch data from Binance. The symbol may not exist.');
                }
                const data = await response.json();

                if (data.code !== undefined && data.msg) {
                    throw new Error(`Binance API Error: ${data.msg}`);
                }

                const rawFormattedData: ChartData[] = data.map((d: any) => ({
                    time: (d[0] / 1000) as LightweightCharts.UTCTimestamp,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));

                // Data cleaning using a Map to guarantee uniqueness and proper sorting
                const dataMap = new Map<number, ChartData>();
                for (const item of rawFormattedData) {
                    // This will overwrite any existing entry with the same timestamp,
                    // effectively de-duplicating and keeping the latest version of the candle.
                    if (item && typeof item.time === 'number' && !isNaN(item.time)) {
                        dataMap.set(item.time as number, item);
                    }
                }

                // Convert the map back to an array and sort it.
                // The sort is crucial as map iteration order is based on insertion order, not key order.
                const formattedData = Array.from(dataMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
                setChartData(formattedData);
            } catch (error) {
                console.error("Error fetching chart data:", error);
                setChartData([]);
                showError((error as Error).message || `Could not load data for ${symbol}.`);
            } finally {
                setLoadingChart(false);
            }
        };

        fetchChartData();
    }, [symbol, timeframe]);

    useEffect(() => {
        if (!symbol || loadingChart) {
            return;
        }

        const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeframe}`);
        let isConnected = true;

        socket.onopen = () => {
            console.log(`WebSocket connected for ${symbol} ${timeframe}`);
        };

        socket.onmessage = (event) => {
            if (!isConnected) return; // Ignore messages if connection is being cleaned up
            
            try {
                const message = JSON.parse(event.data);
                const candle = message.k;

                if (candle) {
                    const newCandle: ChartData = {
                        time: (candle.t / 1000) as LightweightCharts.UTCTimestamp,
                        open: parseFloat(candle.o),
                        high: parseFloat(candle.h),
                        low: parseFloat(candle.l),
                        close: parseFloat(candle.c),
                    };
                    setLatestCandle(newCandle);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        socket.onerror = (error) => {
            if (isConnected) {
                console.error('WebSocket Error:', error);
            }
        };

        socket.onclose = (event) => {
            if (isConnected) {
                console.log(`WebSocket closed for ${symbol} ${timeframe}:`, event.code, event.reason);
            }
        };

        return () => {
            isConnected = false;
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close(1000, 'Component cleanup');
            }
        };
    }, [symbol, timeframe, loadingChart]);

    const handleSetAlerts = async (result: AnalysisResult, analysisId: string) => {
        if (!user) {
            showError("You must be logged in to set alerts.");
            return;
        }

        // Deactivate any existing alerts for this symbol first
        if (activeAlert) {
            await supabase.from('price_alerts').update({ is_active: false }).eq('id', activeAlert.id);
        }

        const { data: newAlert, error } = await supabase.from('price_alerts').insert({
            user_id: user.id,
            analysis_history_id: analysisId,
            symbol: symbol,
            entry_price: parseFloat(String(result.entryPrice).replace(/[^0-9.-]+/g, "")),
            take_profit: parseFloat(String(result.takeProfit).replace(/[^0-9.-]+/g, "")),
            stop_loss: parseFloat(String(result.stopLoss).replace(/[^0-9.-]+/g, "")),
            is_long: result.sentiment.toLowerCase().includes('bullish'),
        }).select().single();

        if (error) {
            showError("Failed to activate price alerts.");
            console.error("Error setting alert:", error);
        } else {
            showSuccess(`Price alerts for ${symbol.replace('USDT', '/USDT')} have been activated.`);
            setActiveAlert(newAlert);
        }
    };

    const handleCancelAlerts = async () => {
        if (!activeAlert) return;

        const { error } = await supabase
            .from('price_alerts')
            .update({ is_active: false })
            .eq('id', activeAlert.id);

        if (error) {
            showError("Failed to deactivate price alerts.");
        } else {
            showInfo(`Price alerts for ${symbol.replace('USDT', '/USDT')} have been deactivated.`);
            setActiveAlert(null);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                    <CardTitle>{symbol ? `${symbol.replace('USDT', '/USDT')} Chart` : 'Enter a symbol'}</CardTitle>
                    <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-[180px] justify-between">
                                    {timeframeOptions.find(t => t.value === timeframe)?.label}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[180px]">
                                {timeframeOptions.map((option) => (
                                    <DropdownMenuItem key={option.value} onSelect={() => setTimeframe(option.value)}>
                                        {option.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="w-full sm:max-w-xs">
                            <Input
                                placeholder="e.g., BTCUSDT"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingChart ? (
                        <Skeleton className="h-[500px] w-full" />
                    ) : chartData.length > 0 ? (
                        <TradingChart
                            data={chartData}
                            analysisResult={analysisResult}
                            latestCandle={latestCandle}
                            triggeredAlerts={new Set()}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                            No chart data available for {symbol}. Please check the symbol and try again.
                        </div>
                    )}
                </CardContent>
            </Card>
            <AnalysisPanel
                chartData={chartData}
                symbol={symbol}
                timeframe={timeframe}
                onAnalysisComplete={(result) => {
                    setAnalysisResult(result);
                    setActiveAlert(null);
                }}
                onSetAlerts={handleSetAlerts}
                onCancelAlerts={handleCancelAlerts}
                isAlertSet={!!activeAlert}
            />
            <RecentHistory />
        </div>
    );
};

export default Home;