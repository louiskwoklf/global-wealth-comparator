import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function ResultsPage() {
  const { state } = useLocation();
  const [result, setResult] = useState(state);
  const topPercent = 100 - result.wealth_percentile;

  // If you’d rather re-fetch based on URL params:
  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   fetch('/api/submit?' + params.toString())
  //     .then(r => r.json())
  //     .then(j => setResult(j.result));
  // }, []);

  if (!result) return <p>Loading…</p>;

  return (
    <div className="min-h-screen bg-[#f9f7f3] text-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-center">Wealth Comparison Results</h1>
        <p className="text-lg">
          {`With ${result.input_currency} ${result.original_net_worth.toLocaleString()}, you're in the top ${topPercent}% in ${result.target_country}.`}
        </p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline cursor-pointer">
          ← Compare again
        </Link>
      </div>
    </div>
  );
}