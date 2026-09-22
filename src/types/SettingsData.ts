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
}