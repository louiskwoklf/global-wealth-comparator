import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from 'react-router-dom';
import ComparisonResults from './ComparisonResults';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { ChevronDown } from "lucide-react";

export default function GlobalWealthComparator() {
  const [residence, setResidence] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [netWorth, setNetWorth] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleNetWorthChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '' || rawValue === '-') {
      setNetWorth(rawValue);
      return;
    }
    if (/^-?\d*$/.test(rawValue)) {
        const numericValue = Number(rawValue);
        if (!isNaN(numericValue)) {
            setNetWorth(numericValue.toLocaleString('en-US'));
        }
    }
  };

  const [currencies, setCurrencies] = useState([]);
  const [residenceGroups, setResidenceGroups] = useState({});
  const navigate = useNavigate();
  
  const isFormValid = netWorth !== '' && netWorth !== '-' && residence !== '';

  useEffect(() => {
    fetch("/api/residence-countries")
      .then((res) => res.json())
      .then((data) => setResidenceGroups(data))
      .catch(console.error);

    fetch("https://api.frankfurter.app/currencies")
      .then((res) => res.json())
      .then((data) => setCurrencies(Object.keys(data).sort()))
      .catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setIsLoading(true);

    const rawNetWorth = netWorth.replace(/,/g, '');
    const payload = { currency, netWorth: rawNetWorth, residence };

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Submission failed");
      }

      const json = await res.json();
      navigate('/results', { state: { results: json.results } });
    } catch (err) {
      console.error("Submission error:", err);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCountryGridBody = (groups, onSelect) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {Object.entries(groups).map(([region, countries]) => (
        <div key={region} className="space-y-2">
          <h3 className="text-sm font-semibold">{region}</h3>
          {countries.map((country) => (
            <DialogClose asChild key={country}>
              <Button
                variant="ghost"
                className="w-full justify-start text-left whitespace-nowrap border rounded-md px-3 py-2 hover:bg-gray-600 hover:text-white hover:border-gray-800 transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                onClick={() => onSelect(country)}
                type="button"
              >
                {country}
              </Button>
            </DialogClose>
          ))}
        </div>
      ))}
    </div>
  );

  const Popup = ({ value, onSelect, label, groups }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" type="button">
          {value ? value : `Select ${label}`}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[90vw] sm:max-w-[600px] md:max-w-[900px] lg:max-w-[1200px] bg-white rounded-2xl shadow-lg p-6 h-[60vh] flex flex-col">
        <DialogTitle>{label}</DialogTitle>
        <DialogDescription>Choose a country (continents are labeled inside each column).</DialogDescription>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pt-4">
          {renderCountryGridBody(groups, onSelect)}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen bg-[#f9f7f3] text-neutral-800 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6">
            <h1 className="text-2xl font-semibold text-center">Global Wealth Comparator</h1>

            {/* Net Worth Input */}
            <div>
              <label htmlFor="net-worth-input" className="block text-sm font-medium mb-1 text-center">
                Net Worth
              </label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-between focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" type="button">
                    {netWorth ? `${currency} ${netWorth}` : "Enter Net Worth"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="bg-white rounded-2xl shadow-lg p-6 max-h-[80vh] overflow-y-auto"
                >
                  <DialogTitle>Net Worth</DialogTitle>
                  <DialogDescription>Select your currency and enter your net worth.</DialogDescription>
                  <div className="pt-0 space-y-2">
                    <div className="flex gap-2 mb-4">
                      <select
                        id="currency-select"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="border rounded px-3 py-2 w-1/3 focus:outline-none focus:ring-0"
                      >
                        {currencies.map((cur) => (
                          <option key={cur} value={cur}>
                            {cur}
                          </option>
                        ))}
                      </select>
                      <Input
                        id="net-worth-input"
                        type="text"
                        value={netWorth}
                        onChange={handleNetWorthChange}
                        placeholder="Net Worth"
                        className="w-2/3 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <DialogClose asChild>
                      <Button className="w-full bg-black text-white border border-transparent hover:bg-gray-500 hover:text-black hover:border-gray-800 transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" type="button">
                        OK
                      </Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Country of Residence */}
            <div>
              <label className="block text-sm font-medium mb-1 text-center">
                Country of Residence
              </label>
              <Popup
                value={residence}
                onSelect={setResidence}
                label="Country of Residence"
                groups={residenceGroups}
              />
            </div>

            {/* Submit Button */}
            <div>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading} // Disable when loading
                className="w-full bg-black text-white border border-transparent hover:bg-gray-500 hover:text-black hover:border-gray-800 transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isLoading ? "Submitting..." : "Submit"}
              </Button>
            </div>

            <div className="text-xs text-center text-gray-500 mt-2">
              We respect your privacy. Your input is used only to run the comparison and is not viewed or stored.
            </div>
            <div className="text-xs text-center text-gray-500">
              Data source: World Inequality Database
            </div>
          </div>
        </div>
      } />
      <Route path="/results" element={<ComparisonResults />} />
    </Routes>
  );
}