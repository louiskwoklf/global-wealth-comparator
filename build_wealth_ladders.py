#!/usr/bin/env python3
"""
Build a country-by-country wealth-percentile ladder sheet from WID.world.

• Rows  : “ISO (CUR)” – ISO alpha-2 code plus three-letter currency.
• Cols  : p0p1 … p99p100, newest available year (2023 at time of writing).
"""

import argparse
import re
from pathlib import Path

import pandas as pd
import requests

# ---------------------------------------------------------------------------
URL_CDICT   = "https://wid.world/codes-dictionary/"
URL_LADDER  = "https://wid.world/simulatorapp/jsongenerated/thweal_{iso}.json"

EXCLUDED = {
    # historical states
    "CS", "DD", "SU", "YU",
    # regional / “other” buckets
    "OA", "OB", "OC", "OD", "OE", "OH", "OI",
    "OJ", "OK", "OL", "QL", "QM", "XB", "XS",
    # global aggregate
    "ZZ",
}


def wid_iso_country_codes(exclude=EXCLUDED) -> list[str]:
    html = requests.get(URL_CDICT, timeout=30).text
    codes = set(re.findall(r"<td[^>]*>\s*([A-Z]{2})\s*</td>", html))
    return sorted(c for c in codes if c not in exclude)


def wealth_ladder(iso: str) -> tuple[pd.Series, str]:
    url  = URL_LADDER.format(iso=iso)
    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        raise ValueError(f"{iso}: endpoint {resp.status_code}")
    data = resp.json()

    years = {v["y"]
             for ladd in data.values()
             for v in ladd[0].get(iso, {}).get("values", [])}
    if not years:
        raise ValueError(f"{iso}: no ladder values")
    latest = max(years)

    ladder, currency = {}, None
    band_re = re.compile(r"p(\d+)p(\d+)$")

    for key, ladd in data.items():
        if not key.startswith("thweal_p"):
            continue
        band = key.split("_")[1]
        if not band_re.match(band):
            continue

        block = ladd[0].get(iso)
        if not block:
            continue

        if currency is None:
            meta = block.get("meta", {})
            currency = meta.get("unit") or meta.get("unit_symbol") or meta.get("unit_name") or "UNK"

        for entry in block["values"]:
            if entry["y"] == latest:
                ladder[band] = entry["v"]
                break

    if not ladder:
        raise ValueError(f"{iso}: ladder missing for {latest}")

    ordered = dict(sorted(ladder.items(),
                          key=lambda kv: int(band_re.match(kv[0]).group(1))))
    return pd.Series(ordered, name=latest), currency


def build_ladder_dataframe() -> tuple[pd.DataFrame, list[tuple[str, str]]]:
    rows, skipped = {}, []
    for iso in wid_iso_country_codes():
        try:
            series, cur = wealth_ladder(iso)
            rows[f"{iso} ({cur})"] = series
        except Exception as exc:
            skipped.append((iso, str(exc)))
    df = pd.DataFrame(rows).T
    df.index.name = "country"
    return df, skipped


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-o", "--output",
        default="wealth_percentile_ladder.csv",
        help="CSV file to write (default: %(default)s)",
    )
    args = parser.parse_args()

    df, skipped = build_ladder_dataframe()
    df.to_csv(Path(args.output).expanduser(), float_format="%.3f")

    print(f"✔ saved {len(df)} countries → {args.output}")
    if skipped:
        print("skipped:")
        for iso, reason in skipped:
            print(f"{reason}")


if __name__ == "__main__":
    main()