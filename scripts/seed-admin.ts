import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import Admin from '../models/Admin';
import { getStoredAdSettings } from '../services/admin/ads.service';
import { hashPassword } from '../utils/password';

dotenv.config({ quiet: true });

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@brazz.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set ADMIN_PASSWORD to a unique password of at least 12 characters');
  }
  await connectDB();
  const name = (process.env.ADMIN_NAME || 'Admin User').trim() || 'Admin User';

  const resetPassword =
    process.argv.includes('--reset-password') || process.env.RESET_ADMIN_PASSWORD === '1';

  const existing = await Admin.findOne({ email }).select('+passwordHash');
  if (!existing) {
    await Admin.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  } else if (resetPassword) {
    await Admin.updateOne(
      { _id: existing._id },
      { $set: { name, passwordHash: await hashPassword(password) }, $inc: { sessionVersion: 1 } },
    );
    console.log(`Admin password reset: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  await getStoredAdSettings();
  console.log('Ad settings ready');

  await mongoose.disconnect();
}

seedAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Failed to seed admin';
  console.error(message);
  process.exit(1);
});
