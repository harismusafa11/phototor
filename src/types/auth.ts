/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_pro: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AppAdminSettings {
  adsterra_enabled: boolean;
  export_countdown_seconds: number;
  adsterra_300x250_key: string;
  adsterra_728x90_key: string;
}
