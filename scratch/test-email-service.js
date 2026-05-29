const emailService = require('../services/emailService');
const { Tenant } = require('../models');

async function test() {
  console.log('Testing Email Service hooks and templates...');

  // Mock tenant
  const mockTenant = Tenant.build({
    id: 9999,
    name: 'Test Store Shop',
    contactName: 'Jane Doe',
    contactEmail: 'jane.doe@example.com',
    paymentStatus: 'pending'
  });

  console.log('\n--- 1. Testing Welcome Email (Pending Payment) ---');
  console.log('Calling welcome email trigger...');
  await emailService.sendWelcomeEmail(mockTenant);

  // Change status to paid
  mockTenant.paymentStatus = 'paid';
  console.log('\n--- 2. Testing Welcome Email (Paid Status) ---');
  await emailService.sendWelcomeEmail(mockTenant);

  console.log('\n--- 3. Testing Payment Confirmed Email ---');
  await emailService.sendPaymentConfirmedEmail(mockTenant);

  console.log('\nTesting complete.');
}

test().catch(console.error);
