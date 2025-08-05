import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';

const ChooseDate = ({ onSelect }) => {
  return (
    <View style={styles.calendarWrapper}>
      <Calendar
        style={styles.calendar}
        onDayPress={(day) => {
          onSelect(day.dateString);
        }}
        markedDates={{
          // 선택된 날짜 표시 (선택 시마다 덮어씀)
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  calendarWrapper: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
  },
});

export default ChooseDate;