import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"
import { createClient } from "@supabase/supabase-js"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Always use top-level redirects managed by NextAuth
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { id, email, name, image } = user
        // Upsert basic profile
        await supabase.from("profiles").upsert({ id, email, name, avatar_url: image ?? null }, { onConflict: "id" })
      } catch (e) {
        console.error("NextAuth signIn upsert error", e)
      }
      return true
    },
    async session({ session, token }) {
      // Attach user id to session if available
      if (token?.sub) {
        ;(session as any).user.id = token.sub
      }
      return session
    },
  },
}
