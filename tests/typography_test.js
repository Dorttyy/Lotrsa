#!/usr/bin/env node
/**
 * Typography changes verification test.
 * Verifies chat header and moments heading typography changes.
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('TYPOGRAPHY CHANGES VERIFICATION');
console.log('='.repeat(60));

let allPassed = true;

// Test 1: Chat header name typography
console.log('\n1. Verifying chat header name typography (24->18, line 24, minWidth 0, minHeight 48)...');
const chatPath = path.join(__dirname, '../frontend/app/chat/[id].tsx');
const chatSource = fs.readFileSync(chatPath, 'utf8');

const checks = [
  { name: 'headerName fontSize 18', pattern: /headerName:\s*\{[^}]*fontSize:\s*18/ },
  { name: 'headerName lineHeight 24', pattern: /headerName:\s*\{[^}]*fontSize:\s*18[^}]*lineHeight:\s*24/ },
  { name: 'headerInfo minWidth 0', pattern: /headerInfo:\s*\{[^}]*minWidth:\s*0/ },
  { name: 'headerInfo minHeight 48', pattern: /headerInfo:\s*\{[^}]*minHeight:\s*48/ }
];

for (const check of checks) {
  if (check.pattern.test(chatSource)) {
    console.log(`   ✓ ${check.name}`);
  } else {
    console.log(`   ✗ ${check.name} not found`);
    allPassed = false;
  }
}

// Test 2: Moments main heading typography
console.log('\n2. Verifying moments main heading typography (24->28, line 34)...');
const momentsPath = path.join(__dirname, '../frontend/app/(tabs)/moments.tsx');
const momentsSource = fs.readFileSync(momentsPath, 'utf8');

const momentsChecks = [
  { name: 'headerTitle fontSize 28', pattern: /headerTitle:\s*\{[^}]*fontSize:\s*28/ },
  { name: 'headerTitle lineHeight 34', pattern: /headerTitle:\s*\{[^}]*fontSize:\s*28[^}]*lineHeight:\s*34/ }
];

for (const check of momentsChecks) {
  if (check.pattern.test(momentsSource)) {
    console.log(`   ✓ ${check.name}`);
  } else {
    console.log(`   ✗ ${check.name} not found`);
    allPassed = false;
  }
}

// Test 3: Receipt wording (Delivered -> Sent)
console.log('\n3. Verifying receipt wording (Delivered -> Sent)...');
if (chatSource.includes('"Sent"') && !chatSource.includes('"Delivered"')) {
  console.log('   ✓ Receipt shows "Sent" (not "Delivered")');
} else if (chatSource.includes('"Delivered"')) {
  console.log('   ✗ Found "Delivered" - should be "Sent"');
  allPassed = false;
} else {
  console.log('   ✗ Receipt text not found');
  allPassed = false;
}

// Test 4: Seen/read timestamp preserved
console.log('\n4. Verifying Seen/read timestamp logic preserved...');
const seenPattern = /partnerReadAt\s*&&\s*partnerReadAt\s*>=\s*item\.created_at[^?]*\?\s*"Seen"/;
if (seenPattern.test(chatSource)) {
  console.log('   ✓ "Seen" logic preserved (partnerReadAt >= created_at)');
} else {
  console.log('   ✗ "Seen" logic changed or missing');
  allPassed = false;
}

// Test 5: Checkmarks unchanged
console.log('\n5. Verifying checkmark rendering unchanged...');
const checkmarkPattern = /"checkmark-done"|"checkmark"/;
if (checkmarkPattern.test(chatSource)) {
  console.log('   ✓ Checkmark icon rendering preserved');
} else {
  console.log('   ✗ Checkmark icon changed or missing');
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('TYPOGRAPHY CHANGES SUMMARY');
console.log('='.repeat(60));

if (allPassed) {
  console.log('✓ ALL TYPOGRAPHY CHANGES VERIFIED');
  console.log('\nVerified:');
  console.log('  • Chat header name: fontSize 18, lineHeight 24');
  console.log('  • Chat header info: minWidth 0, minHeight 48');
  console.log('  • Moments heading: fontSize 28, lineHeight 34');
  console.log('  • Receipt wording: "Sent" (not "Delivered")');
  console.log('  • Seen/read timestamp logic: unchanged');
  console.log('  • Checkmark rendering: unchanged');
  process.exit(0);
} else {
  console.log('✗ SOME TYPOGRAPHY CHECKS FAILED');
  process.exit(1);
}
