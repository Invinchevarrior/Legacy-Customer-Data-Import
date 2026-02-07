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
    const MAX_REJECTED_DETAILS = 200; // cap to avoid unbounded memory use
    const report = { processed: 0, success: 0, rejected: 0, rejected_details: [] };

    const stream = fs.createReadStream(filePath).pipe(csv({ skipLines: 0 }));

    let pending = 0;
    let streamEnded = false;
    let finished = false;

    const tryFinish = () => {
      if (streamEnded && pending === 0 && !finished) {
        finished = true;
        resolve(report);
      }
    };

    stream.on('data', (row) => {
      // Pause the stream while we perform async validation + DB work
      stream.pause();
      report.processed++;
      pending++;

      (async () => {
        const errors = validateFn(row) || [];
        if (errors.length > 0) {
          report.rejected++;
          if (report.rejected_details.length < MAX_REJECTED_DETAILS) {
            report.rejected_details.push({ row, errors });
          }
          return;
        }

        try {
          await insertFn(row);
          report.success++;
        } catch (err) {
          report.rejected++;
          const msgs = [];
          if (err && err.code === 11000) msgs.push('Email already exists');
          else msgs.push(err.message || String(err));
          if (report.rejected_details.length < MAX_REJECTED_DETAILS) {
            report.rejected_details.push({ row, errors: msgs });
          }
        }
      })()
        .then(() => {
          pending--;
          stream.resume();
          tryFinish();
        })
        .catch((err) => {
          // Unexpected top-level error: destroy stream and reject
          stream.destroy(err);
        });
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('end', () => {
      streamEnded = true;
      tryFinish();
    });
  });
};

module.exports = { processCSV };
