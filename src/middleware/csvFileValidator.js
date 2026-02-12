const fs = require('fs');
const path = require('path');

/**
 * CSV File Validation Configuration
 * Prevents CSV bomb attacks and resource exhaustion
 */
const CSV_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB (compared to 5 MB in multer - extra buffer)
  MAX_ROWS: 100000, // Prevent unbounded row processing
  MAX_COLUMNS: 100, // Prevent column explosion attacks
  MAX_CELL_SIZE: 1024 * 1024, // 1 MB max per cell (prevents huge fields)
  MAX_TOTAL_CELLS: 10000000, // Total cell count limit
};

/**
 * Middleware: Validate CSV File Structure
 * 
 * Performs pre-processing checks on uploaded CSV files:
 * - Validates file exists and is readable
 * - Checks file size limits
 * - Verifies CSV header format
 * - Samples rows to detect CSV bomb patterns
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const validateCsvFile = async (req, res, next) => {
  if (!req.file) {
    return next(); // No file uploaded, skip validation
  }

  const filePath = req.file.path;

  try {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File upload failed' });
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }
    if (stats.size > CSV_CONFIG.MAX_FILE_SIZE) {
      return res.status(413).json({ 
        error: `File size exceeds maximum allowed size of ${CSV_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB` 
      });
    }

    // Read and validate header
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let headerLine = '';
    let rowCount = 0;
    let totalCells = 0;
    let maxRowSize = 0;
    let isBomb = false;

    for await (const chunk of fileStream) {
      const lines = chunk.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        rowCount++;

        // Validate header on first row
        if (rowCount === 1) {
          const columns = parseCSVLine(line);
          if (columns.length === 0) {
            return res.status(400).json({ error: 'Invalid CSV header' });
          }
          if (columns.length > CSV_CONFIG.MAX_COLUMNS) {
            return res.status(400).json({ 
              error: `CSV has too many columns (${columns.length}, max: ${CSV_CONFIG.MAX_COLUMNS})` 
            });
          }
          continue;
        }

        // Detect CSV bomb patterns
        const columns = parseCSVLine(line);
        const rowSize = line.length;
        maxRowSize = Math.max(maxRowSize, rowSize);

        if (columns.length > CSV_CONFIG.MAX_COLUMNS) {
          isBomb = true;
          break;
        }

        // Check individual cell sizes
        for (const cell of columns) {
          if (cell.length > CSV_CONFIG.MAX_CELL_SIZE) {
            isBomb = true;
            break;
          }
        }

        totalCells += columns.length;

        if (isBomb || rowCount > CSV_CONFIG.MAX_ROWS || totalCells > CSV_CONFIG.MAX_TOTAL_CELLS) {
          isBomb = true;
          break;
        }
      }

      if (isBomb || rowCount > CSV_CONFIG.MAX_ROWS) break;
    }

    // Validate results
    if (isBomb) {
      return res.status(400).json({ 
        error: 'CSV file appears to be malicious or corrupted (potential CSV bomb detected)' 
      });
    }

    if (rowCount === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    if (rowCount === 1) {
      return res.status(400).json({ error: 'CSV file contains only header, no data rows' });
    }

    if (rowCount > CSV_CONFIG.MAX_ROWS) {
      return res.status(400).json({ 
        error: `CSV file exceeds maximum row limit (${rowCount}, max: ${CSV_CONFIG.MAX_ROWS})` 
      });
    }

    // Attach metadata to request for logging/auditing
    req.csvMetadata = {
      rowCount,
      columnCount: 0,
      fileSize: stats.size,
      maxRowSize
    };

    next();
  } catch (err) {
    console.error('CSV validation error:', err);
    return res.status(400).json({ error: 'CSV file validation failed' });
  }
};

/**
 * Parse a CSV line handling quoted fields
 * 
 * @param {string} line - CSV line to parse
 * @returns {Array<string>} Array of field values
 */
const parseCSVLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    fields.push(current);
  }

  return fields;
};

module.exports = {
  validateCsvFile,
  CSV_CONFIG
};
