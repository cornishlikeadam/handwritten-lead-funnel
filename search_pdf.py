import pypdf

reader = pypdf.PdfReader("/Users/kjcornish/Downloads/seen-until-believed-sacred-tech-edition.pdf")
print("Total Pages:", len(reader.pages))

keywords = ["email", "newsletter", "funnel", "form", "marketing", "offer", "audience", "subscribe", "convert"]
matches = {kw: [] for kw in keywords}

for page_num, page in enumerate(reader.pages):
    text = page.extract_text().lower()
    for kw in keywords:
        if kw in text:
            matches[kw].append(page_num + 1)

print("Keyword page occurrences:")
for kw, pages in matches.items():
    print(f"  {kw}: {pages}")

# Let's inspect pages that mention "funnel" or "convert" or "newsletter"
print("\n--- DETAILED EXTRACTS FOR INTERESTING PAGES ---")
interesting_pages = sorted(list(set(matches["funnel"] + matches["newsletter"] + matches["convert"])))
for p in interesting_pages[:10]:
    print(f"\n--- PAGE {p} ---")
    print(reader.pages[p-1].extract_text()[:2000])
