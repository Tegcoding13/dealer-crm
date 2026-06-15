import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useOrgId() {
  const [orgId, setOrgId] = useState<string | null>(null)
  useEffect(() => {
    supabase
      .from('org_members')
      .select('organization_id')
      .maybeSingle()
      .then(({ data }) => { if (data) setOrgId(data.organization_id) })
  }, [])
  return orgId
}
