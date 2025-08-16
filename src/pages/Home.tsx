import { useEffect, useState } from 'react';
import TradingChart, { ChartData } from '@/components/TradingChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import AnalysisPanel from '@/components/AnalysisPanel';
import * as LightweightCharts from 'lightweight-charts';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import RecentHistory from '@/components/RecentHistory';

const Home = () => {
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [searchTerm, setSearchTerm] = useState('BTCUSDT');
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (debouncedSearchTerm) {
            // Sanitize and uppercase the symbol before setting it
            setSymbol(debouncedSearchTerm.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }
    }, [debouncedSearchTerm]);

    useEffect(() => {
        const fetchChartData = async () => {
            if (!symbol) return;

            setLoadingChart(true);
            try {
                const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=150`);
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
                setChartData([]); // Clear data on error
                showError((error as Error).message || `Could not load data for ${symbol}.`);
            } finally {
                setLoadingChart(false);
            }
        };

        fetchChartData();
    }, [symbol]);

    return (
        <div className="flex flex-1 flex-col gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{symbol ? `${symbol.replace('USDT', '/USDT')} Chart` : 'Enter a symbol'}</CardTitle>
                    <div className="w-full max-w-xs">
                        <Input
                            placeholder="e.g., BTCUSDT"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingChart ? (
                        <Skeleton className="h-[500px] w-full" />
                    ) : chartData.length > 0 ? (
                        <TradingChart data={chartData} />
                    ) : (
                        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                            No chart data available for {symbol}. Please check the symbol and try again.
                        </div>
                    )}
                </CardContent>
            </Card>
            <AnalysisPanel chartData={chartData} symbol={symbol} />
            <RecentHistory />
        </div>
    );
};

export default Home;