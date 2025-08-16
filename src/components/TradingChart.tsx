import * as LightweightCharts from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

export type ChartData = LightweightCharts.CandlestickData;

export const TradingChart = ({ data }: { data: ChartData[] }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<LightweightCharts.IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) {
            return;
        }

        // Ensure data is sorted by time, as required by the library
        const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));

        // Remove the previous chart instance before creating a new one
        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
        }

        const chart = LightweightCharts.createChart(chartContainerRef.current, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: 'hsl(var(--muted))' },
                textColor: 'hsl(var(--foreground))',
            },
            grid: {
                vertLines: { color: 'hsl(var(--border))' },
                horzLines: { color: 'hsl(var(--border))' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
        });
        chartInstanceRef.current = chart;

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderDownColor: '#ef5350',
            borderUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            wickUpColor: '#26a69a',
        });

        candlestickSeries.setData(sortedData);
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartInstanceRef.current && chartContainerRef.current) {
                chartInstanceRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartInstanceRef.current) {
                chartInstanceRef.current.remove();
                chartInstanceRef.current = null;
            }
        };
    }, [data]);

    return <div ref={chartContainerRef} className="w-full h-[500px]" />;
};

export default TradingChart;