import os
import re

html_path = r"C:\Users\NIKITA SHARAD PAWAR\.gemini\antigravity\scratch\mitm-attack-simulator\index.html"
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))

js_dir = r"C:\Users\NIKITA SHARAD PAWAR\.gemini\antigravity\scratch\mitm-attack-simulator\js"
missing = []
for fname in os.listdir(js_dir):
    if fname.endswith(".js"):
        fpath = os.path.join(js_dir, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            code = f.read()
        ids = re.findall(r'getElementById\(["\']([^"\']+)["\']\)', code)
        for i in ids:
            if i not in html_ids:
                missing.append((fname, i))

print("Total unique IDs in HTML:", len(html_ids))
if not missing:
    print("ALL IDs MATCH PERFECTLY! 100% COVERAGE")
else:
    print("Missing IDs found:")
    for fname, mid in missing:
        print(f"  [{fname}] -> {mid}")
