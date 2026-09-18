#!/usr/bin/env node
/**
 * Static icon alias and PNG integrity test.
 * Tests UploadedActionIcon.tsx aliases and PNG data without mounting UI.
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Expected SHA256 hashes for the 5 PNGs
const EXPECTED_HASHES = {
  lightning: '99b1124469b6c53dc826b65bf1a0b4340bfa4c2aaf2161a6bcdc1484015a73af',
  notification: 'e54190b0012abfcad9485bf077aed533bd2056bb4259f242fa8a9d6ee6509dc6',
  call: 'a4fc4690b354323f45e191ba930b93f74f94a1f595f2788f08c02db0a0a8ff29',
  speakerMute: '8eabe579fabcf8bf451bbe1751fa29bd7f3becd4e8f28a87a1154edf812c118c',
  menu: '89350331cf55756ab8739b51e234f189c067f1b07042c69f7d145bf799839b1b'
};

// Aliases that SHOULD match (base names only, -outline/-sharp handled by resolver)
const POSITIVE_ALIASES = {
  'flash': 'lightning',
  'bolt': 'lightning',
  'lightning': 'lightning',
  'notifications': 'notification',
  'bell': 'notification',
  'call': 'call',
  'phone': 'call',
  'volume-mute': 'speakerMute',
  'volume-off': 'speakerMute',
  'menu': 'menu',
  'reorder-three': 'menu',
  'reorder-four': 'menu'
};

// Suffix variants that should resolve via the -outline/-sharp stripping logic
const SUFFIX_VARIANTS = [
  { input: 'flash-outline', base: 'flash', expected: 'lightning' },
  { input: 'flash-sharp', base: 'flash', expected: 'lightning' },
  { input: 'bolt-outline', base: 'bolt', expected: 'lightning' },
  { input: 'bolt-sharp', base: 'bolt', expected: 'lightning' }
];

// Aliases that should NOT match
const NEGATIVE_ALIASES = [
  'mic-off',
  'microphone-off',
  'notifications-off',
  'bell-off',
  'volume-high',
  'ellipsis',
  'phone-portrait'
];

console.log('='.repeat(60));
console.log('ICON ALIAS & PNG INTEGRITY TEST');
console.log('='.repeat(60));

let allPassed = true;

// Test 1: Load and parse the icon JSON
console.log('\n1. Loading action-upload-icons.json...');
const iconJsonPath = path.join(__dirname, '../frontend/src/assets/action-upload-icons.json');
let iconData;
try {
  const rawData = fs.readFileSync(iconJsonPath, 'utf8');
  iconData = JSON.parse(rawData);
  console.log('   ✓ JSON loaded successfully');
  console.log(`   ✓ Found ${Object.keys(iconData).length} icons: ${Object.keys(iconData).join(', ')}`);
} catch (e) {
  console.log(`   ✗ Failed to load JSON: ${e.message}`);
  allPassed = false;
  process.exit(1);
}

// Test 2: Verify PNG data and SHA256 hashes
console.log('\n2. Verifying PNG data and SHA256 hashes...');
for (const [key, expectedHash] of Object.entries(EXPECTED_HASHES)) {
  if (!iconData[key]) {
    console.log(`   ✗ Missing icon: ${key}`);
    allPassed = false;
    continue;
  }
  
  const dataUri = iconData[key];
  if (!dataUri.startsWith('data:image/png;base64,')) {
    console.log(`   ✗ ${key}: Invalid data URI format`);
    allPassed = false;
    continue;
  }
  
  const base64Data = dataUri.replace('data:image/png;base64,', '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Check PNG header
  const pngHeader = buffer.slice(0, 8);
  const expectedPngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!pngHeader.equals(expectedPngHeader)) {
    console.log(`   ✗ ${key}: Invalid PNG header`);
    allPassed = false;
    continue;
  }
  
  // Calculate SHA256
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  if (hash === expectedHash) {
    console.log(`   ✓ ${key}: SHA256 verified (${hash.substring(0, 16)}...)`);
  } else {
    console.log(`   ✗ ${key}: SHA256 mismatch`);
    console.log(`      Expected: ${expectedHash}`);
    console.log(`      Got:      ${hash}`);
    allPassed = false;
  }
  
  // Check dimensions (500x500) - read IHDR chunk
  const ihdrStart = 16; // After PNG signature and IHDR length/type
  const width = buffer.readUInt32BE(ihdrStart);
  const height = buffer.readUInt32BE(ihdrStart + 4);
  
  if (width === 500 && height === 500) {
    console.log(`   ✓ ${key}: Dimensions verified (500x500)`);
  } else {
    console.log(`   ✗ ${key}: Wrong dimensions (${width}x${height}, expected 500x500)`);
    allPassed = false;
  }
}

// Test 3: Load and parse the TypeScript component
console.log('\n3. Analyzing UploadedActionIcon.tsx...');
const componentPath = path.join(__dirname, '../frontend/src/ui/UploadedActionIcon.tsx');
let componentSource;
try {
  componentSource = fs.readFileSync(componentPath, 'utf8');
  console.log('   ✓ Component source loaded');
} catch (e) {
  console.log(`   ✗ Failed to load component: ${e.message}`);
  allPassed = false;
  process.exit(1);
}

// Test 4: Verify alias mappings (static analysis)
console.log('\n4. Verifying positive alias mappings...');
for (const [input, expected] of Object.entries(POSITIVE_ALIASES)) {
  // Check for both quoted and unquoted keys
  const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const aliasRegex = new RegExp(`(["']${escapedInput}["']|${escapedInput})\\s*:\\s*["']${expected}["']`);
  if (aliasRegex.test(componentSource)) {
    console.log(`   ✓ ${input} -> ${expected}`);
  } else {
    console.log(`   ✗ ${input} -> ${expected} (not found in aliases)`);
    allPassed = false;
  }
}

// Test 5: Verify negative aliases (should NOT match)
console.log('\n5. Verifying suffix variant handling...');
for (const variant of SUFFIX_VARIANTS) {
  // The base alias should exist
  const escapedBase = variant.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseRegex = new RegExp(`(["']${escapedBase}["']|${escapedBase})\\s*:\\s*["']${variant.expected}["']`);
  if (baseRegex.test(componentSource)) {
    console.log(`   ✓ ${variant.input} -> ${variant.expected} (via suffix stripping to ${variant.base})`);
  } else {
    console.log(`   ✗ ${variant.input} base alias ${variant.base} not found`);
    allPassed = false;
  }
}

// Test 6: Verify negative aliases (should NOT match)
console.log('\n6. Verifying negative aliases (should NOT match)...');
for (const input of NEGATIVE_ALIASES) {
  // Check if this alias exists in the aliases object
  const aliasRegex = new RegExp(`["']${input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*:`);
  if (!aliasRegex.test(componentSource)) {
    console.log(`   ✓ ${input} correctly NOT mapped`);
  } else {
    console.log(`   ✗ ${input} incorrectly mapped (should not match)`);
    allPassed = false;
  }
}

// Test 7: Verify component props preservation
console.log('\n7. Verifying component props preservation...');
const propsToCheck = [
  { name: 'size', pattern: /size:\s*number/ },
  { name: 'color', pattern: /color:\s*ColorValue/ },
  { name: 'style', pattern: /style\?:\s*StyleProp/ },
  { name: 'testID', pattern: /testID\?:\s*string/ },
  { name: 'accessibilityLabel', pattern: /accessibilityLabel\?:\s*string/ }
];

for (const prop of propsToCheck) {
  if (prop.pattern.test(componentSource)) {
    console.log(`   ✓ ${prop.name} prop preserved`);
  } else {
    console.log(`   ✗ ${prop.name} prop missing or changed`);
    allPassed = false;
  }
}

// Test 8: Verify Image component usage
console.log('\n8. Verifying Image component rendering...');
const imageChecks = [
  { name: 'width/height from size', pattern: /width:\s*size,\s*height:\s*size/ },
  { name: 'tintColor from color', pattern: /tintColor:\s*color/ },
  { name: 'style prop passed', pattern: /style\s+as\s+StyleProp<ImageStyle>/ },
  { name: 'testID preserved', pattern: /testID=\{testID/ },
  { name: 'accessibilityLabel preserved', pattern: /accessibilityLabel=\{accessibilityLabel\}/ }
];

for (const check of imageChecks) {
  if (check.pattern.test(componentSource)) {
    console.log(`   ✓ ${check.name}`);
  } else {
    console.log(`   ✗ ${check.name} not found`);
    allPassed = false;
  }
}

// Test 9: Verify -outline/-sharp suffix handling
console.log('\n9. Verifying -outline/-sharp suffix handling...');
const suffixPattern = /replace\(\/\-\(outline\|sharp\)\$\/i,\s*['"]['"]?\)/;
if (suffixPattern.test(componentSource)) {
  console.log('   ✓ -outline/-sharp suffix stripping implemented');
} else {
  console.log('   ✗ -outline/-sharp suffix stripping not found');
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('ICON ALIAS & PNG INTEGRITY SUMMARY');
console.log('='.repeat(60));

if (allPassed) {
  console.log('✓ ALL ICON TESTS PASSED');
  console.log('\nVerified:');
  console.log('  • 5 PNG files with correct SHA256 hashes');
  console.log('  • All PNG dimensions are 500x500');
  console.log('  • All positive aliases map correctly');
  console.log('  • All negative aliases correctly excluded');
  console.log('  • Component props preserved (size, color, style, testID, accessibilityLabel)');
  console.log('  • Image rendering preserves all transforms');
  console.log('  • -outline/-sharp suffix handling working');
  process.exit(0);
} else {
  console.log('✗ SOME ICON TESTS FAILED');
  process.exit(1);
}
