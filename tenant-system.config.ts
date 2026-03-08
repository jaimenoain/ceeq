import type { TenantSystemConfig } from './types/tenant-config'

export const tenantConfig = {
  roles: {
    all: ['owner', 'admin', 'editor', 'viewer'],
    owner: 'owner',
    defaultMember: 'viewer',
    admin: ['owner', 'admin'],
  },
  routing: {
    protectedRoutes: [
      '/tasks',
      '/repository',
      '/pipeline',
      '/pipeline/closed',
      '/deals',
      '/settings',
    ],
    onboardingRoute: '/onboarding',
    postOnboardingRoute: '/repository',
  },
  email: {
    blacklistedDomains: [
      'gmail.com',
      'outlook.com',
      'yahoo.com',
      'hotmail.com',
      'icloud.com',
      'protonmail.com',
    ],
  },
} satisfies TenantSystemConfig
