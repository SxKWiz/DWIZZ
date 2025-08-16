import * as LightweightCharts from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { AnalysisResult } from './AnalysisResultDisplay';

export type ChartData = LightweightCharts.CandlestickData;

export const TradingChart = ({ data, analysisResult }: { data: ChartData[], analysisResult: AnalysisResult | null }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<LightweightCharts.IChartApi | null>(null);
    const seriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
    const priceLinesRef = useRef<LightweightCharts.IPriceLine[]>([]);
    const trendLineSeriesRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) {
            return;
        }

        const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));

        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
        }

        const chart = LightweightCharts.createChart(chartContainerRef.current, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
                textColor: 'hsl(var(--foreground))',
            },
            grid: {
                vertLines: { color: 'hsl(var(--border))' },
                horzLines: { color: 'hsl(var(--border))' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            rightPriceScale: {
                visible: true,
                borderColor: 'hsl(var(--border))',
            },
            timeScale: {
                visible: true,
                borderColor: 'hsl(var(--border))',
            },
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
        seriesRef.current = candlestickSeries;
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

    useEffect(() => {
        const chart = chartInstanceRef.current;
        const series = seriesRef.current;

        if (!chart || !series) return;

        // Clear previous drawings
        priceLinesRef.current.forEach(line => series.removePriceLine(line));
        priceLinesRef.current = [];
        if (trendLineSeriesRef.current) {
            chart.removeSeries(trendLineSeriesRef.current);
            trendLineSeriesRef.current = null;
        }

        if (!analysisResult) {
            return;
        }

        // Draw Price Lines for Entry, TP, SL
        const entryPrice = parseFloat(analysisResult.entryPrice.replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(analysisResult.takeProfit.replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(analysisResult.stopLoss.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(entryPrice)) {
            priceLinesRef.current.push(series.createPriceLine({
                price: entryPrice,
                color: 'hsl(var(--primary))',
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'Entry',
            }));
        }
        if (!isNaN(takeProfit)) {
            priceLinesRef.current.push(series.createPriceLine({
                price: takeProfit,
                color: 'hsl(142.1 76.2% 36.3%)',
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
                axisLabelVisible: true,
                title: 'Take Profit',
            }));
        }
        if (!isNaN(stopLoss)) {
            priceLinesRef.current.push(series.createPriceLine({
                price: stopLoss,
                color: 'hsl(0 84.2% 60.2%)',
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
                axisLabelVisible: true,
                title: 'Stop Loss',
            }));
        }

        // Draw Trendlines
        if (analysisResult.drawings && Array.isArray(analysisResult.drawings)) {
            const trendline = analysisResult.drawings.find(d => d.type === 'trendline');
            if (trendline && trendline.points.length >= 2) {
                const lineSeries = chart.addLineSeries({
                    color: 'hsl(38.5 95.6% 58.6%)',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false,
                });
                const sortedPoints = [...trendline.points].sort((a, b) => a.time - b.time);
                lineSeries.setData(sortedPoints.map(p => ({ time: p.time as LightweightCharts.UTCTimestamp, value: p.price })));
                trendLineSeriesRef.current = lineSeries;
            }
        }
    }, [analysisResult]);

    return <div ref={chartContainerRef} className="w-full h-[500px]" />;
};

export default TradingChart;