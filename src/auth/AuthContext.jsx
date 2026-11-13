import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  registerKaryawan,
  updateProfile as updateProfileRequest,
} from '../api/auth.js'
import { AuthContext } from './authContextValue.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const loadUser = useCallback(async () => {
    try {
      setUser(await getCurrentUser())
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error) => {
        if (active) setAuthError(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    setAuthError('')
    await loadUser()
  }, [loadUser])

  const signIn = useCallback(async (credentials) => {
    const authenticatedUser = await loginRequest(credentials)
    setUser(authenticatedUser)
    setAuthError('')
    return authenticatedUser
  }, [])

  const signUp = useCallback(async (data) => {
    const registeredUser = await registerKaryawan(data)
    setUser(registeredUser)
    setAuthError('')
    return registeredUser
  }, [])

  const signOut = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const updateUserProfile = useCallback(async (payload) => {
    const result = await updateProfileRequest(payload)
    if (result?.user) {
      setUser(result.user)
    }
    return result
  }, [])

  const changeUserPassword = useCallback(async (payload) => {
    return changePasswordRequest(payload)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      refreshUser,
      signIn,
      signUp,
      signOut,
      updateUserProfile,
      changeUserPassword,
    }),
    [user, loading, authError, refreshUser, signIn, signUp, signOut, updateUserProfile, changeUserPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
