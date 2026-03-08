import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { IncomingMessage, ServerResponse } from "http";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * App Router: call with no args. Uses cookies() from next/headers.
 * Pages Router: pass req and res from getServerSideProps or API route context.
 */
export function createClient(): Promise<SupabaseClient>;
export function createClient(
  req: IncomingMessage,
  res: ServerResponse
): SupabaseClient;
export function createClient(
  req?: IncomingMessage,
  res?: ServerResponse
): SupabaseClient | Promise<SupabaseClient> {
  if (req != null && res != null) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const header = req.headers.cookie ?? "";
          return header
            .split(";")
            .map((part) => {
              const [name, ...v] = part.trim().split("=");
              return { name: name ?? "", value: v.join("=").trim() };
            })
            .filter((c) => c.name);
        },
        setAll(cookiesToSet) {
          const values = cookiesToSet.map(({ name, value, options }) => {
            const path = options?.path ?? "/";
            const maxAge = options?.maxAge ?? 31536000;
            const sameSite = options?.sameSite ?? "lax";
            const secure = options?.secure ? "; Secure" : "";
            return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}${secure}`;
          });
          res.setHeader("Set-Cookie", values);
        },
      },
    });
  }

  return (async () => {
    const cookieStore = await cookies();
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when middleware refreshes session
          }
        },
      },
    });
  })();
}
