import express from "express";
import multer from "multer";
import * as xlsx from "xlsx";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Dummy raw data simulation (as if read from CSV/Excel)
let rawScopusData: any[] = [
  { Authors: "Doe, J.; Smith, A.", Title: "AI in Healthcare", Year: 2023, quartile: "Q1", "Cited by": 15, ISSN: "12345678", "Source title": "Journal of Medical AI", "Document Type": "Article", DOI: "10.1000/xyz123" },
  { Authors: "Smith, A.; Johnson, M.", Title: "Machine Learning Models", Year: 2022, quartile: "Q2", "Cited by": 8, ISSN: "87654321", "Source title": "Tech Review", "Document Type": "Conference Paper" },
  { Authors: "Doe, J.", Title: "Deep Learning Basics", Year: 2021, quartile: "Q1", "Cited by": 45, ISSN: "11112222", "Source title": "AI Journal", "Document Type": "Article" },
  { Authors: "Johnson, M.; Williams, R.; Doe, J.", Title: "Data Science Trends", Year: 2023, quartile: "Q3", "Cited by": 2, ISSN: "33334444", "Source title": "Data Science Quarterly", "Document Type": "Review" },
  { Authors: "Williams, R.", Title: "Big Data Analytics", Year: 2020, quartile: "Q4", "Cited by": 1, ISSN: "55556666", "Source title": "Analytics Today", "Document Type": "Article" },
  { Authors: "Smith, A.; Williams, R.", Title: "Neural Networks", Year: 2023, quartile: "Q1", "Cited by": 20, ISSN: "12345678", "Source title": "Journal of Medical AI", "Document Type": "Article" },
  { Authors: "Doe, J.; Brown, C.", Title: "Computer Vision", Year: 2022, quartile: "Q2", "Cited by": 12, ISSN: "87654321", "Source title": "Tech Review", "Document Type": "Conference Paper" },
  { Authors: "Brown, C.", Title: "Natural Language Processing", Year: 2023, quartile: "Q1", "Cited by": 30, ISSN: "11112222", "Source title": "AI Journal", "Document Type": "Article" },
  { Authors: "Johnson, M.; Brown, C.", Title: "Robotics", Year: 2021, quartile: "Q2", "Cited by": 5, ISSN: "77778888", "Source title": "Robotics Int.", "Document Type": "Article" },
  { Authors: "Doe, J.; Smith, A.; Johnson, M.; Williams, R.; Brown, C.", Title: "Future of AI", Year: 2024, quartile: "Q1", "Cited by": 0, ISSN: "99990000", "Source title": "Future Tech", "Document Type": "Review" },
];

// Utility function to process the raw data
function processScopusData(data: any[]) {
  const authorStats: Record<string, {
    name: string;
    totalPublications: number;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    score: number;
    totalCitations: number;
    papers: Array<{title: string, year: number, quartile: string, citedBy: number, sourceTitle: string, documentType: string, doi: string, issn: string}>;
  }> = {};

  data.forEach(row => {
    if (!row.Authors) return;
    
    // Split authors by semicolon and trim whitespace
    const authors = row.Authors.split(';').map((a: string) => a.trim()).filter(Boolean);
    const q = row.quartile?.toUpperCase() || '';
    
    let scoreToAdd = 0;
    if (q === 'Q1') scoreToAdd = 4;
    else if (q === 'Q2') scoreToAdd = 3;
    else if (q === 'Q3') scoreToAdd = 2;
    else if (q === 'Q4') scoreToAdd = 1;

    authors.forEach((author: string) => {
      if (!authorStats[author]) {
        authorStats[author] = {
          name: author,
          totalPublications: 0,
          q1: 0,
          q2: 0,
          q3: 0,
          q4: 0,
          score: 0,
          totalCitations: 0,
          papers: []
        };
      }
      
      authorStats[author].totalPublications += 1;
      authorStats[author].score += scoreToAdd;
      authorStats[author].totalCitations += (parseInt(row["Cited by"]) || 0);
      
      if (q === 'Q1') authorStats[author].q1 += 1;
      else if (q === 'Q2') authorStats[author].q2 += 1;
      else if (q === 'Q3') authorStats[author].q3 += 1;
      else if (q === 'Q4') authorStats[author].q4 += 1;

      authorStats[author].papers.push({
        title: row.Title,
        year: row.Year,
        quartile: q,
        citedBy: row["Cited by"] || 0,
        sourceTitle: row["Source title"] || '',
        documentType: row["Document Type"] || '',
        doi: row.DOI || '',
        issn: row.ISSN || ''
      });
    });
  });

  // Convert to array and sort by score (descending), then total publications (descending)
  const sortedAuthors = Object.values(authorStats).sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.totalPublications - a.totalPublications;
  });

  // Sort papers for each author by year (descending)
  sortedAuthors.forEach(author => {
    author.papers.sort((a, b) => b.year - a.year);
  });

  return sortedAuthors;
}

// API Route for Scopus Data
app.get("/api/scopus", (req, res) => {
  try {
    const yearParam = req.query.year as string;
    let filteredRawData = rawScopusData;
    
    if (yearParam && yearParam !== 'All') {
      if (yearParam.startsWith('<=')) {
        const maxYear = parseInt(yearParam.substring(2));
        filteredRawData = rawScopusData.filter(d => parseInt(d.Year) <= maxYear);
      } else {
        const year = parseInt(yearParam);
        filteredRawData = rawScopusData.filter(d => parseInt(d.Year) === year);
      }
    }

    const processedData = processScopusData(filteredRawData);
    
    // Calculate summary metrics
    const totalPublications = filteredRawData.length;
    const q1Count = filteredRawData.filter(d => d.quartile?.toUpperCase() === 'Q1').length;
    const q2Count = filteredRawData.filter(d => d.quartile?.toUpperCase() === 'Q2').length;
    const q3Count = filteredRawData.filter(d => d.quartile?.toUpperCase() === 'Q3').length;
    const q4Count = filteredRawData.filter(d => d.quartile?.toUpperCase() === 'Q4').length;
    const q1q2Ratio = totalPublications > 0 ? ((q1Count + q2Count) / totalPublications * 100).toFixed(1) : "0";
    const totalCitations = filteredRawData.reduce((sum, d) => sum + (parseInt(d["Cited by"]) || 0), 0);

    res.json({
      success: true,
      lastSynced: new Date().toISOString(),
      summary: {
        totalPublications,
        q1Count,
        q2Count,
        q3Count,
        q4Count,
        q1q2Ratio: `${q1q2Ratio}%`,
        totalCitations
      },
      leaderboard: processedData
    });
  } catch (error) {
    console.error("Error processing data:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// API Route for Uploading Excel/CSV
app.post("/api/scopus/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    
    // Helper to normalize ISSNs
    const normalizeIssn = (val: any): string[] => {
      if (!val) return [];
      return String(val)
        .split(/[\s,;\n\/|]+/)
        .map(i => i.replace(/[^a-z0-9]/gi, '').trim().toLowerCase().replace(/^0+/, ''))
        .filter(i => i.length > 0);
    };

    // 1. Find ISSN sheet
    let validISSNs: string[] | null = null;
    const issnSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('issn'));
    if (issnSheetName) {
      const issnSheet = workbook.Sheets[issnSheetName];
      const issnData = xlsx.utils.sheet_to_json(issnSheet, { header: 1 });
      validISSNs = [];
      issnData.flat().forEach((val: any) => {
        validISSNs!.push(...normalizeIssn(val));
      });
      // Remove duplicates
      validISSNs = [...new Set(validISSNs)];
      console.log(`Found ${validISSNs.length} valid ISSNs for filtering.`);
    }

    // 2. Find Main data sheet
    const mainSheetName = workbook.SheetNames.find(name => name !== issnSheetName) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[mainSheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    // Normalize keys
    const normalizedData = jsonData.map((row: any) => {
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          const foundKey = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
          if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      let rawIssn = String(getVal(["ISSN", "eISSN", "E-ISSN", "Print-ISSN", "Source ID", "Print ISSN", "Online ISSN"]) || "");
      if (!rawIssn) {
        const issnKey = Object.keys(row).find(rk => rk.toLowerCase().includes('issn'));
        if (issnKey) rawIssn = String(row[issnKey] || "");
      }

      return {
        Authors: getVal(["Authors", "Author", "Penulis"]),
        Title: getVal(["Title", "Judul"]),
        Year: parseInt(getVal(["Year", "Tahun"])),
        quartile: getVal(["quartile", "Q", "Kuartil", "Quartiles"]),
        "Cited by": parseInt(getVal(["Cited by", "Cited", "Citations", "Sitasi"])) || 0,
        ISSN: rawIssn,
        "Source title": getVal(["Source title", "Journal", "Jurnal", "Source"]),
        "Document Type": getVal(["Document Type", "Type", "Tipe Dokumen"]),
        DOI: getVal(["DOI"])
      };
    }).filter(row => row.Authors && row.Title); // basic validation

    let finalData = normalizedData;
    if (validISSNs && validISSNs.length > 0) {
      finalData = normalizedData.filter(row => {
        if (!row.ISSN) return false;
        const rowIssns = normalizeIssn(row.ISSN);
        return rowIssns.some((i: string) => validISSNs!.includes(i));
      });
    }

    if (finalData.length === 0) {
      return res.status(400).json({ success: false, error: "No valid data found after filtering by ISSN (or no data in main sheet). Please ensure columns Authors, Title, Year exist." });
    }

    rawScopusData = finalData;
    
    const processedData = processScopusData(rawScopusData);
    const totalPublications = rawScopusData.length;
    const q1Count = rawScopusData.filter(d => d.quartile?.toUpperCase() === 'Q1').length;
    const q2Count = rawScopusData.filter(d => d.quartile?.toUpperCase() === 'Q2').length;
    const q3Count = rawScopusData.filter(d => d.quartile?.toUpperCase() === 'Q3').length;
    const q4Count = rawScopusData.filter(d => d.quartile?.toUpperCase() === 'Q4').length;
    const q1q2Ratio = totalPublications > 0 ? ((q1Count + q2Count) / totalPublications * 100).toFixed(1) : "0";
    const totalCitations = rawScopusData.reduce((sum, d) => sum + (parseInt(d["Cited by"]) || 0), 0);

    res.json({
      success: true,
      lastSynced: new Date().toISOString(),
      summary: {
        totalPublications,
        q1Count,
        q2Count,
        q3Count,
        q4Count,
        q1q2Ratio: `${q1q2Ratio}%`,
        totalCitations
      },
      leaderboard: processedData
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ success: false, error: "Failed to process the uploaded file." });
  }
});

export default app;
