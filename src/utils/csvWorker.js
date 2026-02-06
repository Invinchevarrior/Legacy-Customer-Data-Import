const fs = require('fs');
const csv = require('csv-parser');

/**
 * processCSV(filePath, validateFn, insertFn)
 * - validateFn(row) => array of error messages (empty if valid)
 * - insertFn(row) => Promise that inserts row into DB
 * Returns a report object
 */
const processCSV = (filePath, validateFn, insertFn) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({ skipLines: 0 }))
      .on('data', (data) => results.push(data))
      .on('error', (err) => reject(err))
      .on('end', async () => {
        const report = { processed: results.length, success: 0, rejected: 0, rejected_details: [] };

        for (const row of results) {
          const errors = validateFn(row) || [];
          if (errors.length > 0) {
            report.rejected++;
            report.rejected_details.push({ row, errors });
            continue;
          }

          try {
            await insertFn(row);
            report.success++;
          } catch (err) {
            report.rejected++;
            const msgs = [];
            // Handle Mongo duplicate key error code
            if (err && err.code === 11000) msgs.push('Email already exists');
            else msgs.push(err.message || String(err));
            report.rejected_details.push({ row, errors: msgs });
          }
        }

        resolve(report);
      });
  });
};

module.exports = { processCSV };
