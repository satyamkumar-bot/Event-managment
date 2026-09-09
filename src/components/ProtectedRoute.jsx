import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, configured } from '../services/supabase'
export default function ProtectedRoute({ children, roles }) {
  const [state,setState]=useState({loading:true,user:null,profile:null})
  useEffect(()=>{ if(!configured) return setState({loading:false,user:null,profile:null}); supabase.auth.getUser().then(async({data:{user}})=>{ const {data:profile}=user?await supabase.from('profiles').select('*').eq('id',user.id).single():{data:null}; setState({loading:false,user,profile}) }) },[])
  if(state.loading) return <p>Loading...</p>
  if(!state.user) return <Navigate to="/login" replace />
  if(roles && !roles.includes(state.profile?.role)) return <Navigate to="/dashboard" replace />
  return children
}
