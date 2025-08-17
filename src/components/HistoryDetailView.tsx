import { useEffect, useState } from 'react';
import TradingChart, { ChartData } from '@/components/TradingChart';
import { AnalysisResult, AnalysisResultDisplay } from './AnalysisResultDisplay';
import { Skeleton } from './ui/skeleton';
import { showError } from '@/utils/toast';
import * as LightweightCharts from 'lightweight-charts';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

interface HistoryDetailViewProps {
    symbol: string;
    timeframe?: string;
    createdAt: string;
    result: AnalysisResult;
}

const HistoryDetailView = ({ symbol, timeframe, createdAt, result }: HistoryDetailViewProps) => {
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [latestCandle, setLatestCandle] = useState<ChartData | null>(null);

    useEffect(() => {
        const fetchChartData = async () => {
            if (!timeframe) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const analysisTime = new Date(createdAt).getTime();

                // Fetch data before and including the analysis time
                const historyPromise = fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&endTime=${analysisTime}&limit=1000`);
                // Fetch data after the analysis time until now
                const futurePromise = fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&startTime=${analysisTime}&limit=1000`);

                const [historyResponse, futureResponse] = await Promise.all([historyPromise, futurePromise]);

                if (!historyResponse.ok || !futureResponse.ok) {
                    throw new Error('Failed to fetch historical data from Binance.');
                }

                const historyData = await historyResponse.json();
                const futureData = await futureResponse.json();

                if ((historyData.code !== undefined && historyData.msg) || (futureData.code !== undefined && futureData.msg)) {
                    throw new Error(`Binance API Error: ${historyData.msg || futureData.msg}`);
                }

                const formatData = (data: any[]): ChartData[] => data.map((d: any) => ({
                    time: (d[0] / 1000) as LightweightCharts.UTCTimestamp,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));

                const formattedHistoryData = formatData(historyData);
                const formattedFutureData = formatData(futureData);

                const combinedData = [...formattedHistoryData, ...formattedFutureData];
                const uniqueData = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
                const sortedData = uniqueData.sort((a, b) => (a.time as number) - (b.time as number));
                
                setChartData(sortedData);
            } catch (error) {
                console.error("Error fetching historical chart data:", error);
                showError((error as Error).message || `Could not load historical data for ${symbol}.`);
                setChartData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [symbol, timeframe, createdAt]);

    useEffect(() => {
        if (loading || !symbol || !timeframe) {
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
            console.error('WebSocket Error in HistoryDetailView:', error);
        };

        return () => {
            socket.close();
        };
    }, [symbol, timeframe, loading]);

    return (
        <div className="space-y-4">
            {loading ? (
                <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
                <TradingChart 
                    data={chartData} 
                    analysisResult={result} 
                    latestCandle={latestCandle}
                    triggeredAlerts={new Set()} 
                    height={400} 
                    analysisCreatedAt={createdAt}
                />
            ) : (
                 <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Chart Unavailable</AlertTitle>
                    <AlertDescription>
                        Historical chart data could not be loaded. This may be an older entry before this feature was added.
                    </AlertDescription>
                </Alert>
            )}
            <AnalysisResultDisplay result={result} />
        </div>
    );
};

export default HistoryDetailView;