import React, { createContext, useContext } from 'react'

const AddressSheetContext = createContext(undefined)

export const AddressSheetProvider = ({ children, openAddressSheet }) => {
  return (
    <AddressSheetContext.Provider value={{ openAddressSheet }}>
      {children}
    </AddressSheetContext.Provider>
  )
}

export const useAddressSheet = () => {
  const context = useContext(AddressSheetContext)
  if (!context) {
    throw new Error('useAddressSheet must be used within an AddressSheetProvider')
  }
  return context
}
