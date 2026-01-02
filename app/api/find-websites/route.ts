import { NextRequest } from "next/server";

const SKIP_DOMAINS = [
  "bbb.org", "yelp.com", "facebook.com", "linkedin.com",
  "yellowpages.com", "manta.com", "mapquest.com", "google.com",
  "angi.com", "homeadvisor.com", "thumbtack.com", "houzz.com",
  "buildzoom.com", "porch.com", "duckduckgo.com", "bark.com",
  "nextdoor.com", "instagram.com", "twitter.com", "tiktok.com"
];

function extractCityFromBBBUrl(bbbUrl: string): string {
  try {
    const match = bbbUrl.match(/\/us\/(\w+)\/([^/]+)\/profile/);
    if (match) {
      const state = match[1].toUpperCase();
      const city = match[2].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return `${city}, ${state}`;
    }
  } catch {
    // Fall through
  }
  return "North Carolina";
}

async function searchCompanyWebsite(businessName: string, cityState: string): Promise<string | null> {
  try {
    const cleanName = businessName.replace(/[,."]/g, "").trim();
    const query = `${cleanName} ${cityState} roofing contractor website`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(10000)
    });

    const html = await response.text();

    // DuckDuckGo wraps URLs in uddg parameter - extract those
    const uddgPattern = /uddg=([^&"]+)/g;
    let match;

    while ((match = uddgPattern.exec(html)) !== null) {
      try {
        const foundUrl = decodeURIComponent(match[1]);
        const urlObj = new URL(foundUrl);
        const domain = urlObj.hostname.toLowerCase();

        // Skip aggregators
        if (SKIP_DOMAINS.some(skip => domain.includes(skip))) {
          continue;
        }

        // Return clean base URL
        return `${urlObj.protocol}//${urlObj.hostname}`;
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell);
        currentCell = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        if (char === "\r") i++; // Skip \n
      } else if (char !== "\r") {
        currentCell += char;
      }
    }
  }

  // Don't forget last cell/row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function escapeCSVCell(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function rowToCSV(row: string[]): string {
  return row.map(escapeCSVCell).join(",");
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return new Response("No file provided", { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length < 2) {
    return new Response("CSV must have header and at least one row", { status: 400 });
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  const total = dataRows.length;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let updatedCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        // Send progress
        controller.enqueue(encoder.encode(
          JSON.stringify({ type: "progress", current: i + 1, total }) + "\n"
        ));

        if (row.length < 3) continue;

        const bbbUrl = row[1] || "";
        const businessName = row[2] || "";

        if (!businessName) continue;

        const cityState = extractCityFromBBBUrl(bbbUrl);
        const website = await searchCompanyWebsite(businessName, cityState);

        let result;
        if (website) {
          row[1] = website; // Replace BBB with actual website
          updatedCount++;
          result = {
            businessName,
            originalUrl: bbbUrl,
            newUrl: website,
            status: "found" as const
          };
        } else {
          // Keep BBB link as-is
          result = {
            businessName,
            originalUrl: bbbUrl,
            newUrl: bbbUrl,
            status: "kept" as const
          };
        }

        controller.enqueue(encoder.encode(
          JSON.stringify({ type: "result", result }) + "\n"
        ));

        // Rate limiting - 300ms between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Build final CSV
      const csvLines = [rowToCSV(header), ...dataRows.map(rowToCSV)];
      const csvContent = csvLines.join("\n");

      controller.enqueue(encoder.encode(
        JSON.stringify({ type: "complete", csv: csvContent, updated: updatedCount, total }) + "\n"
      ));

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    }
  });
}
