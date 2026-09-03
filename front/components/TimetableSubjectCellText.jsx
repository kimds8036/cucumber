import React from 'react';
import { Text } from 'react-native';
import {
  formatTimetableSubjectLabel,
  timetableSubjectCellTextProps,
} from '../utils/formatTimetableSubjectLabel';

export default function TimetableSubjectCellText({
  content,
  style,
  filledStyle,
  pointerEvents,
}) {
  const filled = Boolean(content);

  return (
    <Text
      style={[style, filled ? filledStyle : null]}
      pointerEvents={pointerEvents}
      {...timetableSubjectCellTextProps}
    >
      {filled ? formatTimetableSubjectLabel(content) : ''}
    </Text>
  );
}
