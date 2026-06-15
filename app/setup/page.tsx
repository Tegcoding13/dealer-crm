'use client'

import { useEffect } from 'react'

export default function SetupPage() {
  useEffect(() => {
    window.location.href = '/'
  }, [])
  return null
}
