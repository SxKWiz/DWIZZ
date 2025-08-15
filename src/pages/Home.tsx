import { useEffect, useState } from 'react';
import TradingChart, { ChartData } from '@/components/TradingChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import AnalysisPanel from '@/components/AnalysisPanel';
import * as LightweightCharts from 'lightweight-charts';

// Mock data for testing when API is not available
const mockChartData: ChartData[] = [
    { time: 1704067200 as LightweightCharts.UTCTimestamp, open: 42000, high: 43500, low: 41500, close: 43200 }, // 2024-01-01
    { time: 1704153600 as LightweightCharts.UTCTimestamp, open: 43200, high: 44800, low: 42800, close: 44500 }, // 2024-01-02
    { time: 1704240000 as LightweightCharts.UTCTimestamp, open: 44500, high: 45200, low: 43900, close: 44100 }, // 2024-01-03
    { time: 1704326400 as LightweightCharts.UTCTimestamp, open: 44100, high: 45800, low: 43800, close: 45600 }, // 2024-01-04
    { time: 1704412800 as LightweightCharts.UTCTimestamp, open: 45600, high: 46200, low: 44800, close: 45900 }, // 2024-01-05
    { time: 1704499200 as LightweightCharts.UTCTimestamp, open: 45900, high: 47100, low: 45400, close: 46800 }, // 2024-01-06
    { time: 1704585600 as LightweightCharts.UTCTimestamp, open: 46800, high: 47500, low: 46200, close: 47200 }, // 2024-01-07
    { time: 1704672000 as LightweightCharts.UTCTimestamp, open: 47200, high: 48000, low: 46900, close: 47800 }, // 2024-01-08
    { time: 1704758400 as LightweightCharts.UTCTimestamp, open: 47800, high: 48500, low: 47300, close: 48200 }, // 2024-01-09
    { time: 1704844800 as LightweightCharts.UTCTimestamp, open: 48200, high: 49100, low: 47900, close: 48900 }, // 2024-01-10
];

const Home = () => {
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                // Fetching 1-day interval data for BTC/USDT from Binance
                const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=150');
                if (!response.ok) {
                    throw new Error('Failed to fetch data from Binance');
                }
                const data = await response.json();

                // Check if we got an error response (e.g., restricted location)
                if (data.code !== undefined && data.msg) {
                    throw new Error(`Binance API Error: ${data.msg}`);
                }

                const formattedData: ChartData[] = data.map((d: any) => ({
                    time: (d[0] / 1000) as LightweightCharts.UTCTimestamp, // lightweight-charts expects UTC timestamp in seconds
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));
                setChartData(formattedData);
            } catch (error) {
                console.error("Error fetching chart data:", error);
                console.log("Using mock data for testing");
                // Use mock data as fallback
                setChartData(mockChartData);
                showError("Using demo data. Live data unavailable.");
            } finally {
                setLoadingChart(false);
            }
        };

        fetchChartData();
    }, []);

    return (
        <div className="flex flex-1 flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>BTC/USDT Chart</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingChart ? (
                        <Skeleton className="h-[500px] w-full" />
                    ) : (
                        <TradingChart data={chartData} />
                    )}
                </CardContent>
            </Card>
            <AnalysisPanel />
        </div>
    );
};

export default Home;