"use client"

import { createContext, useContext } from "react"
import { useDispatch, useSelector } from "react-redux"
import { selectResolvedTheme, setAppearance } from "../../redux/preferencesSlice"

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
})

export const ThemeProvider = ({ children }) => {
  const dispatch = useDispatch()
  const resolvedTheme = useSelector(selectResolvedTheme)

  const setTheme = (next) => {
    if (next === "light" || next === "dark" || next === "system") {
      dispatch(setAppearance({ theme: next }))
    }
  }

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
