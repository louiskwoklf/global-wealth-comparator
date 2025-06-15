from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta, timezone
import pycountry
from babel.numbers import get_territory_currencies
import pandas as pd
import os
import requests
import pycountry_convert as pc
from functools import lru_cache

CONTINENT_NAMES = {
    "AF": "Africa",
    "AS": "Asia",
    "OC": "Oceania",
    "EU": "Europe",
    "NA": "Americas",
    "SA": "Americas",
    "AN": "Antarctica",
}

WEALTH_LADDERS_DF = None
COMBINED_DF = None

def load_data():
    global WEALTH_LADDERS_DF, COMBINED_DF
    ladder_path = os.path.join(os.path.dirname(__file__), "data", "processed", "wealth_ladders.csv")
    WEALTH_LADDERS_DF = pd.read_csv(ladder_path)
    WEALTH_LADDERS_DF.set_index("Country Code", inplace=True)
    csv_path = os.path.join(os.path.dirname(__file__), "data", "processed", "combined.csv")
    COMBINED_DF = pd.read_csv(csv_path)
    COMBINED_DF.set_index("Country Code", inplace=True)
    print("Data loaded successfully.")

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
CORS(app)

load_data()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    build_dir = app.static_folder
    if path != "" and os.path.exists(os.path.join(build_dir, path)):
        return send_from_directory(build_dir, path)
    else:
        return send_from_directory(build_dir, 'index.html')

@lru_cache(maxsize=128)
def get_latest_exchange_rate(base_currency, target_currency):
    """Cached function to get the latest exchange rate."""
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

@lru_cache(maxsize=None)
def get_country_alpha2_code(country_name):
    try:
        return pycountry.countries.lookup(country_name).alpha_2
    except LookupError:
        raise ValueError(f"Unknown country: {country_name}")

@lru_cache(maxsize=None)
def get_country_name_from_alpha2(alpha2_code):
    try:
        return pycountry.countries.get(alpha_2=alpha2_code).name
    except AttributeError:
        raise ValueError(f"Unknown country code: {alpha2_code}")

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

@lru_cache(maxsize=None)
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
    try:
        row = COMBINED_DF.loc[residence_code]
        return float(row["PPP"]), float(row["CPI"])
    except KeyError:
        raise ValueError(f"No PPP/CPI data for country code: {residence_code}")

def adjust_for_inflation(amount, cpi):
    return amount / (1 + cpi / 100)

def adjust_for_ppp(amount, ppp):
    return amount / ppp

def get_wealth_ladder_thresholds(target_code):
    try:
        row = WEALTH_LADDERS_DF.loc[target_code]
        return [float(x) for x in row.tolist()]
    except KeyError:
        raise ValueError(f"No wealth ladder data for country code: {target_code}")

def find_threshold_and_percentile(international_worth, thresholds):
    previous_threshold = 0
    percentile = 0
    for i, threshold in enumerate(thresholds):
        if international_worth < threshold:
            percentile = i
            break
        previous_threshold = threshold
    else:
        percentile = 99
    return previous_threshold, percentile

@app.route("/api/submit", methods=["POST"])
def submit_wealth_comparison():
    data = request.get_json()
    currency = data.get("currency")
    net_worth = data.get("netWorth")
    residence = data.get("residence")

    try:
        res_code = get_country_alpha2_code(residence)
        official_currency = get_official_currency_for_country(res_code)
        converted_value = convert_amount_to_official_currency(currency, net_worth, official_currency)
        ppp, cpi = get_ppp_cpi_values(res_code)
        deflated_value = adjust_for_inflation(converted_value, cpi)
        international_value = adjust_for_ppp(deflated_value, ppp)

        target_codes = WEALTH_LADDERS_DF.index.dropna().unique().tolist()
        results_list = []
        
        for code in target_codes:
            try:
                target_country_name = get_country_name_from_alpha2(code)
                thresholds = get_wealth_ladder_thresholds(code)
                _, wealth_percentile = find_threshold_and_percentile(international_value, thresholds)
                
                results_list.append({
                    "wealth_percentile": wealth_percentile,
                    "target_country": target_country_name
                })
            except ValueError:
                continue

        return jsonify(status="ok", results=results_list)

    except (ValueError, TypeError) as e:
        return jsonify(status="error", message=str(e)), 400
    except Exception as e:
        return jsonify(status="error", message="An unexpected error occurred."), 500

@lru_cache(maxsize=1)
def get_frankfurter_currencies():
    """Cached function to get currencies from the external API."""
    try:
        resp = requests.get("https://api.frankfurter.app/currencies", timeout=5)
        if resp.status_code == 200:
            return set(resp.json().keys())
    except requests.exceptions.RequestException:
        return set()

@app.route("/api/residence-countries", methods=["GET"])
def list_residence_countries():
    """Lists countries that have complete data and a supported currency."""
    codes = COMBINED_DF.index.dropna().unique().tolist()
    supported_currencies = get_frankfurter_currencies()
    
    if not supported_currencies:
        return jsonify({"error": "Could not fetch currency list"}), 503

    filtered_codes = []
    for code in codes:
        try:
            if get_official_currency_for_country(code) in supported_currencies:
                filtered_codes.append(code)
        except Exception:
            continue
            
    grouped = group_countries_by_continent(filtered_codes)
    return jsonify(grouped)

@app.route("/api/target-countries", methods=["GET"])
def list_target_countries():
    codes = WEALTH_LADDERS_DF.index.dropna().unique().tolist()
    grouped = group_countries_by_continent(codes)
    return jsonify(grouped)

if __name__ == "__main__":
    app.run(debug=True)