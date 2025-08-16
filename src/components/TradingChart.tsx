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

export const TradingChart = ({
    data,
    analysisResult,
    latestCandle,
    triggeredAlerts,
}: {
    data: ChartData[];
    analysisResult: AnalysisResult | null;
    latestCandle: ChartData | null;
    triggeredAlerts: Set<string>;
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<LightweightCharts.IChartApi | null>(null);
    const seriesRef = useRef<LightweightCharts.ISeriesApi<'Candlestick'> | null>(null);
    
    // Refs for the new signal visualization
    const trendLineSeriesRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const entryLineRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const tpLineRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const slLineRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const analysisTimeRef = useRef<LightweightCharts.UTCTimestamp | null>(null);
    const tradeEndTimeRef = useRef<LightweightCharts.UTCTimestamp | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) {
            return;
        }

        // Sanitize and sort data: remove duplicates and ensure ascending order by time.
        const uniqueData = Array.from(new Map(data.map(item => [item.time, item])).values());
        const sortedData = uniqueData.sort((a, b) => (a.time as number) - (b.time as number));

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

    // Effect to draw and manage analysis visualizations
    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart || !seriesRef.current || !chartContainerRef.current) return;

        // --- Cleanup function to remove all previous drawings ---
        const cleanupDrawings = () => {
            if (entryLineRef.current) chart.removeSeries(entryLineRef.current);
            if (tpLineRef.current) chart.removeSeries(tpLineRef.current);
            if (slLineRef.current) chart.removeSeries(slLineRef.current);
            if (trendLineSeriesRef.current) chart.removeSeries(trendLineSeriesRef.current);
            entryLineRef.current = null;
            tpLineRef.current = null;
            slLineRef.current = null;
            trendLineSeriesRef.current = null;
            analysisTimeRef.current = null;
            tradeEndTimeRef.current = null;
        };

        cleanupDrawings();

        if (!analysisResult || data.length === 0) {
            return;
        }

        // --- Setup new line series for the trade signal ---
        const colors = getChartColors(chartContainerRef.current);
        const lastCandleTime = data[data.length - 1].time as LightweightCharts.UTCTimestamp;
        analysisTimeRef.current = lastCandleTime;

        const entryPrice = parseFloat(String(analysisResult.entryPrice).replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(String(analysisResult.takeProfit).replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(String(analysisResult.stopLoss).replace(/[^0-9.-]+/g, ""));

        const commonLineOptions = {
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
            lineWidth: 2,
        } as const;

        // Create Take Profit line
        if (!isNaN(takeProfit)) {
            tpLineRef.current = chart.addLineSeries({ ...commonLineOptions, color: colors.greenColor });
            tpLineRef.current.setData([{ time: lastCandleTime, value: takeProfit }]);
        }

        // Create Stop Loss line
        if (!isNaN(stopLoss)) {
            slLineRef.current = chart.addLineSeries({ ...commonLineOptions, color: colors.redColor });
            slLineRef.current.setData([{ time: lastCandleTime, value: stopLoss }]);
        }

        // Create Entry line
        if (!isNaN(entryPrice)) {
            entryLineRef.current = chart.addLineSeries({ ...commonLineOptions, color: colors.primaryColor, lineStyle: LightweightCharts.LineStyle.Dashed });
            entryLineRef.current.setData([{ time: lastCandleTime, value: entryPrice }]);
        }

        // Draw Trendlines from analysis
        if (analysisResult.drawings && Array.isArray(analysisResult.drawings)) {
            const trendline = analysisResult.drawings.find(d => d.type === 'trendline');
            if (trendline && trendline.points.length >= 2) {
                trendLineSeriesRef.current = chart.addLineSeries({
                    color: colors.yellowColor,
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false,
                } as const);
                const uniquePoints = Array.from(new Map(trendline.points.map(item => [item.time, item])).values());
                const sortedPoints = uniquePoints.sort((a, b) => a.time - b.time);
                trendLineSeriesRef.current.setData(sortedPoints.map(p => ({ time: p.time as LightweightCharts.UTCTimestamp, value: p.price })));
            }
        }
    }, [analysisResult, data]);

    // Effect to extend the lines with new candle data
    useEffect(() => {
        if (!analysisResult || !latestCandle || !analysisTimeRef.current) return;

        // Check if trade has ended and lock the end time
        if (!tradeEndTimeRef.current && (triggeredAlerts.has('tp') || triggeredAlerts.has('sl'))) {
            tradeEndTimeRef.current = latestCandle.time as LightweightCharts.UTCTimestamp;
        }

        const startTime = analysisTimeRef.current;
        const endTime = tradeEndTimeRef.current || (latestCandle.time as LightweightCharts.UTCTimestamp);

        // Definitive fix: only update the line series if the new candle's time is after the analysis time.
        if (endTime <= startTime) {
            return;
        }

        const entryPrice = parseFloat(String(analysisResult.entryPrice).replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(String(analysisResult.takeProfit).replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(String(analysisResult.stopLoss).replace(/[^0-9.-]+/g, ""));

        const updateLine = (lineRef: React.RefObject<LightweightCharts.ISeriesApi<'Line'> | null>, price: number) => {
            if (lineRef.current && !isNaN(price)) {
                lineRef.current.setData([
                    { time: startTime, value: price },
                    { time: endTime, value: price },
                ]);
            }
        };

        updateLine(tpLineRef, takeProfit);
        updateLine(slLineRef, stopLoss);
        updateLine(entryLineRef, entryPrice);

    }, [latestCandle, analysisResult, triggeredAlerts]);

    // Effect to update the main candlestick series
    useEffect(() => {
        if (seriesRef.current && latestCandle) {
            seriesRef.current.update(latestCandle);
        }
    }, [latestCandle]);

    return <div ref={chartContainerRef} className="w-full h-[500px]" />;
};

export default TradingChart;