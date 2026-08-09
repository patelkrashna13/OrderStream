const fs = require('fs');
const path = require('path');

/**
 * Generates a realistic sample orders CSV file containing ~10,000 records
 * @param {string} outputPath 
 * @param {number} totalRecords 
 */
function generateSampleCsv(outputPath, totalRecords = 10000) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(outputPath);
  writeStream.write('order_id,customer_id,order_date,order_amount,status\n');

  const statuses = ['COMPLETED', 'PENDING', 'CANCELLED', 'PROCESSING'];

  for (let i = 1; i <= totalRecords; i += 1) {
    const orderId = `ORD-2026-${String(i).padStart(6, '0')}`;
    const customerId = `CUST-${String((i % 500) + 1).padStart(4, '0')}`;
    const orderDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString();
    const orderAmount = (Math.random() * 500 + 10).toFixed(2);
    const status = statuses[i % statuses.length];

    // Intentionally inject ~1% malformed records to test error isolation
    if (i % 100 === 0) {
      // Invalid row missing order_id or invalid amount
      writeStream.write(`,${customerId},${orderDate},-50.00,INVALID_STATUS\n`);
    } else {
      writeStream.write(`${orderId},${customerId},${orderDate},${orderAmount},${status}\n`);
    }
  }

  writeStream.end();
  console.log(`Sample CSV generated successfully at [${outputPath}] with ${totalRecords} records.`);
}

if (require.main === module) {
  const targetPath = path.join(__dirname, 'sample_orders_10k.csv');
  generateSampleCsv(targetPath, 10000);
}

module.exports = { generateSampleCsv };
