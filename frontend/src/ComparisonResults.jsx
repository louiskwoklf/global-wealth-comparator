import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function ResultsPage() {
  const { state } = useLocation();
  const [result, setResult] = useState(state);

  // If you’d rather re-fetch based on URL params:
  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   fetch('/api/submit?' + params.toString())
  //     .then(r => r.json())
  //     .then(j => setResult(j.result));
  // }, []);

  if (!result) return <p>Loading…</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Your Wealth Comparison</h1>
      <ul className="space-y-2">
        <li>
          <strong>Original Net Worth:</strong> {result.input_currency} {result.original_net_worth.toLocaleString()}
        </li>
        <li>
          <strong>In {result.official_currency}:</strong> {result.converted_net_worth_in_official.toLocaleString()}
        </li>
        <li>
          <strong>After Inflation:</strong> {result.deflated_net_worth.toLocaleString()}
        </li>
        <li>
          <strong>PPP-Adjusted:</strong> {result.international_net_worth.toLocaleString()}
        </li>
        <li>
          <strong>Wealth Bracket:</strong> you’re in the “{result.wealth_threshold.toLocaleString()}” threshold ({result.wealth_percentile} percentile) in {result.target_country}
        </li>
      </ul>

      <Link to="/" className="mt-6 inline-block text-blue-600 hover:underline">
        ← Compare again
      </Link>
    </div>
  );
}