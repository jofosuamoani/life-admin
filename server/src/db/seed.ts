import type { CreateTaskInput } from '@life-admin/shared';
import { hashPassword } from '../lib/password';
import type { UserRepository } from '../modules/auth';
import type { TaskRepository } from '../modules/tasks/task.repository';

/**
 * DEVELOPMENT ONLY demo account. Never seeded when NODE_ENV=production
 * (see config.seedDemoData). The email must match migration 2, which
 * assigns pre-auth tasks to this account.
 */
export const DEMO_EMAIL = 'demo@lifeadmin.local';
export const DEMO_PASSWORD = 'lifeadmin-demo';
const DEMO_NAME = 'Demo User';

/** Returns a YYYY-MM-DD string offset from today, so seed data always looks current. */
function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const seedTasks: CreateTaskInput[] = [
  { title: 'Renew passport', category: 'Documents', dueDate: daysFromToday(21), priority: 'High' },
  { title: 'Book annual physical', category: 'Health', dueDate: daysFromToday(5), priority: 'Medium' },
  { title: 'Car oil change', category: 'Car', dueDate: daysFromToday(-2), priority: 'Medium' },
  { title: 'Pay credit card bill', category: 'Money', dueDate: daysFromToday(0), priority: 'High' },
  { title: 'Update resume with recent projects', category: 'Career', dueDate: daysFromToday(10), priority: 'Low' },
  { title: 'Replace smoke detector batteries', category: 'Home', dueDate: daysFromToday(3), priority: 'Medium' },
  { title: 'Review monthly budget', category: 'Money', dueDate: daysFromToday(-5), priority: 'Medium', completed: true },
  { title: "Call grandma for her birthday", category: 'Personal', dueDate: daysFromToday(1), priority: 'High' },
  { title: 'Renew car registration', category: 'Car', dueDate: daysFromToday(30), priority: 'Low' },
  { title: 'File home insurance documents', category: 'Documents', dueDate: null, priority: 'Low', completed: true },
];

/**
 * Ensures the demo account exists and can log in.
 * - No demo user: create it and give it the example tasks.
 * - Demo user created by migration 2 (empty password): set the demo password;
 *   it keeps the tasks it inherited.
 * - Otherwise: leave it alone (never re-adds tasks the user deleted).
 */
export async function seedDemoData(users: UserRepository, tasks: TaskRepository): Promise<void> {
  const existing = users.findByEmail(DEMO_EMAIL);

  if (!existing) {
    const user = users.create({ name: DEMO_NAME, email: DEMO_EMAIL, passwordHash: await hashPassword(DEMO_PASSWORD) });
    for (const t of seedTasks) tasks.create(user.id, t);
    console.log(`[db] created demo account with ${seedTasks.length} example tasks`);
  } else if (!existing.passwordHash) {
    users.setPasswordHash(existing.id, await hashPassword(DEMO_PASSWORD));
    console.log('[db] enabled login for migrated demo account');
  }

  console.log(`[dev] demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}
