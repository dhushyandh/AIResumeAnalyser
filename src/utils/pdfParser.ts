export async function extractTextFromPdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (typeof window !== "undefined" && (window as any).pdfjsLib) {
      parsePdfData((window as any).pdfjsLib, file, resolve, reject);
      return;
    }

    // Load PDF.js from CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      parsePdfData(pdfjsLib, file, resolve, reject);
    };
    script.onerror = () => {
      reject(new Error("Failed to load PDF parsing library. Try copy-pasting your text instead."));
    };
    document.head.appendChild(script);
  });
}

function parsePdfData(pdfjsLib: any, file: File, resolve: (text: string) => void, reject: (err: any) => void) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Join with appropriate spaces
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += pageText + "\n\n";
      }
      resolve(text);
    } catch (err) {
      reject(new Error("Failed to extract text from PDF. Ensure the file is not corrupted."));
    }
  };
  reader.onerror = () => reject(new Error("File reading error."));
  reader.readAsArrayBuffer(file);
}
