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
    const [armedAnalysis, setArmedAnalysis] = useState<AnalysisResult | null>(null);
    const [latestCandle, setLatestCandle] = useState<ChartData | null>(null);
    const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set());
    const prevPriceRef = useRef<number | null>(null);
    const { user, profile } = useAuth();

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (debouncedSearchTerm) {
            setSymbol(debouncedSearchTerm.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }
    }, [debouncedSearchTerm]);

    useEffect(() => {
        const fetchChartData = async () => {
            if (!symbol) return;

            setLoadingChart(true);
            setAnalysisResult(null);
            setArmedAnalysis(null);
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

                const formattedData: ChartData[] = data.map((d: any) => ({
                    time: (d[0] / 1000) as LightweightCharts.UTCTimestamp,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));
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

        socket.onmessage = (event) => {
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
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        return () => {
            socket.close();
        };
    }, [symbol, timeframe, loadingChart]);

    // Effect to reset alerts when a new analysis is generated
    useEffect(() => {
        setTriggeredAlerts(new Set());
        prevPriceRef.current = null;
    }, [armedAnalysis]);

    // Effect for price alert notifications
    useEffect(() => {
        if (!latestCandle || !armedAnalysis || !profile?.notifications_enabled) {
            return;
        }

        const currentPrice = latestCandle.close;
        const prevPrice = prevPriceRef.current;

        if (prevPrice === null) {
            prevPriceRef.current = currentPrice;
            return;
        }

        const entryPrice = parseFloat(armedAnalysis.entryPrice.replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(armedAnalysis.takeProfit.replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(armedAnalysis.stopLoss.replace(/[^0-9.-]+/g, ""));
        const isLong = armedAnalysis.sentiment.toLowerCase().includes('bullish');
        const isShort = armedAnalysis.sentiment.toLowerCase().includes('bearish');

        const checkAndNotify = (level: 'entry' | 'tp' | 'sl', price: number, message: string) => {
            if (isNaN(price) || triggeredAlerts.has(level)) {
                return;
            }

            let triggered = false;
            if (isLong) {
                if (level === 'entry' && prevPrice < price && currentPrice >= price) triggered = true;
                if (level === 'tp' && currentPrice >= price) triggered = true;
                if (level === 'sl' && currentPrice <= price) triggered = true;
            } else if (isShort) {
                if (level === 'entry' && prevPrice > price && currentPrice <= price) triggered = true;
                if (level === 'tp' && currentPrice <= price) triggered = true;
                if (level === 'sl' && currentPrice >= price) triggered = true;
            }

            if (triggered) {
                showInfo(message);
                setTriggeredAlerts(prev => new Set(prev).add(level));
                if (user) {
                    supabase.from('notifications').insert({ user_id: user.id, message }).then(({ error }) => {
                        if (error) {
                            console.error("Error saving notification:", error);
                        }
                    });
                }
            }
        };

        checkAndNotify('entry', entryPrice, `${symbol.replace('USDT', '/USDT')} has crossed the Entry Price at ${armedAnalysis.entryPrice}`);
        checkAndNotify('tp', takeProfit, `${symbol.replace('USDT', '/USDT')} has reached the Take Profit level at ${armedAnalysis.takeProfit}`);
        checkAndNotify('sl', stopLoss, `${symbol.replace('USDT', '/USDT')} has hit the Stop Loss level at ${armedAnalysis.stopLoss}`);

        prevPriceRef.current = currentPrice;
    }, [latestCandle, armedAnalysis, symbol, triggeredAlerts, profile, user]);

    const handleSetAlerts = (result: AnalysisResult) => {
        setArmedAnalysis(result);
        showSuccess(`Price alerts for ${symbol.replace('USDT', '/USDT')} have been activated.`);
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
                        <TradingChart data={chartData} analysisResult={analysisResult} latestCandle={latestCandle} />
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
                onAnalysisComplete={(result) => {
                    setAnalysisResult(result);
                    setArmedAnalysis(null);
                }}
                onSetAlerts={handleSetAlerts}
                isAlertSet={!!(armedAnalysis && analysisResult && armedAnalysis.entryPrice === analysisResult.entryPrice)}
            />
            <RecentHistory />
        </div>
    );
};

export default Home;