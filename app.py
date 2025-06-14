from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
import pycountry
from babel.numbers import get_territory_currencies
import pandas as pd
import os
import requests
import pycountry_convert as pc

CONTINENT_NAMES = {
    "AF": "Africa",
    "AS": "Asia",
    "OC": "Oceania",
    "EU": "Europe",
    "NA": "Americas",
    "SA": "Americas",
    "AN": "Antarctica",
}

app = Flask(__name__)
CORS(app)

def get_latest_exchange_rate(base_currency, target_currency):
    for i in range(7):
        check_date = datetime.now(timezone.utc).date() - timedelta(days=i)
        date_str = check_date.strftime("%Y-%m-%d")
        url = f"https://api.frankfurter.app/{date_str}?from={base_currency}&to={target_currency}"
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                rate = data.get("rates", {}).get(target_currency)
                if rate:
                    return rate
        except requests.exceptions.RequestException:
            continue    
    raise ValueError(f"Could not retrieve exchange rate for {base_currency} to {target_currency} in the last 7 days.")

def get_country_alpha2_code(country_name):
    country = (
        pycountry.countries.get(name=country_name)
        or pycountry.countries.get(common_name=country_name)
        or pycountry.countries.get(official_name=country_name)
    )
    if country is None:
        raise ValueError(f"Unknown country: {country_name}")
    return country.alpha_2

def get_country_name_from_alpha2(alpha2_code):
    country = pycountry.countries.get(alpha_2=alpha2_code)
    if country is None:
        raise ValueError(f"Unknown country code: {alpha2_code}")
    # prefer friendly/common name if available, otherwise use the standard name
    return getattr(country, "common_name", country.name)

def group_countries_by_continent(alpha2_codes):
    buckets = {name: [] for name in set(CONTINENT_NAMES.values())}
    for code in alpha2_codes:
        try:
            continent_code = pc.country_alpha2_to_continent_code(code)
            continent = CONTINENT_NAMES.get(continent_code)
            if continent:
                buckets[continent].append(get_country_name_from_alpha2(code))
        except Exception:
            continue
    return {cont: sorted(names) for cont, names in buckets.items() if names}

def get_official_currency_for_country(country_code):
    currencies = get_territory_currencies(country_code)
    if not currencies:
        raise ValueError(f"No official currency found for country code: {country_code}")
    return currencies[0]

def convert_amount_to_official_currency(input_currency, amount, official_currency):
    input_currency = input_currency.upper()
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid net worth value: {amount}")
    if input_currency == official_currency:
        return amount_value
    rate = get_latest_exchange_rate(input_currency, official_currency)
    return rate * amount_value

def get_ppp_cpi_values(residence_code):
    csv_path = os.path.join(os.path.dirname(__file__), "data", "processed", "combined.csv")
    df = pd.read_csv(csv_path)
    row = df.loc[df["Country Code"] == residence_code]
    if row.empty:
        raise ValueError(f"No PPP/CPI data for country code: {residence_code}")
    return float(row["PPP"].iloc[0]), float(row["CPI"].iloc[0])

def adjust_for_inflation(amount, cpi):
    return amount / (1 + cpi / 100)

def adjust_for_ppp(amount, ppp):
    return amount / ppp

def get_wealth_ladder_thresholds(target_code):
    ladder_path = os.path.join(os.path.dirname(__file__), "data", "processed", "wealth_ladders.csv")
    df = pd.read_csv(ladder_path)
    row = df.loc[df["Country Code"] == target_code]
    if row.empty:
        raise ValueError(f"No wealth ladder data for country code: {target_code}")
    return [float(x) for x in row.iloc[0, 1:].tolist()]

def find_threshold_and_percentile(international_worth, thresholds):
    previous_threshold = 0
    for threshold in thresholds:
        if international_worth < threshold:
            break
        previous_threshold = threshold
    percentile = thresholds.index(previous_threshold) if previous_threshold in thresholds else 0
    return previous_threshold, percentile

def process_wealth_comparison(currency, net_worth, residence, target_country):
    try:
        res_code = get_country_alpha2_code(residence)
        official_currency = get_official_currency_for_country(res_code)
        converted_value = convert_amount_to_official_currency(currency, net_worth, official_currency)
        ppp, cpi = get_ppp_cpi_values(res_code)
        deflated_value = adjust_for_inflation(converted_value, cpi)
        international_value = adjust_for_ppp(deflated_value, ppp)
        target_code = get_country_alpha2_code(target_country)
        thresholds = get_wealth_ladder_thresholds(target_code)
        wealth_threshold, wealth_percentile = find_threshold_and_percentile(international_value, thresholds)
    except Exception as e:
        return {"error": str(e)}
    return {
        "residence_code": res_code,
        "official_currency": official_currency,
        "input_currency": currency.upper(),
        "original_net_worth": float(net_worth),
        "converted_net_worth_in_official": converted_value,
        "deflated_net_worth": deflated_value,
        "international_net_worth": international_value,
        "wealth_threshold": wealth_threshold,
        "wealth_percentile": wealth_percentile,
        "target_country": target_country
    }

@app.route("/api/submit", methods=["POST"])
def submit_wealth_comparison():
    data = request.get_json()
    currency = data.get("currency")
    net_worth = data.get("netWorth")
    residence = data.get("residence")
    target_country = data.get("targetCountry")
    result = process_wealth_comparison(currency, net_worth, residence, target_country)
    return jsonify(status="ok", result=result)

@app.route("/api/residence-countries", methods=["GET"])
def list_residence_countries():
    csv_path = os.path.join(os.path.dirname(__file__), "data", "processed", "combined.csv")
    df = pd.read_csv(csv_path)
    codes = sorted(df["Country Code"].dropna().unique())
    grouped = group_countries_by_continent(codes)
    return jsonify(grouped)

@app.route("/api/target-countries", methods=["GET"])
def list_target_countries():
    csv_path = os.path.join(os.path.dirname(__file__), "data", "processed", "wealth_ladders.csv")
    df = pd.read_csv(csv_path)
    codes = sorted(df["Country Code"].dropna().unique())
    grouped = group_countries_by_continent(codes)
    return jsonify(grouped)

if __name__ == "__main__":
    app.run(debug=True)