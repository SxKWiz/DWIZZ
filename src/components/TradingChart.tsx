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
    
    const rgbString = resolveVarToRgb('--background');
    const backgroundColor = `rgba(${rgbString.match(/\d+/g)?.join(', ')}, 1)`;

    return {
        textColor: resolveVarToRgb('--foreground'),
        borderColor: resolveVarToRgb('--border'),
        primaryColor: resolveVarToRgb('--primary'),
        greenColor: '#26a69a',
        redColor: '#ef5350',
        yellowColor: '#FFEB3B',
        backgroundColor: backgroundColor, // Important for erasing fill
        greenFillColor: 'rgba(38, 166, 154, 0.3)',
        redFillColor: 'rgba(239, 83, 80, 0.3)',
    };
};

export const TradingChart = ({
    data,
    analysisResult,
    latestCandle,
    triggeredAlerts,
    height = 500,
}: {
    data: ChartData[];
    analysisResult: AnalysisResult | null;
    latestCandle: ChartData | null;
    triggeredAlerts: Set<string>;
    height?: number;
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<LightweightCharts.IChartApi | null>(null);
    const seriesRef = useRef<LightweightCharts.ISeriesApi<'Candlestick'> | null>(null);
    
    const trendLineSeriesRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const entryLineRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const tpLineRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const slLineRef = useRef<LightweightCharts.ISeriesApi<'Line'> | null>(null);
    const analysisTimeRef = useRef<LightweightCharts.UTCTimestamp | null>(null);
    const tradeEndTimeRef = useRef<LightweightCharts.UTCTimestamp | null>(null);
    const tpRegionSeries = useRef<LightweightCharts.ISeriesApi<'Area'>[]>([]);
    const slRegionSeries = useRef<LightweightCharts.ISeriesApi<'Area'>[]>([]);

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) {
            return;
        }

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
            height: height,
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
    }, [data, height]);

    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart || !seriesRef.current || !chartContainerRef.current) return;

        const cleanupDrawings = () => {
            if (entryLineRef.current) chart.removeSeries(entryLineRef.current);
            if (tpLineRef.current) chart.removeSeries(tpLineRef.current);
            if (slLineRef.current) chart.removeSeries(slLineRef.current);
            if (trendLineSeriesRef.current) chart.removeSeries(trendLineSeriesRef.current);
            tpRegionSeries.current.forEach(s => chart.removeSeries(s));
            slRegionSeries.current.forEach(s => chart.removeSeries(s));
            entryLineRef.current = null;
            tpLineRef.current = null;
            slLineRef.current = null;
            trendLineSeriesRef.current = null;
            tpRegionSeries.current = [];
            slRegionSeries.current = [];
            analysisTimeRef.current = null;
            tradeEndTimeRef.current = null;
        };

        cleanupDrawings();

        if (!analysisResult || data.length === 0) {
            return;
        }

        const colors = getChartColors(chartContainerRef.current);
        const lastCandleTime = data[data.length - 1].time as LightweightCharts.UTCTimestamp;
        analysisTimeRef.current = lastCandleTime;

        const entryPrice = parseFloat(String(analysisResult.entryPrice).replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(String(analysisResult.takeProfit).replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(String(analysisResult.stopLoss).replace(/[^0-9.-]+/g, ""));

        const commonLineOptions = { lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, lineWidth: 2 } as const;
        if (!isNaN(takeProfit)) {
            tpLineRef.current = chart.addLineSeries({ ...commonLineOptions, color: colors.greenColor });
            tpLineRef.current.setData([{ time: lastCandleTime, value: takeProfit }]);
        }
        if (!isNaN(stopLoss)) {
            slLineRef.current = chart.addLineSeries({ ...commonLineOptions, color: colors.redColor });
            slLineRef.current.setData([{ time: lastCandleTime, value: stopLoss }]);
        }
        if (!isNaN(entryPrice)) {
            entryLineRef.current = chart.addLineSeries({ ...commonLineOptions, color: colors.primaryColor, lineStyle: LightweightCharts.LineStyle.Dashed });
            entryLineRef.current.setData([{ time: lastCandleTime, value: entryPrice }]);
        }

        const createRegion = (topPrice: number, bottomPrice: number, fillColor: string): LightweightCharts.ISeriesApi<'Area'>[] => {
            if (isNaN(topPrice) || isNaN(bottomPrice)) return [];
            const commonAreaOptions = {
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
                lineColor: 'transparent',
            };
            const fillSeries = chart.addAreaSeries({ ...commonAreaOptions, topColor: fillColor, bottomColor: fillColor });
            fillSeries.setData([{ time: lastCandleTime, value: topPrice }]);
            const eraseSeries = chart.addAreaSeries({ ...commonAreaOptions, topColor: colors.backgroundColor, bottomColor: colors.backgroundColor });
            eraseSeries.setData([{ time: lastCandleTime, value: bottomPrice }]);
            return [fillSeries, eraseSeries];
        };

        const isLong = takeProfit > entryPrice;
        if (isLong) {
            tpRegionSeries.current = createRegion(takeProfit, entryPrice, colors.greenFillColor);
            slRegionSeries.current = createRegion(entryPrice, stopLoss, colors.redFillColor);
        } else {
            tpRegionSeries.current = createRegion(entryPrice, takeProfit, colors.greenFillColor);
            slRegionSeries.current = createRegion(stopLoss, entryPrice, colors.redFillColor);
        }

        if (analysisResult.drawings && Array.isArray(analysisResult.drawings)) {
            const trendline = analysisResult.drawings.find(d => d.type === 'trendline');
            if (trendline && trendline.points.length >= 2) {
                trendLineSeriesRef.current = chart.addLineSeries({ color: colors.yellowColor, lineWidth: 2, lineStyle: LightweightCharts.LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false } as const);
                const uniquePoints = Array.from(new Map(trendline.points.map(item => [item.time, item])).values());
                const sortedPoints = uniquePoints.sort((a, b) => a.time - b.time);
                trendLineSeriesRef.current.setData(sortedPoints.map(p => ({ time: p.time as LightweightCharts.UTCTimestamp, value: p.price })));
            }
        }
    }, [analysisResult, data]);

    useEffect(() => {
        if (!analysisResult || !latestCandle || !analysisTimeRef.current || data.length < 2) return;

        if (!tradeEndTimeRef.current && (triggeredAlerts.has('tp') || triggeredAlerts.has('sl'))) {
            tradeEndTimeRef.current = latestCandle.time as LightweightCharts.UTCTimestamp;
        }

        const startTime = analysisTimeRef.current;
        const realEndTime = tradeEndTimeRef.current || (latestCandle.time as LightweightCharts.UTCTimestamp);

        if (realEndTime <= startTime) return;

        const interval = (data[data.length - 1].time as number) - (data[data.length - 2].time as number);
        const projectionCandles = 300; // Increased width
        const projectedEndTime = (realEndTime as number) + (interval * projectionCandles);
        
        const endTime = (tradeEndTimeRef.current ? realEndTime : projectedEndTime) as LightweightCharts.UTCTimestamp;

        const entryPrice = parseFloat(String(analysisResult.entryPrice).replace(/[^0-9.-]+/g, ""));
        const takeProfit = parseFloat(String(analysisResult.takeProfit).replace(/[^0-9.-]+/g, ""));
        const stopLoss = parseFloat(String(analysisResult.stopLoss).replace(/[^0-9.-]+/g, ""));

        const updateLine = (lineRef: React.RefObject<LightweightCharts.ISeriesApi<'Line'> | null>, price: number) => {
            if (lineRef.current && !isNaN(price)) {
                lineRef.current.setData([{ time: startTime, value: price }, { time: endTime, value: price }]);
            }
        };
        updateLine(tpLineRef, takeProfit);
        updateLine(slLineRef, stopLoss);
        updateLine(entryLineRef, entryPrice);

        const updateRegion = (regionArr: LightweightCharts.ISeriesApi<'Area'>[], topPrice: number, bottomPrice: number) => {
            if (regionArr.length !== 2 || isNaN(topPrice) || isNaN(bottomPrice)) return;
            const [fillSeries, eraseSeries] = regionArr;
            fillSeries.setData([{ time: startTime, value: topPrice }, { time: endTime, value: topPrice }]);
            eraseSeries.setData([{ time: startTime, value: bottomPrice }, { time: endTime, value: bottomPrice }]);
        };

        const isLong = takeProfit > entryPrice;
        if (isLong) {
            updateRegion(tpRegionSeries.current, takeProfit, entryPrice);
            updateRegion(slRegionSeries.current, entryPrice, stopLoss);
        } else {
            updateRegion(tpRegionSeries.current, entryPrice, takeProfit);
            updateRegion(slRegionSeries.current, stopLoss, entryPrice);
        }
    }, [latestCandle, analysisResult, triggeredAlerts, data]);

    useEffect(() => {
        if (seriesRef.current && latestCandle) {
            seriesRef.current.update(latestCandle);
        }
    }, [latestCandle]);

    return <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />;
};

export default TradingChart;