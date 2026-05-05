export interface HelpSection {
  title: string;
  body: string;
}

export interface PageHelp {
  pageTitle: string;
  intro: string;
  sections: HelpSection[];
}

const helpContent: Record<string, PageHelp> = {
  '/dashboard': {
    pageTitle: 'Dashboard',
    intro: 'Your personal hub. Arrange it however works best for you — every widget is moveable and optional.',
    sections: [
      {
        title: 'Add a widget',
        body: 'Click the + Add Widget button in the top bar to browse available widgets. Click any widget to add it to your board instantly.',
      },
      {
        title: 'Move and resize widgets',
        body: 'Click Customise to enter edit mode. Drag widgets to rearrange them. Drag the bottom-right corner of a widget to resize it. Click Done when finished.',
      },
      {
        title: 'Remove a widget',
        body: 'Enter edit mode (Customise), then click the trash icon that appears in the top-right corner of any widget you want to remove.',
      },
      {
        title: 'Notice Board',
        body: 'Click any notice card to open the full post. You can react with an emoji, leave a comment, and @mention a teammate — they\'ll get a notification.',
      },
      {
        title: 'AD Brain (AI assistant)',
        body: 'Add the AD Brain widget to chat with your AI assistant. Ask it to write emails, find documents, check your calendar, or help brainstorm ideas.',
      },
      {
        title: 'Connect Google or Asana',
        body: 'Add the Calendar, Gmail, Google Chat, or Tasks widget, then click Connect inside the widget to link your accounts.',
      },
    ],
  },

  '/pages/company': {
    pageTitle: 'Company Pages',
    intro: 'Company Pages are published by admins and visible to everyone. Use them to find guides, policies, and shared resources.',
    sections: [
      {
        title: 'Browse pages',
        body: 'Scroll the list to see all published company pages. Use the search bar at the top to find a specific page by name.',
      },
      {
        title: 'Open a page',
        body: 'Click any page card to open the full content. Pages can contain text, images, videos, and embedded content.',
      },
      {
        title: 'Can\'t find something?',
        body: 'If a page isn\'t visible, it may not have been published yet. Ask your admin to check or publish the relevant page.',
      },
    ],
  },

  '/pages/my': {
    pageTitle: 'My Pages',
    intro: 'Pages assigned specifically to you by an admin. These might include onboarding docs, personal briefs, or role-specific resources.',
    sections: [
      {
        title: 'Your assigned pages',
        body: 'Only you can see the pages listed here. They\'ve been assigned by an admin for your role or specific needs.',
      },
      {
        title: 'Reading a page',
        body: 'Click any page to open it. Content may include text, images, embedded videos, or downloadable files.',
      },
      {
        title: 'Page not showing?',
        body: 'If you\'re expecting a page that isn\'t here, contact your admin — it may not have been assigned yet.',
      },
    ],
  },

  '/profile': {
    pageTitle: 'Profile',
    intro: 'Manage your personal details, update your photo, and change your password here.',
    sections: [
      {
        title: 'Update your details',
        body: 'Edit your name, department, and position directly on this page, then click Save Changes.',
      },
      {
        title: 'Change your avatar',
        body: 'Click on your profile picture or the upload area to choose a new photo. Supported formats: JPG, PNG.',
      },
      {
        title: 'Change your password',
        body: 'Scroll to the Change Password section. Enter your current password, then your new password twice, and save.',
      },
    ],
  },

  '/admin/dashboard': {
    pageTitle: 'Admin Dashboard',
    intro: 'A high-level overview of portal activity. Use these stats to keep an eye on users, content, and system health.',
    sections: [
      {
        title: 'Stats widgets',
        body: 'The dashboard shows user counts, page counts, announcement stats, and system metrics. These update in real time.',
      },
      {
        title: 'Quick navigation',
        body: 'Use the left sidebar to jump to any admin section: Users, Pages, Announcements, AI Settings, or general Settings.',
      },
      {
        title: 'Switch to User Portal',
        body: 'Click User Portal at the bottom of the sidebar to view the portal as a regular user without logging out.',
      },
    ],
  },

  '/admin/users': {
    pageTitle: 'Users',
    intro: 'Create and manage all portal accounts from here. You control who has access and at what level.',
    sections: [
      {
        title: 'Create a new user',
        body: 'Click New User in the top right. Fill in their name, email, and a temporary password. Set their role to User or Admin, then save.',
      },
      {
        title: 'Edit a user',
        body: 'Click on any user in the list to open their profile. You can update their name, role, department, position, and active status.',
      },
      {
        title: 'Deactivate a user',
        body: 'Open the user\'s profile and toggle Active off. Deactivated users cannot log in but their data is preserved.',
      },
      {
        title: 'User vs Admin role',
        body: 'Users can access their dashboard, assigned pages, and profile. Admins have everything Users have, plus full access to this Admin Panel.',
      },
    ],
  },

  '/admin/announcements': {
    pageTitle: 'Notice Board',
    intro: 'Post company-wide notices to the Notice Board widget on every user\'s dashboard.',
    sections: [
      {
        title: 'Create a notice',
        body: 'Click New Announcement. Add a title, body text, priority level (Low to Urgent), and optionally pin it to the top. Save when done.',
      },
      {
        title: 'Priority levels',
        body: 'Low and Medium notices appear normally. High notices appear with an amber highlight. Urgent notices are highlighted in red — use sparingly.',
      },
      {
        title: 'Pin a notice',
        body: 'Toggle Pin when creating or editing a notice to keep it at the top of the board regardless of when it was posted.',
      },
      {
        title: 'Set an expiry date',
        body: 'Optionally set an expiry date — the notice will automatically stop showing to users after that date.',
      },
      {
        title: 'Edit or delete',
        body: 'Click the edit icon on any notice to update it, or the trash icon to delete it permanently.',
      },
    ],
  },

  '/admin/pages/global': {
    pageTitle: 'Global Pages',
    intro: 'Global pages are visible to all portal users under Company Pages. Use them for shared resources, policies, and company-wide content.',
    sections: [
      {
        title: 'Create a page',
        body: 'Click New Page. Give it a title and optional description, then use the editor to add content sections (text, images, video, embeds).',
      },
      {
        title: 'Publish a page',
        body: 'Pages are drafts by default. Toggle Published on to make a page visible to all users. Toggle it off to unpublish without deleting.',
      },
      {
        title: 'Add content sections',
        body: 'Inside the page editor, click + Add Section to insert text blocks, images, videos, embeds, or dividers. Drag sections to reorder them.',
      },
      {
        title: 'Edit or delete',
        body: 'Click the edit icon on any page card to open the editor. Use the delete option inside the editor to permanently remove a page.',
      },
    ],
  },

  '/admin/pages/per-user': {
    pageTitle: 'Per-User Pages',
    intro: 'Assign pages to specific users. Great for onboarding documents, personal briefs, or role-specific resources.',
    sections: [
      {
        title: 'Create a per-user page',
        body: 'Click New Page to build the content, then use the Assignments section inside the editor to assign it to one or more users.',
      },
      {
        title: 'Assign to a user',
        body: 'Inside the page editor, go to Assignments and search for the user by name. Add them and save. The page will appear in their My Pages tab.',
      },
      {
        title: 'Remove an assignment',
        body: 'Open the page editor, go to Assignments, and remove the user. The page will no longer appear in their portal.',
      },
    ],
  },

  '/admin/ai-settings': {
    pageTitle: 'AI Settings',
    intro: 'Control how AD Brain behaves for all users — tone, writing style, document access, and more. No code changes needed.',
    sections: [
      {
        title: 'Enable / disable the assistant',
        body: 'Toggle Enable AI Assistant at the top of the page. When disabled, users who open AD Brain will see a message letting them know it\'s unavailable.',
      },
      {
        title: 'Email writing tone',
        body: 'Choose the default tone for all AI-written emails. Australian Business Tone is recommended for client-facing work.',
      },
      {
        title: 'Default email instructions',
        body: 'Set rules that apply every time AD Brain writes an email — length, structure, sign-off style, etc.',
      },
      {
        title: 'Writing style notes',
        body: 'Add style rules that apply across all AI writing, not just emails. Lock in Australian English, plain language preferences, or formatting habits here.',
      },
      {
        title: 'Document access',
        body: 'Choose whether AD Brain can reference documents when answering. Start with No document access and expand only if needed.',
      },
      {
        title: 'Extra system instructions',
        body: 'Freeform rules for AD Brain\'s general behaviour — useful for company-specific rules. Never store passwords or API keys here.',
      },
    ],
  },

  '/admin/settings': {
    pageTitle: 'Portal Settings',
    intro: 'Manage company-level branding and portal defaults.',
    sections: [
      {
        title: 'Company name',
        body: 'Update the name shown in the portal header and branding areas.',
      },
      {
        title: 'Logo',
        body: 'Upload your company logo. Recommended: PNG or SVG with a transparent background. It appears in the sidebar.',
      },
      {
        title: 'Accent colour',
        body: 'Change the highlight colour used across buttons, links, and active states. Use a hex code or the colour picker.',
      },
      {
        title: 'Save changes',
        body: 'Click Save after making changes. Updates apply immediately for all users.',
      },
    ],
  },
};

export function getHelpForPath(pathname: string): PageHelp | null {
  // Exact match first
  if (helpContent[pathname]) return helpContent[pathname];

  // Prefix match for nested routes (e.g. /admin/pages/global/new)
  const sorted = Object.keys(helpContent).sort((a, b) => b.length - a.length);
  const match = sorted.find((key) => pathname.startsWith(key));
  return match ? helpContent[match] : null;
}
