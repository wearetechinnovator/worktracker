# Task Management & Time Tracking System

## Overview
Complete task management system যেখানে admins tasks create করতে পারেন এবং employees সেগুলো complete করে time track করতে পারেন।

---

## Features

### 1. **Admin Features**

#### Task Creation (`/tasks` page)
- ✅ Create tasks with title, description, priority (Low/Medium/High/Urgent)
- ✅ Assign tasks to specific employees (multiple employees supported)
- ✅ Link tasks to projects or departments
- ✅ Set due dates and tags
- ✅ Edit and delete tasks
- ✅ Filter tasks by status and priority
- ✅ Visual priority indicators (color-coded)

#### Task History (`/task-history` page)
- ✅ View all employee work sessions
- ✅ Filter by date, employee, and status
- ✅ See total sessions, completed count, and total hours
- ✅ View detailed notes and links from each work session
- ✅ Export-ready data display

#### Settings (`/settings` page)
- ✅ Configure punch in/out time windows
- ✅ Real-time updates for all employees

---

### 2. **Employee Features**

#### My Tasks (Dashboard)
- ✅ View all assigned tasks
- ✅ See task details (title, description, priority, due date)
- ✅ Project/Department tags
- ✅ Visual priority indicators

#### Time Tracking
- ✅ **Start Work**: Begin tracking time on a task
- ✅ **Live Timer**: Real-time timer with flip-style digits (HH:MM:SS)
- ✅ **End Work**: Stop tracking with notes/links dialog
- ✅ **Work Notes**: Add detailed notes about what was accomplished
- ✅ **Related Links**: Add GitHub PRs, Jira tickets, design files, etc.

#### Completed Tasks
- ✅ Tasks completed today show "✓ Done Today" badge
- ✅ Slightly faded to indicate completion
- ✅ Congratulatory message displayed

---

## Punch In/Out Integration

### Employee Workflow
1. **Login** → Redirected to `/punch` page (if not punched in)
2. **Punch In** → Unlock all features
3. **View Tasks** → See assigned tasks on dashboard
4. **Start Work** → Click "Start Work" button on a task
5. **Timer Runs** → Live countdown shows elapsed time
6. **End Work** → Click "End Work" button
7. **Add Notes** → Dialog opens to add work notes and links
8. **Submit** → Work session saved with all details
9. **Punch Out** → End of day punch out

### Admin Workflow
1. **Create Tasks** → Go to `/tasks` and create new tasks
2. **Assign Employees** → Select one or more employees
3. **Set Details** → Priority, due date, project/department
4. **Monitor Progress** → View `/task-history` to see work sessions
5. **Review Notes** → Click "View" button to see employee notes and links

---

## Database Schema

### Task Model
```typescript
{
  title: string;
  description?: string;
  projectId?: ObjectId;
  department?: string;
  assignedTo: ObjectId[];  // Array of employee IDs
  createdBy: ObjectId;     // Admin who created it
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  dueDate?: string;        // YYYY-MM-DD
  tags?: string[];
}
```

### TaskWork Model
```typescript
{
  taskId: ObjectId;
  employeeId: ObjectId;
  date: string;            // YYYY-MM-DD
  startTime: string;       // HH:MM:SS
  endTime?: string;        // HH:MM:SS
  totalMinutes?: number;   // Calculated duration
  status: 'In Progress' | 'Completed';
  notes?: string;          // Work notes + links
}
```

---

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks (or filtered by employee)
- `POST /api/tasks` - Create new task (admin only)
- `GET /api/tasks/[id]` - Get single task
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Task Work
- `GET /api/task-work` - Get work sessions (filter by employee, date, task)
- `POST /api/task-work` - Start work on a task
- `PUT /api/task-work/[id]` - End work (with notes)
- `DELETE /api/task-work/[id]` - Delete work session

---

## User Interface

### Timer Design
- **Simple Flip Digits**: Dark boxes (#2c3e50) with white numbers
- **Real-time Update**: Updates every second
- **Format**: HH:MM:SS
- **Responsive**: Works on all screen sizes

### Task Cards
- **Priority Bar**: Left border shows priority color
  - 🔴 Urgent: #dc2626
  - 🟠 High: #ea580c
  - 🟡 Medium: #f59e0b
  - 🟢 Low: #10b981

- **Status Badges**: Color-coded status indicators
- **Project Tags**: Show associated project/department
- **Due Date**: Calendar icon with date

### Dialog Boxes
- **End Work Dialog**:
  - Work Notes textarea (optional)
  - Related Links textarea (optional)
  - Cancel and End Work buttons
  - Loading state during submission

- **View Notes Dialog** (Admin):
  - Session information (date, duration, times)
  - Full notes and links display
  - Clean, readable format

---

## Validation Rules

### Task Creation
- Title is required
- Must have either projectId OR department
- Only admins can create tasks
- Assigned employees must exist

### Work Sessions
- Employee must be assigned to the task
- Can't start multiple sessions for same task on same day
- Must punch in before starting work
- Can only end work during configured time window

---

## Time Tracking Logic

### Start Work
1. Check if employee is punched in ✓
2. Check if task is assigned to employee ✓
3. Check if there's already an active session ✗
4. Create TaskWork record with startTime
5. Show live timer

### End Work
1. Open dialog for notes/links
2. Calculate total minutes (endTime - startTime)
3. Save notes and duration
4. Mark session as Completed
5. Show success message
6. Reload task list (completed tasks get "Done Today" badge)

---

## Access Control

### Pages
- `/tasks` - Admin only
- `/task-history` - Admin only  
- `/settings` - Admin only
- Dashboard with "My Tasks" - All employees (after punch in)
- `/punch` - All users (always accessible)

### Sidebar Links
- **Tasks** - Admin only
- **Task History** - Admin only
- **Settings** - Admin only
- All other links require punch in for employees

---

## Best Practices

### For Admins
1. Create clear, specific task titles
2. Add detailed descriptions
3. Set realistic due dates
4. Assign appropriate priority levels
5. Review work notes regularly in Task History

### For Employees
1. Punch in at start of day
2. Start work timer when beginning a task
3. Add detailed notes when ending work:
   - What was accomplished
   - Any blockers or challenges
   - Links to PRs, tickets, designs
4. Punch out at end of day

---

## Reporting & Analytics

### Available Metrics (Task History Page)
- Total work sessions
- Completed vs In Progress sessions
- Total time tracked (hours and minutes)
- Per-employee breakdown
- Date-wise filtering
- Work notes for quality review

---

## Future Enhancements (Optional)

- [ ] Task comments/discussions
- [ ] File attachments to tasks
- [ ] Task dependencies
- [ ] Sprint/milestone management
- [ ] Email notifications for task assignments
- [ ] Daily/weekly summary reports
- [ ] Task completion percentage
- [ ] Employee productivity dashboards
- [ ] Export to CSV/Excel
- [ ] Calendar view of tasks

---

## Technical Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Styling**: Custom CSS with CSS variables
- **Icons**: Lucide React
- **Authentication**: LocalStorage-based session management

---

## Installation & Setup

1. Make sure MongoDB is running
2. Environment variables set in `.env.local`
3. Run `npm install`
4. Run `npm run dev`
5. Create admin user from `/employees` page
6. Configure punch timings from `/settings` page
7. Create tasks from `/tasks` page
8. Employees can start working!

---

## Support & Maintenance

### Common Issues
1. **"Work session not found"**: Fixed - params is now Promise in Next.js 15
2. **Tasks still showing after completion**: Fixed - "Done Today" badge shows completed tasks
3. **Timer not updating**: Make sure component is mounted and state updates every second

### Database Cleanup
- Old TaskWork records can be archived after 90 days
- Completed tasks can be moved to archive status
- Notes can be exported for long-term storage

---

**System Status**: ✅ Fully Functional  
**Last Updated**: 2026-08-13  
**Version**: 1.0.0
