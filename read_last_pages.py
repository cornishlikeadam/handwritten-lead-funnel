import pypdf

reader = pypdf.PdfReader("/Users/kjcornish/Downloads/seen-until-believed-sacred-tech-edition.pdf")
total = len(reader.pages)
for i in range(total - 6, total):
    print(f"\n--- PAGE {i+1} ---")
    print(reader.pages[i].extract_text()[:2000])
