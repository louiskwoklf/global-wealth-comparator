#!/usr/bin/env python3
"""Generate a CSV of wealth-percentile thresholds (p0p1…p99p100) for every
ISO-2 country in constant PPP international dollars (i$)."""

import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import requests

URL_CDICT = "https://wid.world/codes-dictionary/"
URL_LADDER = "https://wid.world/simulatorapp/jsongenerated/thweal_{iso}.json"

# Skip historic states and aggregates
EXCLUDED = {
    "CS", "DD", "SU", "YU", "OA", "OB", "OC", "OD", "OE", "OH", "OI",
    "OJ", "OK", "OL", "QL", "QM", "XB", "XS", "QE", "WO", "XF", "XL",
    "XN", "XR", "ZZ",
}

BAND_RE = re.compile(r"p(\d+)p(\d+)$")


def wid_iso_country_codes() -> List[str]:
    html = requests.get(URL_CDICT, timeout=30).text
    codes = set(re.findall(r"<td[^>]*>\s*([A-Z]{2})\s*</td>", html))
    return sorted(c for c in codes if c not in EXCLUDED)


def wealth_ladder(iso: str) -> Tuple[pd.Series, int]:
    r = requests.get(URL_LADDER.format(iso=iso), timeout=30)
    if r.status_code != 200:
        raise ValueError(f"http {r.status_code}")
    data: Dict[str, list] = r.json()

    try:
        latest = max(v["y"] for ladd in data.values()
                      for v in ladd[0].get(iso, {}).get("values", []))
    except ValueError:
        raise ValueError("no ladder values")

    ladder: Dict[str, float] = {}
    for key, ladd in data.items():
        if key.startswith("thweal_p"):
            band = key.split("_")[1]
            if BAND_RE.match(band):
                for entry in (ladd[0].get(iso) or {}).get("values", []):
                    if entry["y"] == latest:
                        ladder[band] = entry["v"]
                        break

    if not ladder:
        raise ValueError(f"no {latest} data")

    ladder = dict(sorted(ladder.items(), key=lambda kv: int(BAND_RE.match(kv[0]).group(1))))
    return pd.Series(ladder, name=latest), latest


def build_ladders() -> Tuple[pd.DataFrame, List[Tuple[str, str]]]:
    rows: Dict[str, pd.Series] = {}
    skipped: List[Tuple[str, str]] = []

    for iso in wid_iso_country_codes():
        try:
            rows[iso], _ = wealth_ladder(iso)
        except Exception as e:
            skipped.append((iso, str(e)))

    df = pd.DataFrame(rows).T
    df.index.name = "Country Code"
    return df, skipped


def main() -> None:
    output_path = Path("data/processed/wealth_ladders.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    df, skipped = build_ladders()
    df.to_csv(output_path, float_format="%.3f")

    print(f"✔ saved {len(df)} countries → {output_path}")
    for iso, reason in skipped:
        print(f"{iso}: {reason}")


if __name__ == "__main__":
    main()