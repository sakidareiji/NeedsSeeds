import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, the click-tracking
     * redirect (/go) and internal API routes, which must stay lightweight and
     * don't need a session refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|go/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
