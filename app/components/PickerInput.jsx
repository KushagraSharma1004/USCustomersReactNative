import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const PickerInput = ({
  selectedValue,
  onValueChange,
  items, // This is now a prop!
  placeholder = "Select a category",
  zIndex = 1000,
  zIndexInverse = 1000,
  containerStyle,
  dropdownStyle,
  dropDownContainerStyle,
  textStyle,
  listItemLabelStyle,
  arrowIconStyle,
  tickIconStyle,

}) => {
  const [open, setOpen] = useState(false);

  // Define the dynamic text style here, inside the component,
  // so it has access to the 'selectedValue' prop.
  const dynamicTextStyle = {
    fontSize: 16, // Changed to 16 for better visibility
    color: selectedValue === 'Select Category' ? '#ccc' : 'black',
  };

  return (
    <View style={containerStyle !== undefined ? containerStyle : styles.container}>
      <DropDownPicker
        open={open}
        value={selectedValue} // Use the prop for value
        items={items} // Use the prop for items
        setOpen={setOpen}
        setValue={onValueChange} // Use the prop for setValue
        placeholder={placeholder}
        style={dropdownStyle !== undefined ? dropdownStyle : styles.dropdownStyle}
        dropDownContainerStyle={dropDownContainerStyle !== undefined ? dropDownContainerStyle : styles.dropdownContainerStyle}
        textStyle={ textStyle !== undefined ? textStyle : dynamicTextStyle}
        listItemLabelStyle={listItemLabelStyle !== undefined ? listItemLabelStyle : styles.listItemLabelStyle}
        arrowIconStyle={ arrowIconStyle !== undefined ? arrowIconStyle : styles.arrowIconStyle}
        tickIconStyle={ tickIconStyle !== undefined ? tickIconStyle : styles.tickIconStyle}
        zIndex={zIndex}
        zIndexInverse={zIndexInverse}
        listMode="SCROLLVIEW"
        scrollViewProps={{
          nestedScrollEnabled: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 45,
  },
  dropdownStyle: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    minHeight: 45,
    
  },
  dropdownContainerStyle: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 2,
    maxHeight:300,
  },
  // textStyle is now defined dynamically within the component
  listItemLabelStyle: {
    fontSize: 16,
    color: 'black',
  },
  arrowIconStyle: {
      width: 20,
      height: 20,
  },
  tickIconStyle: {
      width: 20,
      height: 20,
  }
});

export default PickerInput;