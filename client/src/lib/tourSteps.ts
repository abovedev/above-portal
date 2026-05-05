import type { DriveStep } from 'driver.js';

export const tourSteps: Record<string, DriveStep[]> = {
  '/dashboard': [
    {
      element: '[data-tour="add-widget"]',
      popover: {
        title: 'Add a Widget',
        description: 'Click here to browse available widgets — Notice Board, AI Assistant, Calendar, Tasks, and more. Click any widget to add it to your board.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="customize"]',
      popover: {
        title: 'Customise Your Layout',
        description: 'Enter edit mode to drag widgets around, resize them by pulling the bottom-right corner, or remove ones you don\'t need.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="widget-grid"]',
      popover: {
        title: 'Your Personal Board',
        description: 'Everything here is yours to arrange. Your layout is saved automatically and synced across devices.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="notifications"]',
      popover: {
        title: 'Notifications',
        description: 'Stay up to date — new notices, @mentions, and page assignments appear here in real time.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],

  '/pages/company': [
    {
      element: '[data-tour="page-search"]',
      popover: {
        title: 'Search Pages',
        description: 'Type to filter pages by title. Results update as you type.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="page-list"]',
      popover: {
        title: 'Company Pages',
        description: 'These pages are published by your admin for everyone in the company. Click any card to open the full content.',
        side: 'top',
        align: 'center',
      },
    },
  ],

  '/pages/my': [
    {
      element: '[data-tour="page-list"]',
      popover: {
        title: 'Your Assigned Pages',
        description: 'These pages have been assigned to you specifically by an admin. Only you can see them here.',
        side: 'top',
        align: 'center',
      },
    },
  ],

  '/profile': [
    {
      element: '[data-tour="profile-form"]',
      popover: {
        title: 'Update Your Details',
        description: 'Edit your name, department, and position here, then click Save Changes.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="profile-avatar"]',
      popover: {
        title: 'Change Your Photo',
        description: 'Click the avatar to upload a new profile picture. JPG and PNG are supported.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="profile-password"]',
      popover: {
        title: 'Change Password',
        description: 'Enter your current password, then your new one twice. Save to update.',
        side: 'right',
        align: 'start',
      },
    },
  ],

  '/admin/dashboard': [
    {
      element: '[data-tour="admin-stats"]',
      popover: {
        title: 'Live Stats',
        description: 'User counts, page counts, announcement stats, and system health — all updating in real time.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-tour="admin-sidebar"]',
      popover: {
        title: 'Admin Navigation',
        description: 'Access Users, Pages, Notice Board, AI Settings, and general Settings from here. Use the User Portal link at the bottom to preview the portal as a regular user.',
        side: 'right',
        align: 'center',
      },
    },
  ],

  '/admin/users': [
    {
      element: '[data-tour="new-user"]',
      popover: {
        title: 'Invite a User',
        description: 'Create a new portal account. Set their name, email, temporary password, and role — User or Admin.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="user-list"]',
      popover: {
        title: 'Manage Users',
        description: 'Click any row to edit a user\'s details, role, or active status. Deactivated users can\'t log in but their data is preserved.',
        side: 'top',
        align: 'center',
      },
    },
  ],

  '/admin/announcements': [
    {
      element: '[data-tour="new-announcement"]',
      popover: {
        title: 'Create a Notice',
        description: 'Post a company-wide notice. Set the title, body, priority level (Low to Urgent), and optionally pin it to the top.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="announcement-list"]',
      popover: {
        title: 'Manage Notices',
        description: 'Edit or delete existing notices with the icons on each card. Pinned notices always appear at the top of the board.',
        side: 'top',
        align: 'center',
      },
    },
  ],

  '/admin/pages/global': [
    {
      element: '[data-tour="new-page"]',
      popover: {
        title: 'Create a Global Page',
        description: 'Add a new page visible to all users under Company Pages. Toggle Published to make it live.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="page-list"]',
      popover: {
        title: 'Your Global Pages',
        description: 'Click the edit icon on any card to open the editor. Unpublished pages are only visible to admins.',
        side: 'top',
        align: 'center',
      },
    },
  ],

  '/admin/pages/per-user': [
    {
      element: '[data-tour="new-page"]',
      popover: {
        title: 'Create a Per-User Page',
        description: 'Build the content first, then use the Assignments section inside the editor to assign it to specific users.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="page-list"]',
      popover: {
        title: 'Per-User Pages',
        description: 'Each page here can be assigned to one or more users. Open the editor and go to Assignments to add or remove users.',
        side: 'top',
        align: 'center',
      },
    },
  ],

  '/admin/ai-settings': [
    {
      element: '[data-tour="ai-toggle"]',
      popover: {
        title: 'Enable / Disable AI',
        description: 'Switch the AI assistant on or off for all users. When disabled, users see a friendly unavailable message.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '[data-tour="ai-tone"]',
      popover: {
        title: 'Email Tone',
        description: 'Set the default tone AD Brain uses when writing emails. Australian Business Tone is recommended for client-facing work.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '[data-tour="ai-instructions"]',
      popover: {
        title: 'Writing Instructions',
        description: 'Set rules that apply every time AD Brain writes — email length, structure, sign-off style, and broader style notes.',
        side: 'right',
        align: 'center',
      },
    },
  ],

  '/admin/settings': [
    {
      element: '[data-tour="settings-form"]',
      popover: {
        title: 'Portal Settings',
        description: 'Update your company name, upload a logo, and change the accent colour used across the portal. Changes apply immediately for all users.',
        side: 'right',
        align: 'start',
      },
    },
  ],
};

export function getTourStepsForPath(pathname: string): DriveStep[] | null {
  if (tourSteps[pathname]) return tourSteps[pathname];
  const sorted = Object.keys(tourSteps).sort((a, b) => b.length - a.length);
  const match = sorted.find((key) => pathname.startsWith(key));
  return match ? tourSteps[match] : null;
}
