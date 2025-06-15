import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

export default function ResultsPage() {
  const { state } = useLocation();
  const [result, setResult] = useState(state);
  const topPercent = 100 - result.wealth_percentile;

  useEffect(() => {
    const width = 600;
    const height = 350;

    const svg = d3.select('#world-map')
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const projection = d3.geoNaturalEarth1()
      .scale(130)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    Promise.all([
      fetch('/api/target-countries').then(res => res.json()),
      fetch('/country_name_to_numeric.json').then(res => res.json())
    ])
    .then(([grouped, nameToNumeric]) => {
      const allowedNames = Object.values(grouped).flat();
      const allowedNumeric = [];

      allowedNames.forEach(name => {
        const code = nameToNumeric[name];
        if (code) {
          allowedNumeric.push(code);
        }
      });

      d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        .then(worldData => {
          const countries = topojson.feature(worldData, worldData.objects.countries).features;

          svg.selectAll('path')
            .data(countries)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', 'transparent')
            .attr('stroke', '#555')
            .attr('stroke-width', 0.7)
            .each(function (d) {
              const id = String(d.id).padStart(3, '0');
              if (allowedNumeric.includes(id)) {
                d3.select(this)
                  .on('mouseover', function () {
                    d3.select(this).attr('stroke', '#ff6600').attr('stroke-width', 1.5);
                  })
                  .on('mouseout', function () {
                    d3.select(this).attr('stroke', '#555').attr('stroke-width', 0.7);
                  });
              }
            });
      });
    });
  }, []);

  if (!result) return <p>Loading…</p>;

  return (
    <div className="min-h-screen bg-[#f9f7f3] text-neutral-800 flex flex-col items-center justify-center p-4 space-y-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-center">Wealth Comparison Results</h1>
        <p className="text-lg">
          {`With ${result.input_currency} ${result.original_net_worth.toLocaleString()} in ${result.residence_country}, you could enjoy a lifestyle on par with the top ${topPercent}% in ${result.target_country}.`}
        </p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline cursor-pointer">
          ← Compare again
        </Link>
      </div>
      <svg id="world-map" className="mt-8" />
    </div>
  );
}