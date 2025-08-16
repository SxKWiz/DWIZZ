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

    useEffect(() => {
        const fetchHistoricChartData = async () => {
            if (!timeframe) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const endTime = new Date(createdAt).getTime();
                const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&endTime=${endTime}&limit=1000`);
                if (!response.ok) {
                    throw new Error('Failed to fetch historical data from Binance.');
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
                console.error("Error fetching historical chart data:", error);
                showError((error as Error).message || `Could not load historical data for ${symbol}.`);
                setChartData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistoricChartData();
    }, [symbol, timeframe, createdAt]);

    return (
        <div className="space-y-4">
            {loading ? (
                <Skeleton className="h-[400px] w-full" />
            ) : chartData.length > 0 ? (
                <TradingChart data={chartData} analysisResult={result} latestCandle={null} triggeredAlerts={new Set()} height={400} />
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