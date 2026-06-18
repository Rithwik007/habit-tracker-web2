import Mood from '../server/models/Mood.js';
import Note from '../server/models/Note.js';

console.log('--- Database Index Verification ---');

const moodIndexes = Mood.schema.indexes();
const noteIndexes = Note.schema.indexes();

console.log('Mood indexes registered in schema:');
console.log(JSON.stringify(moodIndexes, null, 2));

console.log('\nNote indexes registered in schema:');
console.log(JSON.stringify(noteIndexes, null, 2));

// Assertions
const moodHasCompound = moodIndexes.some(idx => idx[0] && idx[0].userId === 1 && idx[0].date === 1);
const noteHasCompound = noteIndexes.some(idx => idx[0] && idx[0].userId === 1 && idx[0].date === 1);

if (moodHasCompound && noteHasCompound) {
  console.log('\n🎉 SUCCESS: Both Mood and Note models have the { userId: 1, date: 1 } compound index registered!');
  process.exit(0);
} else {
  console.error('\n🚨 FAILURE: Missing compound indexes on either Mood or Note models.');
  process.exit(1);
}
