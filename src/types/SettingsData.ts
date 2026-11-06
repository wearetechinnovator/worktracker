export interface SettingsData {
  // Punch In Timing
  punchInStartTime: string;
  punchInEndTime: string;

  // Punch In Requirements
  punchInGeoRequired: boolean;
  punchInIpRequired: boolean;
  punchInBrowserRequired: boolean;
  punchInSystemIdRequired: boolean;

  // Punch Out Timing
  punchOutStartTime: string;
  punchOutEndTime: string;

  // Punch Out Requirements
  punchOutGeoRequired: boolean;
  punchOutIpRequired: boolean;
  punchOutBrowserRequired: boolean;
  punchOutSystemIdRequired: boolean;

  // Task ID
  taskIdPrefix: string;
  nextTaskNumber: number;

  // Weekly Off Days (0=Sunday, 1=Monday, ..., 6=Saturday)
  weeklyOffDays?: number[];

  // Saturday Off Rule ('none' | 'every' | '2nd_4th' | 'alternate')
  saturdayOffRule?: 'none' | 'every' | '2nd_4th' | 'alternate';
}