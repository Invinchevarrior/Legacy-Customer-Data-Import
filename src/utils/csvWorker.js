const fs = require('fs');
const csv = require('csv-parser');

/**
 * processCSV(filePath, validateFn, insertFn)
 * - validateFn(row) => array of error messages (empty if valid)
 * - insertFn(row) => Promise that inserts row into DB
 * Streams the CSV file row‑by‑row to avoid loading everything into memory.
 * Returns a summary report object.
 */
const processCSV = (filePath, validateFn, insertFn) => {
  return new Promise((resolve, reject) => {
    const report = { processed: 0, success: 0, rejected: 0, rejected_details: [] };

    const stream = fs.createReadStream(filePath).pipe(csv({ skipLines: 0 }));

    stream
      .on('data', (row) => {
        // Pause the stream while we perform async validation + DB work
        stream.pause();

        (async () => {
          report.processed++;

          const errors = validateFn(row) || [];
          if (errors.length > 0) {
            report.rejected++;
            report.rejected_details.push({ row, errors });
            return;
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
        })()
          .then(() => {
            // Resume reading the next row
            stream.resume();
          })
          .catch((err) => {
            stream.destroy(err);
          });
      })
      .on('error', (err) => reject(err))
      .on('end', () => {
        resolve(report);
      });
  });
};

module.exports = { processCSV };
