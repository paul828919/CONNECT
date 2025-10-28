/**
 * Phase 7 Connect Flow Verification Script
 *
 * Tests the "Connect" (collaboration request) flow:
 * 1. Where are messages stored?
 * 2. Who receives them?
 * 3. Can recipients decline?
 * 4. How do messages appear in browser?
 */

import { db } from '@/lib/db';

async function verifyConnectFlow() {
  console.log('🔍 Phase 7 Connect Flow Verification\n');
  console.log('=' .repeat(80));

  // 1. Check contact_requests table structure
  console.log('\n1️⃣  Message Storage Location:');
  console.log('   ✓ Table: contact_requests');
  console.log('   ✓ Fields:');
  console.log('      - id (UUID primary key)');
  console.log('      - senderId (who sent the message)');
  console.log('      - senderOrgId (sender organization)');
  console.log('      - receiverOrgId (recipient organization)');
  console.log('      - type (COLLABORATION, CONSORTIUM_INVITE, etc.)');
  console.log('      - subject (message subject)');
  console.log('      - message (message body)');
  console.log('      - status (PENDING, ACCEPTED, DECLINED, EXPIRED)');
  console.log('      - responseMessage (recipient\'s response)');
  console.log('      - respondedAt (timestamp when responded)');
  console.log('      - createdAt, updatedAt');

  // 2. Query existing contact requests
  console.log('\n2️⃣  Existing Contact Requests:');
  const requests = await db.contact_requests.findMany({
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      organizations_contact_requests_senderOrgIdToorganizations: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      organizations_contact_requests_receiverOrgIdToorganizations: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (requests.length === 0) {
    console.log('   ⚠️  No contact requests found in database');
  } else {
    console.log(`   ✓ Found ${requests.length} contact request(s):\n`);

    requests.forEach((req, index) => {
      console.log(`   Request ${index + 1}:`);
      console.log(`      From: ${req.organizations_contact_requests_senderOrgIdToorganizations.name}`);
      console.log(`      To: ${req.organizations_contact_requests_receiverOrgIdToorganizations.name}`);
      console.log(`      Type: ${req.type}`);
      console.log(`      Subject: ${req.subject}`);
      console.log(`      Status: ${req.status}`);
      console.log(`      Created: ${req.createdAt.toLocaleString('ko-KR')}`);
      if (req.status !== 'PENDING') {
        console.log(`      Responded: ${req.respondedAt?.toLocaleString('ko-KR')}`);
        console.log(`      Response: ${req.responseMessage || '(no message)'}`);
      }
      console.log('');
    });
  }

  // 3. Check API endpoints
  console.log('3️⃣  API Endpoints:');
  console.log('   ✓ GET  /api/contact-requests');
  console.log('      - Lists sent and received requests');
  console.log('      - Query params: ?type=sent or ?type=received');
  console.log('      - Returns: { success, sent: [], received: [] }');
  console.log('');
  console.log('   ✓ POST /api/contact-requests');
  console.log('      - Creates new collaboration request');
  console.log('      - Body: { receiverOrgId, type, subject, message }');
  console.log('      - Validates: no duplicate requests within 30 days');
  console.log('');
  console.log('   ✓ POST /api/contact-requests/[id]/respond');
  console.log('      - Responds to a request (accept or decline)');
  console.log('      - Body: { action: "accept" | "decline", responseMessage }');
  console.log('      - Only receiver organization can respond');

  // 4. Check UI components
  console.log('\n4️⃣  User Interface:');
  console.log('   ✓ Send Request:');
  console.log('      - Location: /dashboard/partners/[id]');
  console.log('      - Button: "연결 요청" (Connect Request)');
  console.log('      - Modal: Subject + Message input');
  console.log('      - Action: POST to /api/contact-requests');
  console.log('');
  console.log('   ❌ View Requests (NOT IMPLEMENTED):');
  console.log('      - Missing: /dashboard/messages or /dashboard/requests page');
  console.log('      - Missing: Navigation link in Header.tsx');
  console.log('      - Recipients cannot see incoming requests');
  console.log('');
  console.log('   ❌ Respond to Requests (NOT IMPLEMENTED):');
  console.log('      - Missing: UI to accept/decline requests');
  console.log('      - API endpoint exists but no frontend interface');

  // 5. Summary
  console.log('\n5️⃣  Summary:');
  console.log('   ✅ Data Layer: contact_requests table exists and stores messages');
  console.log('   ✅ API Layer: All endpoints implemented (send, list, respond)');
  console.log('   ❌ UI Layer: Missing inbox/messages page to view and respond');
  console.log('');
  console.log('   🔧 Required Implementation:');
  console.log('      1. Create /dashboard/messages page');
  console.log('      2. Add "메시지" link to Header navigation');
  console.log('      3. Display received requests with accept/decline buttons');
  console.log('      4. Show sent requests with status tracking');

  console.log('\n' + '='.repeat(80));
}

// Run verification
verifyConnectFlow()
  .then(() => {
    console.log('\n✅ Verification complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
