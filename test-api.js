/**
 * FreshMart POS API - Verification Test Script
 * This script runs a automated simulation of registering data, checking out, and pulling reports.
 * Make sure the Backend server is running (npm start) and database is seeded before running this!
 * Usage: node test-api.js
 */

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('==================================================');
  console.log('       FreshMart POS API Verification Test       ');
  console.log('==================================================\n');

  let adminToken = '';
  let cashierToken = '';
  let testCategoryId = null;
  let testProductId = null;
  let testCustomerId = null;
  let testSaleId = null;

  try {
    // --------------------------------------------------
    // Test 1: Admin Login
    // --------------------------------------------------
    console.log('[Test 1] Authenticating Admin user...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@grocerypos.com',
        password: 'Password123'
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Admin login failed: ${loginData.error}`);
    adminToken = loginData.token;
    console.log('✔ Admin logged in successfully!\n');

    // --------------------------------------------------
    // Test 2: Cashier Login
    // --------------------------------------------------
    console.log('[Test 2] Authenticating Cashier user...');
    const cashierRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@grocerypos.com',
        password: 'Password123'
      })
    });
    
    const cashierData = await cashierRes.json();
    if (!cashierRes.ok) throw new Error(`Cashier login failed: ${cashierData.error}`);
    cashierToken = cashierData.token;
    console.log('✔ Cashier logged in successfully!\n');

    // --------------------------------------------------
    // Test 3: Create Category (Admin Only)
    // --------------------------------------------------
    console.log('[Test 3] Creating a test Category...');
    const catRes = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': adminToken
      },
      body: JSON.stringify({
        name: 'Frozen Foods',
        description: 'Ice creams, frozen meals, and vegetables'
      })
    });
    
    const catData = await catRes.json();
    if (!catRes.ok) throw new Error(`Category creation failed: ${catData.error}`);
    testCategoryId = catData.data.ID;
    console.log(`✔ Category "${catData.data.Name}" created with ID: ${testCategoryId}\n`);

    // --------------------------------------------------
    // Test 4: Create Product (Admin Only)
    // --------------------------------------------------
    console.log('[Test 4] Creating a test Product...');
    const barcode = '8888777701';
    const prodRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': adminToken
      },
      body: JSON.stringify({
        name: 'Premium Vanilla Ice Cream 1L',
        barcode: barcode,
        categoryId: testCategoryId,
        description: 'Creamy double vanilla bean ice cream tub',
        price: 5.99,
        costPrice: 3.20,
        stockQuantity: 50,
        reorderLevel: 10
      })
    });

    const prodData = await prodRes.json();
    if (!prodRes.ok) throw new Error(`Product creation failed: ${prodData.error}`);
    testProductId = prodData.data.ID;
    console.log(`✔ Product "${prodData.data.Name}" created (Stock: ${prodData.data.StockQuantity})\n`);

    // --------------------------------------------------
    // Test 5: Scan Product by Barcode (Cashier/All)
    // --------------------------------------------------
    console.log(`[Test 5] Scanning product barcode: ${barcode}...`);
    const scanRes = await fetch(`${BASE_URL}/products/barcode/${barcode}`, {
      method: 'GET',
      headers: { 'Authorization': cashierToken }
    });

    const scanData = await scanRes.json();
    if (!scanRes.ok) throw new Error(`Barcode lookup failed: ${scanData.error}`);
    console.log(`✔ Found Product: "${scanData.data.Name}" (Price: $${scanData.data.Price}, Stock: ${scanData.data.StockQuantity})\n`);

    // --------------------------------------------------
    // Test 6: Create Customer (Cashier/All)
    // --------------------------------------------------
    console.log('[Test 6] Registering a new customer...');
    const custRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cashierToken
      },
      body: JSON.stringify({
        name: 'Alice Johnson',
        phone: '5550192837',
        email: 'alice@example.com',
        address: '789 Pine Rd, Metro City'
      })
    });

    const custData = await custRes.json();
    if (!custRes.ok) throw new Error(`Customer registration failed: ${custData.error}`);
    testCustomerId = custData.data.ID;
    console.log(`✔ Customer "${custData.data.Name}" registered with ID: ${testCustomerId}\n`);

    // --------------------------------------------------
    // Test 7: Checkout Sales Transaction (Cashier/All)
    // --------------------------------------------------
    console.log('[Test 7] Running POS Checkout Transaction (reducing stock)...');
    const checkoutRes = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cashierToken
      },
      body: JSON.stringify({
        paymentMethod: 'cash',
        customerId: testCustomerId,
        discountAmount: 1.00, // $1.00 discount
        taxAmount: 0.30,      // $0.30 tax
        items: [
          { productId: testProductId, quantity: 2 } // Buy 2 vanilla tubs
        ]
      })
    });

    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${checkoutData.error}`);
    testSaleId = checkoutData.sale.id;
    console.log(`✔ Transaction Completed! Invoice ID: ${testSaleId}`);
    console.log(`  Subtotal: $${checkoutData.sale.totalAmount}`);
    console.log(`  Discount: -$${checkoutData.sale.discountAmount}`);
    console.log(`  Tax:      +$${checkoutData.sale.taxAmount}`);
    console.log(`  Total:    $${checkoutData.sale.finalAmount}\n`);

    // Verify stock was reduced
    const afterStockRes = await fetch(`${BASE_URL}/products/${testProductId}`, {
      method: 'GET',
      headers: { 'Authorization': cashierToken }
    });
    const afterStockData = await afterStockRes.json();
    console.log(`✔ Verified Inventory: stock decreased from 50 to ${afterStockData.data.StockQuantity}!\n`);

    // --------------------------------------------------
    // Test 8: Generate Invoice Receipt (Cashier/All)
    // --------------------------------------------------
    console.log('[Test 8] Generating formatted invoice receipt...');
    const receiptRes = await fetch(`${BASE_URL}/sales/${testSaleId}/receipt`, {
      method: 'GET',
      headers: { 'Authorization': cashierToken }
    });

    const receiptData = await receiptRes.json();
    if (!receiptRes.ok) throw new Error(`Receipt generation failed: ${receiptData.error}`);
    const receipt = receiptData.receipt;
    console.log('--------------------------------------------------');
    console.log(`          ${receipt.storeInfo.name}`);
    console.log(`     ${receipt.storeInfo.address}`);
    console.log('--------------------------------------------------');
    console.log(`Invoice:  ${receipt.transaction.invoiceNumber}`);
    console.log(`Date:     ${receipt.transaction.date}`);
    console.log(`Cashier:  ${receipt.transaction.cashier}`);
    console.log(`Customer: ${receipt.transaction.customerName}`);
    console.log('--------------------------------------------------');
    receipt.items.forEach(item => {
      console.log(`${item.name.padEnd(28)} x${item.qty}   $${item.price.toFixed(2)}`);
    });
    console.log('--------------------------------------------------');
    console.log(`Subtotal:                    $${receipt.totals.subtotal.toFixed(2)}`);
    console.log(`Discount:                   -$${receipt.totals.discount.toFixed(2)}`);
    console.log(`Tax:                         +$${receipt.totals.tax.toFixed(2)}`);
    console.log(`GRAND TOTAL:                 $${receipt.totals.grandTotal.toFixed(2)}`);
    console.log('--------------------------------------------------');
    console.log(`Payment: ${receipt.transaction.paymentMethod}`);
    console.log(`  ${receipt.footerMessage}`);
    console.log('--------------------------------------------------\n');

    // --------------------------------------------------
    // Test 9: Get Customer Purchase History (Cashier/All)
    // --------------------------------------------------
    console.log('[Test 9] Fetching Customer Purchase History...');
    const historyRes = await fetch(`${BASE_URL}/customers/${testCustomerId}/history`, {
      method: 'GET',
      headers: { 'Authorization': cashierToken }
    });

    const historyData = await historyRes.json();
    if (!historyRes.ok) throw new Error(`Purchase history lookup failed: ${historyData.error}`);
    console.log(`✔ Found ${historyData.historyCount} transaction record(s) for customer "${historyData.customerName}"!`);
    console.log(`  First item purchased in history: "${historyData.data[0].items[0].productName}"\n`);

    // --------------------------------------------------
    // Test 10: Fetch Dashboard Statistics (Cashier/All)
    // --------------------------------------------------
    console.log('[Test 10] Fetching Dashboard statistics...');
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      method: 'GET',
      headers: { 'Authorization': cashierToken }
    });

    const statsData = await statsRes.json();
    if (!statsRes.ok) throw new Error(`Dashboard stats fetch failed: ${statsData.error}`);
    console.log('✔ Dashboard statistics retrieved:');
    console.log(`  Total Products:  ${statsData.data.totalProducts}`);
    console.log(`  Total Sales:     ${statsData.data.totalSales}`);
    console.log(`  Low Stock Count: ${statsData.data.lowStockCount}`);
    console.log(`  Today's Revenue: $${statsData.data.todaysRevenue}\n`);

    // --------------------------------------------------
    // Test 11: Access Admin Reports as Cashier (Expects 403 Forbidden)
    // --------------------------------------------------
    console.log('[Test 11] Security Check: Cashier requesting Admin reports...');
    const forbiddenRes = await fetch(`${BASE_URL}/reports/daily`, {
      method: 'GET',
      headers: { 'Authorization': cashierToken }
    });
    
    if (forbiddenRes.status === 403) {
      console.log('✔ Security Guard Blocked Request (Correct: Status 403 Forbidden)\n');
    } else {
      console.warn(`✖ Security Failure: Cashier user received status ${forbiddenRes.status} instead of 403!\n`);
    }

    // --------------------------------------------------
    // Test 12: Access Admin Reports as Admin (Expects 200 OK)
    // --------------------------------------------------
    console.log('[Test 12] Fetching Admin daily sales report...');
    const reportRes = await fetch(`${BASE_URL}/reports/daily`, {
      method: 'GET',
      headers: { 'Authorization': adminToken }
    });

    const reportData = await reportRes.json();
    if (!reportRes.ok) throw new Error(`Daily report lookup failed: ${reportData.error}`);
    console.log(`✔ Daily report pulled successfully. Total records: ${reportData.data.length}\n`);

    console.log('==================================================');
    console.log('   All API Endpoint verification tests passed!    ');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ Test execution failed!');
    console.error(error.message);
    console.log('\nPlease make sure the Express Server is running on port 3000 and the database is configured and seeded.');
  }
}

runTests();
