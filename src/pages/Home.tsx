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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { AnalysisResult } from '@/components/AnalysisResultDisplay';

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
            setAnalysisResult(null); // Clear analysis when symbol changes
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
                setChartData([]); // Clear data on error
                showError((error as Error).message || `Could not load data for ${symbol}.`);
            } finally {
                setLoadingChart(false);
            }
        };

        fetchChartData();
    }, [symbol, timeframe]);

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
                        <TradingChart data={chartData} analysisResult={analysisResult} />
                    ) : (
                        <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                            No chart data available for {symbol}. Please check the symbol and try again.
                        </div>
                    )}
                </CardContent>
            </Card>
            <AnalysisPanel chartData={chartData} symbol={symbol} onAnalysisComplete={setAnalysisResult} />
            <RecentHistory />
        </div>
    );
};

export default Home;