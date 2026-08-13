# Punch In/Out System Documentation

## Overview
The punch in/out system allows employees to mark their attendance by punching in at the start of their workday and punching out at the end. Administrators can dynamically configure the allowed time windows for both actions.

## Features

### For Employees
- **Punch In/Out Page** (`/punch`)
  - Large, prominent PUNCH IN and PUNCH OUT buttons
  - Buttons are only enabled during configured time windows
  - Disabled buttons appear blurred for visual feedback
  - Real-time clock display
  - Shows current punch status (check-in and check-out times)
  - Displays allowed time windows

### For Administrators
- **Settings Page** (`/settings`)
  - Configure punch in start and end times
  - Configure punch out start and end times
  - Changes take effect immediately for all employees
  
- **Enhanced Attendance Page** (`/attendance`)
  - View check-in and check-out times for all employees
  - Continue to manage attendance status (Present/Absent/On Leave)

## How It Works

### Time Windows
1. **Punch In Window**: Employees can only punch in between the configured start and end times
2. **Punch Out Window**: Employees can only punch out between the configured start and end times
3. Outside these windows, the respective buttons are disabled and blurred

### Workflow
1. Employee navigates to `/punch` page
2. During punch-in hours, PUNCH IN button is enabled
3. Employee clicks PUNCH IN to record arrival time
4. PUNCH OUT button remains disabled/blurred until:
   - Employee has punched in
   - Current time is within punch-out window
5. Employee clicks PUNCH OUT to record departure time
6. Both buttons are disabled after completion

### Default Settings
- **Punch In**: 09:00 AM - 10:00 AM
- **Punch Out**: 05:00 PM - 07:00 PM

Administrators can modify these times from the Settings page.

## Database Models

### Settings Model
```typescript
{
  punchInStartTime: string;   // "HH:MM" format
  punchInEndTime: string;     // "HH:MM" format
  punchOutStartTime: string;  // "HH:MM" format
  punchOutEndTime: string;    // "HH:MM" format
}
```

### Attendance Model (Updated)
```typescript
{
  employeeId: ObjectId;
  date: string;               // "YYYY-MM-DD"
  status: string;             // "Present" | "Absent" | "On Leave"
  checkIn: string;            // "HH:MM" format
  checkOut: string;           // "HH:MM" format
}
```

## API Endpoints

### GET `/api/punch?employeeId=<id>`
Returns current punch status and permissions for an employee.

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "checkIn": "09:15",
      "checkOut": null,
      "status": "Present"
    },
    "canPunchIn": false,
    "canPunchOut": true,
    "currentTime": "17:30",
    "settings": {
      "punchInWindow": "09:00 - 10:00",
      "punchOutWindow": "17:00 - 19:00"
    }
  }
}
```

### POST `/api/punch`
Records a punch in or punch out action.

**Request:**
```json
{
  "employeeId": "123",
  "action": "punchIn" | "punchOut"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Punched in successfully at 09:15",
  "data": { /* attendance record */ }
}
```

### GET `/api/settings`
Retrieves current punch time settings.

### PUT `/api/settings`
Updates punch time settings (admin only).

**Request:**
```json
{
  "punchInStartTime": "09:00",
  "punchInEndTime": "10:00",
  "punchOutStartTime": "17:00",
  "punchOutEndTime": "19:00"
}
```

## Navigation
- **Employees**: Can access the Punch In/Out page from the sidebar
- **Admins**: Can access both Punch In/Out and Settings pages from the sidebar
- Punch In/Out link is visible to all authenticated users
- Settings link is visible only to administrators

## Visual Design
- Clean, modern interface with large touch-friendly buttons
- Real-time clock display
- Visual feedback for enabled/disabled states
- Blur effect on disabled buttons for clear visual indication
- Color-coded buttons (green for punch in, red for punch out)
- Success/error messages for all actions

## Security & Validation
- Time window validation on both client and server
- Prevents double punch-in or punch-out
- Ensures punch-out only after punch-in
- Admin-only access to settings page
- All times stored in HH:MM format for consistency
