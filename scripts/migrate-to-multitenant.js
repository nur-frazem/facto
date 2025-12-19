/**
 * Migration Script: Single-tenant to Multi-tenant
 *
 * This script migrates existing Firestore data from the old single-tenant
 * structure to the new multi-tenant structure where each company's data
 * is nested under their RUT.
 *
 * BEFORE RUNNING:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase service account key from:
 *    Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 * 3. Save the key as 'serviceAccountKey.json' in the scripts folder
 *    (DO NOT commit this file to git!)
 * 4. Add 'serviceAccountKey.json' to .gitignore
 *
 * USAGE:
 * node scripts/migrate-to-multitenant.js
 *
 * WARNING: Run this script only once! It does not check for duplicate data.
 */

const admin = require('firebase-admin');
const path = require('path');

// Configuration
const TARGET_COMPANY_RUT = '761836722'; // Default company RUT (without dots/dashes)
const ROOT_DOC = '_root'; // Root document within company collection
const COMPANY_INFO = {
  nombre: 'Mi Empresa',    // Update with actual company name
  giro: '',                // Update with actual business activity
  direccion: ''            // Update with actual address
};

// Collections to migrate (from root to under company document)
const COLLECTIONS_TO_MIGRATE = [
  'empresas',
  'auditoria',
  'pago_recepcion',
  'values'
];

// Subcollections within empresas documents
const EMPRESAS_SUBCOLLECTIONS = [
  'facturas',
  'facturasExentas',
  'notasCredito',
  'boletas'
];

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  console.error('\n❌ Error: serviceAccountKey.json not found!');
  console.error('\nPlease download your Firebase service account key:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save the file as "scripts/serviceAccountKey.json"');
  console.error('\nIMPORTANT: Add serviceAccountKey.json to .gitignore!\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper function to copy a document
async function copyDocument(sourceRef, destRef) {
  const docSnap = await sourceRef.get();
  if (docSnap.exists) {
    await destRef.set(docSnap.data());
    return true;
  }
  return false;
}

// Helper function to copy a collection
async function copyCollection(sourceCollectionRef, destCollectionRef, collectionName) {
  const snapshot = await sourceCollectionRef.get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const destDocRef = destCollectionRef.doc(doc.id);
    await destDocRef.set(doc.data());
    count++;

    // If this is the 'empresas' collection, also copy subcollections
    if (collectionName === 'empresas') {
      for (const subCollection of EMPRESAS_SUBCOLLECTIONS) {
        const subCount = await copyCollection(
          doc.ref.collection(subCollection),
          destDocRef.collection(subCollection),
          subCollection
        );
        if (subCount > 0) {
          console.log(`    └── ${subCollection}: ${subCount} documents`);
        }
      }
    }
  }

  return count;
}

// Main migration function
async function migrate() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     FACTO - Migration to Multi-Tenant Structure            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Target Company RUT: ${TARGET_COMPANY_RUT}\n`);

  try {
    // Step 1: Create company document
    console.log('📁 Step 1: Creating company document...');
    const companyDocRef = db.collection(TARGET_COMPANY_RUT).doc(ROOT_DOC);
    await companyDocRef.set(COMPANY_INFO, { merge: true });
    console.log(`   ✓ Company document created at /${TARGET_COMPANY_RUT}/${ROOT_DOC}\n`);

    // Step 2: Migrate collections
    console.log('📦 Step 2: Migrating collections...');
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const sourceRef = db.collection(collectionName);
      const destRef = db.collection(TARGET_COMPANY_RUT).doc(ROOT_DOC).collection(collectionName);

      console.log(`\n   Migrating "${collectionName}"...`);
      const count = await copyCollection(sourceRef, destRef, collectionName);
      console.log(`   ✓ Migrated ${count} documents from "${collectionName}"`);
    }

    // Step 3: Update all users to add empresas array
    console.log('\n👤 Step 3: Updating users with company access...');
    const usersRef = db.collection('usuarios');
    const usersSnapshot = await usersRef.get();
    let userCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const empresas = userData.empresas || [];

      // Add the company RUT if not already present
      if (!empresas.includes(TARGET_COMPANY_RUT)) {
        empresas.push(TARGET_COMPANY_RUT);
        await userDoc.ref.update({ empresas });
        userCount++;
        console.log(`   ✓ Updated user: ${userDoc.id}`);
      }
    }
    console.log(`   ✓ Updated ${userCount} users with company access\n`);

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    MIGRATION COMPLETE!                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('Next steps:');
    console.log('1. Deploy the updated application');
    console.log('2. Deploy the updated Firestore rules: firebase deploy --only firestore:rules');
    console.log('3. Test login with RUT: 76.183.672-2');
    console.log('4. Once verified, you can optionally delete the old root collections\n');

    console.log('⚠️  IMPORTANT: The old root collections still exist.');
    console.log('   Delete them manually after verifying the migration worked.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate().then(() => {
  console.log('Script completed.\n');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
