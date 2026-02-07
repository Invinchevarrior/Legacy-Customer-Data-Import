const fs = require('fs');
const csv = require('csv-parser');

/**
 * processCSV(filePath, validateFn, insertFn)
 * 
 * Streams a CSV file row-by-row, validates each row, and inserts valid rows into DB.
 * Uses pause/resume to apply backpressure and prevent memory overflow.
 * 
 * @param {string} filePath - Path to the CSV file to process
 * @param {Function} validateFn - Validation function: (row) => array of error strings (empty if valid)
 * @param {Function} insertFn - Database insert function: async (row) => Promise
 * @returns {Promise<Object>} Report object with processed/success/rejected/rejected_details
 * 
 * Key features:
 * - Streams to avoid loading entire file into memory
 * - Waits for all async inserts before resolving (prevents race conditions)
 * - Caps rejected_details to prevent unbounded memory growth
 * - Handles duplicate key errors (MongoDB 11000) with user-friendly messages
 */
const processCSV = (filePath, validateFn, insertFn) => {
  return new Promise((resolve, reject) => {
    const MAX_REJECTED_DETAILS = 200; // Prevent unbounded memory growth on large rejections
    const report = { processed: 0, success: 0, rejected: 0, rejected_details: [] };

    const stream = fs.createReadStream(filePath).pipe(csv({ skipLines: 0 }));

    // Track pending async operations to ensure all complete before resolving
    let pending = 0;
    let streamEnded = false;
    let finished = false;

    // Check if we can finish: all rows processed and all async inserts complete
    const tryFinish = () => {
      if (streamEnded && pending === 0 && !finished) {
        finished = true;
        resolve(report);
      }
    };

    stream.on('data', (row) => {
      // Pause stream while processing to apply backpressure
      stream.pause();
      report.processed++;
      pending++;

      (async () => {
        // Validate the row; validateFn returns array of error strings
        const errors = validateFn(row) || [];
        if (errors.length > 0) {
          report.rejected++;
          // Cap rejected_details to prevent memory exhaustion with large files
          if (report.rejected_details.length < MAX_REJECTED_DETAILS) {
            report.rejected_details.push({ row, errors });
          }
          return;
        }

        try {
          // Insert valid row into database
          await insertFn(row);
          report.success++;
        } catch (err) {
          report.rejected++;
          const msgs = [];
          // MongoDB error 11000 = unique constraint violation (duplicate email)
          if (err && err.code === 11000) msgs.push('Email already exists');
          else msgs.push(err.message || String(err));
          if (report.rejected_details.length < MAX_REJECTED_DETAILS) {
            report.rejected_details.push({ row, errors: msgs });
          }
        }
      })()
        .then(() => {
          // Mark operation complete and resume stream
          pending--;
          stream.resume();
          tryFinish();
        })
        .catch((err) => {
          // Unexpected error: stop stream and propagate
          stream.destroy(err);
        });
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('end', () => {
      // Mark stream as ended; finish when all pending ops complete
      streamEnded = true;
      tryFinish();
    });
  });
};

module.exports = { processCSV };
