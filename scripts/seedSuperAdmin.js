// scripts/seedSuperAdmin.js
//
// Usage:
//   node scripts/seedSuperAdmin.js
//
// Run this ONCE to create the first super admin account.
// You'll be prompted for name, phone, and password interactively.
//
// For non-interactive use (e.g. CI), set env vars and pass --auto:
//   ADMIN_NAME="Yusufia Abichi" ADMIN_PHONE="08012345678" ADMIN_PASSWORD="..." \
//   node scripts/seedSuperAdmin.js --auto

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const readline = require('readline');
const User     = require('../src/modules/users/users.model');
const { ADMIN_ROLES } = require('../src/constants/adminPermissions');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
};

const main = async () => {
  await connectDB();

  const isAuto = process.argv.includes('--auto');

  let name, phone, password;

  if (isAuto) {
    name     = process.env.ADMIN_NAME;
    phone    = process.env.ADMIN_PHONE;
    password = process.env.ADMIN_PASSWORD;

    if (!name || !phone || !password) {
      console.error('❌ ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD env vars are required with --auto');
      process.exit(1);
    }
  } else {
    name     = await ask('Admin full name: ');
    phone    = await ask('Admin phone number: ');
    password = await ask('Admin password (min 6 chars): ');
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  // Check if a super admin already exists
  const existingSuperAdmin = await User.findOne({ adminRole: ADMIN_ROLES.SUPER_ADMIN });
  if (existingSuperAdmin) {
    console.log(`⚠️  A super admin already exists: ${existingSuperAdmin.name} (${existingSuperAdmin.phone})`);
    const proceed = isAuto ? 'no' : await ask('Create another super admin anyway? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Check for existing user with this phone
  const existing = await User.findOne({ phone });
  if (existing) {
    console.error(`❌ A user with phone ${phone} already exists (role: ${existing.role})`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await User.create({
    name,
    phone,
    password: hashedPassword,
    role: 'admin',
    adminRole: ADMIN_ROLES.SUPER_ADMIN,
    permissions: [], // super admin has all permissions implicitly
    isActive: true,
    // No subscription/trial fields needed for admins, but if your schema
    // requires them, set sensible defaults:
    subscription: {
      plan: 'premium',
      status: 'active'
    }
  });

  console.log('\n✅ Super admin created successfully!');
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Phone: ${admin.phone}`);
  console.log(`   Role:  ${admin.adminRole}`);
  console.log('\nThey can now log in via the normal /auth/login endpoint.');

  rl.close();
  await mongoose.disconnect();
  process.exit(0);
};

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});