'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const GREETINGS = [
  { text: "Welcome back!", emoji: "👋" },
  { text: "Good to see you again.", emoji: "😊" },
  { text: "Let's close some deals.", emoji: "🔥" },
  { text: "Ready to crush it today?", emoji: "💪" },
  { text: "Your pipeline is waiting.", emoji: "🚀" },
  { text: "Time to make moves.", emoji: "⚡" },
  { text: "Good to have you back.", emoji: "🙌" },
  { text: "Let's get to work.", emoji: "💼" },
]

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [greeting, setGreeting] = useState(GREETINGS[0])

  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-gray-100">

        {/* Logo */}
        <div className="flex justify-center mb-5">
          <Image src="/logo.png" alt="IronFlow CRM" width={200} height={70} className="object-contain" priority />
        </div>

        {/* Greeting */}
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-gray-900">{greeting.emoji} {greeting.text}</p>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account below</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-center text-red-500 bg-red-50 rounded-lg py-2 px-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white rounded-xl py-3 text-sm font-bold active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)', boxShadow: '0 4px 14px rgba(54,124,43,0.35)' }}
          >
            {loading ? 'Signing in…' : '→ Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center">
          <Link href="/demo" className="text-sm text-[#367C2B] font-medium hover:underline">
            View live demo →
          </Link>
        </div>
      </div>
    </div>
  )
}
