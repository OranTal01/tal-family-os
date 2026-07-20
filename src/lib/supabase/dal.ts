import 'server-only';

import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from './server';

/**
 * Data Access Layer for the current session. Unlike the proxy's `getClaims()`
 * check (a fast, local JWT verification used only to decide redirects),
 * `auth.getUser()` re-verifies the session against Supabase's Auth server — this
 * is the boundary Server Components / Server Actions should trust before touching
 * data. `cache()` dedupes repeated calls within a single render pass.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return data;
});
