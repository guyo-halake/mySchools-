const fs = require('fs');

const file = 'src/lib/api.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const rangesToDelete = [
  [36, 46], // getClasses
  [410, 432], // getNotifications and markNotificationAsRead
  [1363, 1378], // getNotifications
  [1379, 1386], // markNotificationAsRead
  [1588, 1600], // getTeacherStreams
  [1611, 1641], // getStreamPerformanceTrend
  [1642, 1684], // getStreamVsFormComparison
  [1685, 1715], // getStreamSubjectBreakdown
  [1716, 1747], // getStreamStudentRankings
  [1748, 1758], // updateStreamProfile
  [1872, 1890]  // getResults
];

const newLines = [];
for (let i = 0; i < lines.length; i++) {
  const lineNum = i + 1;
  let shouldDelete = false;
  for (const [start, end] of rangesToDelete) {
    if (lineNum >= start && lineNum <= end) {
      shouldDelete = true;
      break;
    }
  }
  if (!shouldDelete) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Duplicates removed.');
