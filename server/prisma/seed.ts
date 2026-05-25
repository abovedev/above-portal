import { PrismaClient, Role, Priority, WidgetType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.quickLink.deleteMany();
  await prisma.task.deleteMany();
  await prisma.widget.deleteMany();
  await prisma.pageAssignment.deleteMany();
  await prisma.pageSection.deleteMany();
  await prisma.page.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companySettings.deleteMany();

  // Company settings
  await prisma.companySettings.create({
    data: {
      companyName: 'Above Digital',
      theme: 'dark',
      accentColor: '#D7DCE2',
    },
  });

  const hashedAdminPass = await bcrypt.hash('admin123', 12);
  const hashedUserPass = await bcrypt.hash('user123', 12);

  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      password: hashedAdminPass,
      firstName: 'Alex',
      lastName: 'Admin',
      role: Role.ADMIN,
      department: 'Leadership',
      position: 'Portal Administrator',
    },
  });

  // Regular users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah.chen@company.com',
        password: hashedUserPass,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: Role.USER,
        department: 'Engineering',
        position: 'Senior Software Engineer',
      },
    }),
    prisma.user.create({
      data: {
        email: 'marcus.johnson@company.com',
        password: hashedUserPass,
        firstName: 'Marcus',
        lastName: 'Johnson',
        role: Role.USER,
        department: 'Design',
        position: 'Product Designer',
      },
    }),
    prisma.user.create({
      data: {
        email: 'priya.patel@company.com',
        password: hashedUserPass,
        firstName: 'Priya',
        lastName: 'Patel',
        role: Role.USER,
        department: 'Marketing',
        position: 'Marketing Manager',
      },
    }),
    prisma.user.create({
      data: {
        email: 'tom.wright@company.com',
        password: hashedUserPass,
        firstName: 'Tom',
        lastName: 'Wright',
        role: Role.USER,
        department: 'Sales',
        position: 'Sales Lead',
      },
    }),
    prisma.user.create({
      data: {
        email: 'lisa.park@company.com',
        password: hashedUserPass,
        firstName: 'Lisa',
        lastName: 'Park',
        role: Role.USER,
        department: 'Operations',
        position: 'Operations Coordinator',
      },
    }),
  ]);

  // Announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: '🚨 System Maintenance This Weekend',
        body: 'We will be performing critical infrastructure upgrades this Saturday from 11 PM to 3 AM Sunday. All services will be unavailable during this window. Please save your work beforehand.',
        priority: Priority.URGENT,
        isPinned: true,
        createdById: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Q4 All-Hands Meeting — Mark Your Calendars',
        body: 'Join us for our quarterly all-hands on November 15th at 2 PM EST. We\'ll be reviewing Q3 results, sharing Q4 goals, and celebrating team wins. Zoom link in your calendar invite.',
        priority: Priority.HIGH,
        isPinned: true,
        createdById: admin.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'New Employee Handbook Available',
        body: 'The updated 2024 Employee Handbook is now available in the Company Pages section. It includes revised PTO policies, updated benefits information, and new remote work guidelines.',
        priority: Priority.LOW,
        isPinned: false,
        createdById: admin.id,
      },
    ],
  });

  // Global pages
  const onboardingPage = await prisma.page.create({
    data: {
      title: 'Getting Started at Above Digital',
      slug: 'getting-started',
      description: 'Everything you need to know for your first week.',
      icon: '🚀',
      type: 'GLOBAL',
      isPublished: true,
      createdById: admin.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Welcome to Above Digital!' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: "We're thrilled to have you on board. This guide will help you get up to speed with everything you need in your first week.",
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Your First Day Checklist' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Set up your company email and accounts' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Complete your profile in this portal' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Join the company Slack workspace' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Schedule 1:1s with your team members' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Key Tools & Resources' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'We use a suite of tools to stay productive and connected across our distributed team.',
              },
            ],
          },
        ],
      },
    },
  });

  const benefitsPage = await prisma.page.create({
    data: {
      title: 'Employee Benefits & Perks',
      slug: 'employee-benefits',
      description: 'Your complete guide to compensation, benefits, and perks.',
      icon: '💎',
      type: 'GLOBAL',
      isPublished: true,
      createdById: admin.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Benefits & Perks' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Above Digital invests heavily in our people. Here\'s a full overview of your benefits package.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '🏥 Health & Wellness' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Comprehensive medical, dental, and vision coverage (100% premium covered for employee)' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '$500/year wellness stipend for gym, fitness apps, or mental health services' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Mental health days — 5 per year, no questions asked' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '🏖️ Time Off' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'We offer unlimited PTO with a minimum 15-day encouragement. We mean it — leadership tracks usage to ensure everyone actually disconnects.',
              },
            ],
          },
        ],
      },
    },
  });

  await prisma.page.create({
    data: {
      title: 'Engineering Handbook',
      slug: 'engineering-handbook',
      description: 'Standards, processes, and best practices for the engineering team.',
      icon: '⚙️',
      type: 'GLOBAL',
      isPublished: true,
      createdById: admin.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Engineering Handbook' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This handbook covers our engineering culture, processes, and technical standards.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Code Review Standards' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'All code must be reviewed by at least one other engineer before merging. PRs should be kept small and focused — ideally under 400 lines of diff.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Deployment Process' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'We deploy continuously to staging and weekly to production every Thursday at 2 PM UTC. Emergency hotfixes can be deployed at any time with approval from the on-call lead.',
              },
            ],
          },
        ],
      },
    },
  });

  // Personal pages
  const personalPage1 = await prisma.page.create({
    data: {
      title: 'Engineering Onboarding Guide — Sarah',
      slug: 'engineering-onboarding-sarah',
      description: 'Custom onboarding checklist for engineering new hires.',
      icon: '📋',
      type: 'PERSONAL',
      isPublished: true,
      createdById: admin.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Your Engineering Onboarding' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: "Hi Sarah! This page is your personalized engineering onboarding guide. Complete these steps in your first two weeks.",
              },
            ],
          },
        ],
      },
    },
  });

  const personalPage2 = await prisma.page.create({
    data: {
      title: 'Design System Guide — Marcus',
      slug: 'design-system-marcus',
      description: 'Design principles and component library access.',
      icon: '🎨',
      type: 'PERSONAL',
      isPublished: true,
      createdById: admin.id,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Design System at Above Digital' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: "Welcome Marcus! Here's your guide to our design system, Figma organization, and component libraries.",
              },
            ],
          },
        ],
      },
    },
  });

  // Page assignments
  await prisma.pageAssignment.create({
    data: {
      pageId: personalPage1.id,
      userId: users[0].id,
      assignedById: admin.id,
    },
  });

  await prisma.pageAssignment.create({
    data: {
      pageId: personalPage2.id,
      userId: users[1].id,
      assignedById: admin.id,
    },
  });

  // Default widgets for all users
  const defaultWidgets = (userId: string) => [
    {
      userId,
      type: WidgetType.CLOCK,
      title: 'Clock',
      settings: { timezone: 'Australia/Sydney', format: '12h' },
      positionX: 0,
      positionY: 0,
      width: 3,
      height: 2,
      order: 0,
    },
    {
      userId,
      type: WidgetType.ANNOUNCEMENTS,
      title: 'Announcements',
      settings: { maxItems: 5 },
      positionX: 3,
      positionY: 0,
      width: 6,
      height: 2,
      order: 1,
    },
    {
      userId,
      type: WidgetType.STATS,
      title: 'My Stats',
      settings: {},
      positionX: 9,
      positionY: 0,
      width: 3,
      height: 2,
      order: 2,
    },
    {
      userId,
      type: WidgetType.TASKS,
      title: 'My Tasks',
      settings: { showCompleted: false },
      positionX: 0,
      positionY: 2,
      width: 4,
      height: 3,
      order: 3,
    },
    {
      userId,
      type: WidgetType.QUICK_LINKS,
      title: 'Quick Links',
      settings: { columns: 3 },
      positionX: 4,
      positionY: 2,
      width: 4,
      height: 3,
      order: 4,
    },
    {
      userId,
      type: WidgetType.NOTES,
      title: 'Notes',
      settings: { color: '#1e1b4b' },
      positionX: 8,
      positionY: 2,
      width: 4,
      height: 3,
      order: 5,
    },
  ];

  for (const user of [admin, ...users]) {
    await prisma.widget.createMany({ data: defaultWidgets(user.id) });
  }

  // Default tasks for users
  await prisma.task.createMany({
    data: [
      { userId: users[0].id, title: 'Review PR #247 — auth refactor', priority: Priority.HIGH },
      { userId: users[0].id, title: 'Update unit tests for UserService', priority: Priority.MEDIUM },
      { userId: users[0].id, title: 'Set up local dev environment', isCompleted: true, priority: Priority.LOW },
      { userId: users[1].id, title: 'Create Q4 landing page mockups', priority: Priority.HIGH },
      { userId: users[1].id, title: 'Update icon set in Figma', priority: Priority.LOW },
    ],
  });

  // Default quick links
  await prisma.quickLink.createMany({
    data: [
      { userId: users[0].id, label: 'GitHub', url: 'https://github.com', icon: '🐙', order: 0 },
      { userId: users[0].id, label: 'Linear', url: 'https://linear.app', icon: '📐', order: 1 },
      { userId: users[0].id, label: 'Figma', url: 'https://figma.com', icon: '🎨', order: 2 },
      { userId: users[1].id, label: 'Figma', url: 'https://figma.com', icon: '🎨', order: 0 },
      { userId: users[1].id, label: 'Dribbble', url: 'https://dribbble.com', icon: '🏀', order: 1 },
    ],
  });

  // Notifications for users
  await prisma.notification.createMany({
    data: [
      {
        userId: users[0].id,
        title: 'Page Assigned',
        message: 'Alex Admin assigned you "Engineering Onboarding Guide"',
        type: 'PAGE_ASSIGNED',
        link: `/pages/${personalPage1.slug}`,
      },
      {
        userId: users[0].id,
        title: 'New Announcement',
        message: 'System Maintenance This Weekend — check announcements for details',
        type: 'ANNOUNCEMENT',
        isRead: true,
      },
      {
        userId: users[1].id,
        title: 'Page Assigned',
        message: 'Alex Admin assigned you "Design System Guide"',
        type: 'PAGE_ASSIGNED',
        link: `/pages/${personalPage2.slug}`,
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Admin: admin@company.com / admin123');
  console.log('User:  sarah.chen@company.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
