import sys

def extract_pdf_info(pdf_path):
    try:
        import pypdf
    except ImportError:
        import subprocess
        print("pypdf not found. Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
        import pypdf
        
    reader = pypdf.PdfReader(pdf_path)
    print(f"Number of pages: {len(reader.pages)}")
    
    # Print document metadata
    meta = reader.metadata
    print(f"Metadata: {meta}")
    
    # Print first 2 pages text
    for i in range(min(5, len(reader.pages))):
        print(f"\n--- PAGE {i+1} ---")
        print(reader.pages[i].extract_text()[:1500])

if __name__ == "__main__":
    pdf_path = "/Users/kjcornish/Downloads/seen-until-believed-sacred-tech-edition.pdf"
    extract_pdf_info(pdf_path)
