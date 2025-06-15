import pycountry
import json
import os

# Build the name → numeric code mapping
name_to_numeric = {}

for country in pycountry.countries:
    numeric = f"{int(country.numeric):03}"

    name_to_numeric[country.name] = numeric

    if hasattr(country, "common_name"):
        name_to_numeric[country.common_name] = numeric

    if hasattr(country, "official_name"):
        name_to_numeric[country.official_name] = numeric

# Path to React src folder
output_path = os.path.join("frontend", "src", "country_name_to_numeric.js")

# Ensure directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Save the mapping to JSON
with open(output_path, "w", encoding="utf-8") as f:
    f.write("const nameToNumeric = ")
    json.dump(name_to_numeric, f, indent=2, ensure_ascii=False)
    f.write("\nexport default nameToNumeric;\n")