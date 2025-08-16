import * as LightweightCharts from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';
import { AnalysisResult } from './AnalysisResultDisplay';

export type ChartData = LightweightCharts.CandlestickData;

// HSL to RGB conversion function
const hslToRgb = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
        l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const r = Math.round(255 * f(0));
    const g = Math.round(255 * f(8));
    const b = Math.round(255 * f(4));
    return `rgb(${r}, ${g}, ${b})`;
};

// Helper function to get and format CSS variables for the chart
const getChartColors = (element: HTMLElement) => {
    const computedStyle = getComputedStyle(element);
    
    const resolveVarToRgb = (variable: string): string => {
        const hslString = computedStyle.getPropertyValue(variable).trim(); // e.g., "222.2 84% 4.9%"
        const [h, s, l] = hslString.split(' ').map(val => parseFloat(val.replace('%', '')));
        if (isNaN(h) || isNaN(s) || isNaN(l)) return '#000000'; // Fallback color
        return hslToRgb(h, s, l);
    };
    
    return {
        textColor: resolveVarToRgb('--foreground'),
        borderColor: resolveVarToRgb('--border'),
        primaryColor: resolveVarToRgb('--primary'),
        greenColor: '#26a69a', // Use safe hex for candlestick colors
        redColor: '#ef5350',   // Use safe hex for candlestick colors
        yellowColor: '#FFEB3B', // Use safe hex for trendlines to avoid parsing errors
    };
};

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

        const colors = getChartColors(chartContainerRef.current);

        const chart = LightweightCharts.createChart(chartContainerRef.current, {
            layout: {
                background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
                textColor: colors.textColor,
            },
            grid: {
                vertLines: { color: colors.borderColor },
                horzLines: { color: colors.borderColor },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            rightPriceScale: {
                visible: true,
                borderColor: colors.borderColor,
            },
            timeScale: {
                visible: true,
                borderColor: colors.borderColor,
            },
        });
        chartInstanceRef.current = chart;

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: colors.greenColor,
            downColor: colors.redColor,
            borderDownColor: colors.redColor,
            borderUpColor: colors.greenColor,
            wickDownColor: colors.redColor,
            wickUpColor: colors.greenColor,
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

        if (!chart || !series || !chartContainerRef.current) return;

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

        const colors = getChartColors(chartContainerRef.current);

        // Draw Price Lines for Entry, TP, SL
        const entryPrice = parseFloat(analysisResult.entryPrice.replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(analysisResult.takeProfit.replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(analysisResult.stopLoss.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(entryPrice)) {
            priceLinesRef.current.push(series.createPriceLine({
                price: entryPrice,
                color: colors.primaryColor,
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'Entry',
            }));
        }
        if (!isNaN(takeProfit)) {
            priceLinesRef.current.push(series.createPriceLine({
                price: takeProfit,
                color: colors.greenColor,
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
                axisLabelVisible: true,
                title: 'Take Profit',
            }));
        }
        if (!isNaN(stopLoss)) {
            priceLinesRef.current.push(series.createPriceLine({
                price: stopLoss,
                color: colors.redColor,
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
                    color: colors.yellowColor,
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