"use client"

import type React from "react"
import { useAuth } from "@/contexts/AuthContext"

const AppSidebar: React.FC = () => {
  const { user, signOut } = useAuth()

  const handleLogout = () => {
    signOut()
  }

  return (
    <div>
      <h2>Sidebar</h2>
      {user && (
        <div>
          <p>Name: {user?.user_metadata?.full_name || user?.user_metadata?.name}</p>
          <p>Email: {user?.email}</p>
          <img src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture} alt="User Avatar" />
        </div>
      )}
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}

export default AppSidebar
