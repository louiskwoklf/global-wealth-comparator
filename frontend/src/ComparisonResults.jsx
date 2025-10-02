import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { toPng } from 'html-to-image';

import { Button } from './components/ui/button';

import nameToNumeric from './country_name_to_numeric.js';

export default function ResultsPage() {
  const { state } = useLocation();
  const [results, setResults] = useState(state?.results || []);
  const {
    timestampMonth,
    timestampYear,
    referenceMonth,
    referenceYear,
  } = state || {};
  const resolvedMonth = timestampMonth || referenceMonth;
  const resolvedYear = timestampYear || referenceYear;
  const timestampLabel = resolvedMonth && resolvedYear ? `${resolvedMonth} ${resolvedYear}` : null;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthIndex = resolvedMonth ? monthNames.indexOf(resolvedMonth) : -1;
  const numericTimestamp =
    resolvedYear && monthIndex >= 0
      ? `${resolvedYear}-${String(monthIndex + 1).padStart(2, '0')}`
      : null;
  const titleText = `Wealth Comparison Results${timestampLabel ? ` (${timestampLabel})` : ''}`;
  const captureRef = useRef(null);

  const handleScreenshot = async () => {
    if (!captureRef.current) return;

    const TARGET_WIDTH = 960;
    const TARGET_HEIGHT = 640;
    const element = captureRef.current;
    const originalInlineStyle = element.getAttribute('style');

    element.style.width = `${TARGET_WIDTH}px`;
    element.style.height = `${TARGET_HEIGHT}px`;
    element.style.display = 'flex';
    element.style.flexDirection = 'column';

    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#f9f7f3',
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `wealth-comparison-${numericTimestamp || 'latest'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      alert('Could not capture the screenshot. Please try again.');
    } finally {
      if (originalInlineStyle) {
        element.setAttribute('style', originalInlineStyle);
      } else {
        element.removeAttribute('style');
      }
    }
  };

  useEffect(() => {
    if (!results.length || !d3.select('#world-map').node()) return;

    const width = 960;
    const height = 540;

    const svg = d3.select('#world-map')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .classed('w-full', true)
      .classed('h-full', true);

    svg.selectAll('*').remove();

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none');

    const projection = d3.geoNaturalEarth1()
      .scale(180)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const resultMap = {};
    results.forEach(r => {
      const code = nameToNumeric[r.target_country];
      if (code) resultMap[code.padStart(3, '0')] = r;
    });

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(worldData => {
        const countries = topojson.feature(worldData, worldData.objects.countries).features;

        svg.selectAll('path')
          .data(countries)
          .enter().append('path')
          .attr('d', path)
          .attr('fill', d => {
              const id = String(d.id).padStart(3, '0');
              const r = resultMap[id];
              if (!r) return 'transparent';

              const percentile = r.wealth_percentile;
              if (percentile < 50) return '#e66c6c'; // medium soft red
              if (percentile >= 99) return '#93c47d'; // medium soft green
              if (percentile >= 90) return '#ffe599'; // medium soft yellow
              return '#f6b26b'; // medium soft orange
          })
          .attr('stroke', '#555')
          .attr('stroke-width', 0.7)
          .on('mouseover', function(event, d) {
            const id = String(d.id).padStart(3, '0');
            if (resultMap[id]) {
                const r = resultMap[id];
                const topPercent = 100 - r.wealth_percentile;
                tooltip
                    .style('visibility', 'visible')
                    .html(`<strong>${r.target_country}</strong><br/>Top ${Math.round(topPercent)}%`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px');
                d3.select(this).attr('stroke', '#000').attr('stroke-width', 1.5);
            }
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY + 10) + 'px');
          })
          .on('mouseout', function() {
            tooltip.style('visibility', 'hidden');
            d3.select(this).attr('stroke', '#555').attr('stroke-width', 0.7);
          });
      });
      
    return () => {
        tooltip.remove();
    };

  }, [results]);

  if (!results.length) return <p>Loading results or no results to display...</p>;

  return (
    <div className="min-h-screen bg-[#f9f7f3] text-neutral-800 flex items-center justify-center p-4">
      <div className="w-full flex flex-col items-center gap-6">
        <div
          ref={captureRef}
          className="w-full max-w-[960px] bg-white/90 border border-neutral-200 rounded-2xl shadow-sm p-6 flex flex-col gap-6"
        >
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-center">{titleText}</h1>
          </div>
          <div className="flex-1 min-h-[360px]">
            <svg id="world-map" className="w-full h-full" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleScreenshot}
            className="bg-black text-white border border-transparent hover:bg-gray-500 hover:text-black hover:border-gray-800 transition-colors duration-200 ease-in-out cursor-pointer"
            type="button"
          >
            Download Wealth Snapshot
          </Button>
          <Link to="/" className="text-blue-600 hover:underline cursor-pointer">
            ← Compare again
          </Link>
        </div>
      </div>
    </div>
  );
}
