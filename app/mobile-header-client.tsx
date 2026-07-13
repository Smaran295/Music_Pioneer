"use client"

import dynamic from "next/dynamic"

const MobileHeader = dynamic(() => import("@/components/mobile-header"), { ssr: false })

export default function MobileHeaderClient() {
  return <MobileHeader />
}
