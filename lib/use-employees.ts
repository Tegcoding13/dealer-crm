import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useEmployees() {
  const [employees, setEmployees] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('org_members')
      .select('full_name')
      .not('full_name', 'is', null)
      .then(({ data }) => {
        const names = (data || []).map(r => r.full_name).filter(Boolean) as string[]
        setEmployees(names)
      })
  }, [])

  return employees
}
