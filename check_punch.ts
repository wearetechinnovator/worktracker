import dbConnect from './src/lib/dbConnect';
import Attendance from './src/models/Attendance';
import mongoose from 'mongoose';

async function main() {
  await dbConnect();
  const empId = '6a7ee3e89990576e1299b3f7';
  const today = new Date().toISOString().split('T')[0];
  console.log('Today:', today);
  const attendance = await Attendance.findOne({ employeeId: new mongoose.Types.ObjectId(empId), date: today });
  console.log('Attendance:', attendance);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
