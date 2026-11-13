import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Claim only the selected resource for the current user; RLS verifies publication. */
export async function ensureFreebieFileAccess(
  client: Pick<SupabaseClient<Database>, "from">,
  userId: string,
  freebieId: string,
) {
  const { error } = await client.from("freebie_file_access").upsert(
    { user_id: userId, freebie_id: freebieId },
    { onConflict: "user_id,freebie_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Unable to authorize this resource download. Please try again.");
}