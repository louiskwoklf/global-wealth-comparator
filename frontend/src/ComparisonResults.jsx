import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

import nameToNumeric from './country_name_to_numeric.js';

export default function ResultsPage() {
  const { state } = useLocation();
  const [results, setResults] = useState(state?.results || []);

  useEffect(() => {
    if (!results.length || !d3.select('#world-map').node()) return;

    const width = 960;
    const height = 540;

    const svg = d3.select('#world-map')
      .attr('width', width)
      .attr('height', height);

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
    <div className="min-h-screen bg-[#f9f7f3] text-neutral-800 flex flex-col items-center justify-center p-4 space-y-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-center">Wealth Comparison Results</h1>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline cursor-pointer">
          ← Compare again
        </Link>
      </div>
      <svg id="world-map" className="mt-8" />
    </div>
  );
}