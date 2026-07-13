"use client"

import dynamic from "next/dynamic"

const AuthInitializer = dynamic(() => import("./auth-initializer").then((mod) => ({ default: mod.AuthInitializer })), {
  ssr: false,
})

export function AuthInitializerWrapper() {
  return <AuthInitializer />
}
