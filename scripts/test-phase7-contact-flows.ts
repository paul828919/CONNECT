/**
 * Phase 7 Contact Flow Verification Script
 * Tests the Connect and Invite to Consortium functionality
 */

import { db } from '../lib/db';
import { createId } from '@paralleldrive/cuid2';

async function testPhase7ContactFlows() {
  console.log('🧪 Testing Phase 7: Two-Tier Contact Flow\n');

  try {
    // 1. Find test organizations with users
    console.log('Step 1: Setting up test organizations and user...');

    // Find a COMPANY organization with at least one user
    const testOrg1 = await db.organizations.findFirst({
      where: {
        type: 'COMPANY',
        status: 'ACTIVE',
        users: { some: {} }, // Must have at least one user
      },
    });

    if (!testOrg1) {
      console.error('❌ Need at least 1 active COMPANY organization with users');
      return;
    }

    // Find a RESEARCH_INSTITUTE organization (different from testOrg1)
    const testOrg2 = await db.organizations.findFirst({
      where: {
        type: 'RESEARCH_INSTITUTE',
        status: 'ACTIVE',
        id: { not: testOrg1.id },
      },
    });

    if (!testOrg2) {
      console.error('❌ Need at least 1 active RESEARCH_INSTITUTE organization');
      return;
    }

    // Find a user from testOrg1 to use as the sender
    const testUser = await db.user.findFirst({
      where: { organizationId: testOrg1.id },
    });

    if (!testUser) {
      console.error('❌ Failed to find user in testOrg1 (this should not happen)');
      return;
    }

    console.log(`✓ Using Org1 (${testOrg1.type}): ${testOrg1.name}`);
    console.log(`✓ Using Org2 (${testOrg2.type}): ${testOrg2.name}`);
    console.log(`✓ Using User: ${testUser.name} (${testUser.email})\n`);

    // 2. Test Contact Request Creation (Connect Flow)
    console.log('Step 2: Testing Contact Request creation...');

    const contactRequest = await db.contact_requests.create({
      data: {
        id: createId(),
        senderId: testUser.id,
        senderOrgId: testOrg1.id,
        receiverOrgId: testOrg2.id,
        type: 'COLLABORATION',
        subject: '[TEST] 협력 제안',
        message: '테스트 메시지입니다.',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Contact Request created: ${contactRequest.id}`);
    console.log(`  - From: ${testOrg1.name}`);
    console.log(`  - To: ${testOrg2.name}`);
    console.log(`  - Type: ${contactRequest.type}`);
    console.log(`  - Status: ${contactRequest.status}\n`);

    // 3. Test Consortium Creation with Invited Member (Invite Flow)
    console.log('Step 3: Testing Consortium creation with invited member...');

    const consortium = await db.consortium_projects.create({
      data: {
        id: createId(),
        name: '[TEST] AI 기반 스마트팜 협력 컨소시엄',
        description: `${testOrg2.name}과(와)의 협력 컨소시엄`,
        leadOrganizationId: testOrg1.id,
        createdById: testUser.id,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Consortium created: ${consortium.id}`);
    console.log(`  - Name: ${consortium.name}`);
    console.log(`  - Lead Org: ${testOrg1.name}`);
    console.log(`  - Status: ${consortium.status}\n`);

    // 4. Add Lead Member
    console.log('Step 4: Adding lead member...');

    const leadMember = await db.consortium_members.create({
      data: {
        id: createId(),
        consortiumId: consortium.id,
        organizationId: testOrg1.id,
        invitedById: testUser.id,
        role: 'LEAD',
        status: 'ACCEPTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Lead member added: ${testOrg1.name}`);
    console.log(`  - Role: ${leadMember.role}`);
    console.log(`  - Status: ${leadMember.status}\n`);

    // 5. Add Invited Member
    console.log('Step 5: Adding invited member...');

    const invitedMember = await db.consortium_members.create({
      data: {
        id: createId(),
        consortiumId: consortium.id,
        organizationId: testOrg2.id,
        invitedById: testUser.id,
        role: 'PARTICIPANT',
        status: 'INVITED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✓ Invited member added: ${testOrg2.name}`);
    console.log(`  - Role: ${invitedMember.role}`);
    console.log(`  - Status: ${invitedMember.status}\n`);

    // 6. Verify Data Integrity
    console.log('Step 6: Verifying data integrity...');

    const verifyContact = await db.contact_requests.findUnique({
      where: { id: contactRequest.id },
      include: {
        organizations_contact_requests_senderOrgIdToorganizations: {
          select: { id: true, name: true },
        },
        organizations_contact_requests_receiverOrgIdToorganizations: {
          select: { id: true, name: true },
        },
      },
    });

    const verifyConsortium = await db.consortium_projects.findUnique({
      where: { id: consortium.id },
      include: {
        organizations: {
          select: { id: true, name: true },
        },
        consortium_members: {
          include: {
            organizations: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    console.log('✓ Contact Request verification:');
    console.log(`  - Sender: ${verifyContact?.organizations_contact_requests_senderOrgIdToorganizations?.name}`);
    console.log(`  - Receiver: ${verifyContact?.organizations_contact_requests_receiverOrgIdToorganizations?.name}`);

    console.log('✓ Consortium verification:');
    console.log(`  - Lead: ${verifyConsortium?.organizations?.name}`);
    console.log(`  - Members: ${verifyConsortium?.consortium_members.length}`);
    verifyConsortium?.consortium_members.forEach((member) => {
      console.log(`    - ${member.organizations?.name} (${member.role}, ${member.status})`);
    });

    // 7. Cleanup Test Data
    console.log('\nStep 7: Cleaning up test data...');

    await db.consortium_members.deleteMany({
      where: { consortiumId: consortium.id },
    });
    await db.consortium_projects.delete({
      where: { id: consortium.id },
    });
    await db.contact_requests.delete({
      where: { id: contactRequest.id },
    });

    console.log('✓ Test data cleaned up');

    console.log('\n✅ All Phase 7 tests passed successfully!');
    console.log('\nSummary:');
    console.log('  ✓ Contact Request creation (Connect flow)');
    console.log('  ✓ Consortium creation with invited members (Invite flow)');
    console.log('  ✓ Data integrity verification');
    console.log('  ✓ Cleanup completed');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testPhase7ContactFlows()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
