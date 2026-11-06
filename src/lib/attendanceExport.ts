'use client';

export interface ExportAttendanceItem {
  date: string;
  day: string;
  status: string;
  weekOffLabel?: string | null;
  punchIn: string | null;
  punchOut: string | null;
  formattedDuration: string;
  durationMinutes?: number;
  punchInIp?: string | null;
  punchOutIp?: string | null;
}

export interface ExportEmployeeData {
  _id: string;
  emp_no?: string;
  qd_id?: string | null;
  full_name: string;
  email: string;
  phone_number?: string | null;
  group?: string | null;
  designation?: string;
  role?: string;
  workMode?: string;
  project?: string;
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    weekendDays: number;
    formattedTotalHours: string;
    formattedAverageHours: string;
  };
  records: ExportAttendanceItem[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Format date to MM/DD/YYYY to match spreadsheet
function formatDateMMDDYYYY(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

// Check holidays
function getHolidayName(dateStr: string): string | null {
  const [, m, d] = dateStr.split('-');
  if (m === '10' && d === '02') return 'Gandhi Jayanti';
  if (m === '01' && d === '26') return 'Republic Day';
  if (m === '08' && d === '15') return 'Independence Day';
  if (m === '05' && d === '01') return 'May Day';
  if (m === '12' && d === '25') return 'Christmas';
  return null;
}

// Check if date is weekly off according to configured weekly off days and Saturday rules
export function isWeeklyOffDate(
  dateStr: string,
  weeklyOffDays: number[] = [0],
  saturdayOffRule: 'none' | 'every' | '2nd_4th' | 'alternate' = 'none'
): { isOff: boolean; label: string } {
  const dObj = new Date(`${dateStr}T00:00:00Z`);
  const dayIdx = dObj.getUTCDay();
  const dayOfMonth = dObj.getUTCDate();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (dayIdx === 6) {
    const satIndex = Math.ceil(dayOfMonth / 7);

    if (saturdayOffRule === 'every') {
      return { isOff: true, label: 'Saturday' };
    }
    if (saturdayOffRule === '2nd_4th') {
      if (satIndex === 2) return { isOff: true, label: '2nd Sat' };
      if (satIndex === 4) return { isOff: true, label: '4th Sat' };
      return { isOff: false, label: '' };
    }
    if (saturdayOffRule === 'alternate') {
      if (satIndex === 1) return { isOff: true, label: '1st Sat' };
      if (satIndex === 3) return { isOff: true, label: '3rd Sat' };
      if (satIndex === 5) return { isOff: true, label: '5th Sat' };
      return { isOff: false, label: '' };
    }

    if (weeklyOffDays.includes(6)) {
      return { isOff: true, label: 'Saturday' };
    }

    return { isOff: false, label: '' };
  }

  if (weeklyOffDays.includes(dayIdx)) {
    return { isOff: true, label: dayNames[dayIdx] };
  }

  return { isOff: false, label: '' };
}

// Determine cell value in attendance matrix
export function getMatrixCellValue(
  record?: ExportAttendanceItem,
  dateStr?: string,
  weeklyOffDays: number[] = [0],
  saturdayOffRule: 'none' | 'every' | '2nd_4th' | 'alternate' = 'none'
): {
  val: string;
  isHoliday?: boolean;
  isSunday?: boolean;
  isSat?: boolean;
  isHalf?: boolean;
  isAbsent?: boolean;
  isPresent?: boolean;
} {
  if (!dateStr) return { val: '' };

  const holiday = getHolidayName(dateStr);
  if (holiday) return { val: holiday, isHoliday: true };

  const weekOff = isWeeklyOffDate(dateStr, weeklyOffDays, saturdayOffRule);

  if (record && record.status === 'Present') {
    if (record.durationMinutes && record.durationMinutes > 0 && record.durationMinutes < 300) {
      return { val: '1/2', isHalf: true };
    }
    return { val: 'P', isPresent: true };
  }

  if (weekOff.isOff || record?.status === 'Weekend') {
    const dObj = new Date(`${dateStr}T00:00:00Z`);
    const dayIdx = dObj.getUTCDay();
    return {
      val: weekOff.label || (dayIdx === 0 ? 'Sunday' : 'Saturday'),
      isSunday: dayIdx === 0,
      isSat: dayIdx === 6,
    };
  }

  if (record && record.status === 'Absent') {
    return { val: 'A', isAbsent: true };
  }

  return { val: record?.status === 'Upcoming' ? '--' : 'A', isAbsent: true };
}

/**
 * Download individual or team attendance as CSV.
 * For team monthly/yearly, produces the exact matrix format from the image:
 * EMP NO., Name of Employee, 10/01/2026, 10/02/2026, ...
 */
export function exportAttendanceToCSV({
  filename,
  startDate,
  endDate,
  employees,
  weeklyOffDays = [0],
  saturdayOffRule = 'none',
}: {
  filename?: string;
  startDate: string;
  endDate: string;
  employees: ExportEmployeeData[];
  weeklyOffDays?: number[];
  saturdayOffRule?: 'none' | 'every' | '2nd_4th' | 'alternate';
}) {
  const isSingle = employees.length === 1;

  if (isSingle) {
    const emp = employees[0];
    const outFilename = filename || `Attendance_${emp.full_name.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`;
    const rows: string[] = [];

    rows.push(`"Attendance Report - ${emp.full_name}"`);
    rows.push(`"Email:","${emp.email}"`);
    rows.push(`"Designation:","${emp.designation || 'Employee'}"`);
    rows.push(`"Date Range:","${startDate} to ${endDate}"`);
    rows.push(`"Present Days:","${emp.summary.presentDays}"`);
    rows.push(`"Absent Days:","${emp.summary.absentDays}"`);
    rows.push(`"Total Working Hours:","${emp.summary.formattedTotalHours}"`);
    rows.push('');
    rows.push('"Date","Day","Status","Punch In","Punch Out","Working Hours","IP Address"');

    for (const rec of emp.records) {
      rows.push(
        [
          `"${rec.date}"`,
          `"${rec.day}"`,
          `"${rec.status}"`,
          `"${rec.punchIn || '--'}"`,
          `"${rec.punchOut || '--'}"`,
          `"${rec.formattedDuration}"`,
          `"${rec.punchInIp || '--'}"`,
        ].join(',')
      );
    }

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, outFilename);
    return;
  }

  // TEAM ATTENDANCE MATRIX CSV (Matches user's spreadsheet)
  const outFilename = filename || `Team_Attendance_Matrix_${startDate}_to_${endDate}.csv`;
  const allDates: string[] = [];
  if (employees.length > 0 && employees[0].records) {
    for (const rec of employees[0].records) {
      allDates.push(rec.date);
    }
  }

  const rows: string[] = [];

  // Matrix Header
  const headerCols = ['EMP NO.', 'Name of Employee', ...allDates.map(formatDateMMDDYYYY)];
  rows.push(headerCols.map((col) => `"${col}"`).join(','));

  // Rows
  employees.forEach((emp, empIdx) => {
    const empNo = emp.emp_no || emp.qd_id || `TIS${String(empIdx + 1).padStart(3, '0')}`;
    const recMap = new Map<string, ExportAttendanceItem>();
    emp.records.forEach((r) => recMap.set(r.date, r));

    const dateValues = allDates.map((dStr) => {
      const cell = getMatrixCellValue(recMap.get(dStr), dStr, weeklyOffDays, saturdayOffRule);
      return `"${cell.val}"`;
    });

    const empRow = [
      `"${empNo}"`,
      `"${emp.full_name}"`,
      ...dateValues,
    ];

    rows.push(empRow.join(','));
  });

  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, outFilename);
}

/**
 * Helper to group dates into months for multi-tab yearly workbook
 */
function groupEmployeesByMonth(employees: ExportEmployeeData[]): Map<string, { monthName: string; dates: string[] }> {
  const monthMap = new Map<string, { monthName: string; dates: string[] }>();
  if (employees.length === 0 || !employees[0].records) return monthMap;

  const monthNames = [
    'Jan', 'Feb', 'March', 'April', 'May', 'June',
    'July', 'AUG', 'Sept', 'Oct', 'Nov', 'Dec'
  ];

  for (const rec of employees[0].records) {
    const [y, m] = rec.date.split('-');
    const mKey = `${y}-${m}`;
    const mIdx = parseInt(m, 10) - 1;
    const tabName = `${monthNames[mIdx]} ${y}`;

    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, { monthName: tabName, dates: [] });
    }
    monthMap.get(mKey)!.dates.push(rec.date);
  }

  return monthMap;
}

/**
 * Download team attendance in exact spreadsheet format matching user's image.
 * Uses Microsoft Excel XML format with styles, yellow header, maroon header,
 * borders, colors, and multi-sheet tabs (e.g. Oct 2026, Nov 2026, etc.).
 */
export function exportAttendanceToExcel({
  filename,
  startDate,
  endDate,
  employees,
  weeklyOffDays = [0],
  saturdayOffRule = 'none',
}: {
  filename?: string;
  startDate: string;
  endDate: string;
  employees: ExportEmployeeData[];
  weeklyOffDays?: number[];
  saturdayOffRule?: 'none' | 'every' | '2nd_4th' | 'alternate';
}) {
  const isSingle = employees.length === 1;

  if (isSingle) {
    // Individual Employee Excel
    const emp = employees[0];
    const outFilename = filename || `Attendance_${emp.full_name.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xls`;

    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellPresent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
   </Borders>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#15803D"/>
  </Style>
  <Style ss:ID="CellAbsent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
   </Borders>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Font ss:Bold="1" ss:Color="#B91C1C"/>
  </Style>
  <Style ss:ID="CellNormal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4D4D4"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Attendance">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="70"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Day</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Punch In</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Punch Out</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Working Hours</Data></Cell>
   </Row>`;

    for (const rec of emp.records) {
      const styleId = rec.status === 'Present' ? 'CellPresent' : rec.status === 'Absent' ? 'CellAbsent' : 'CellNormal';
      xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${rec.date}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${rec.day}</Data></Cell>
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${rec.status}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${rec.punchIn || '--'}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${rec.punchOut || '--'}</Data></Cell>
    <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${rec.formattedDuration}</Data></Cell>
   </Row>`;
    }

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    triggerDownload(blob, outFilename);
    return;
  }

  // TEAM ATTENDANCE MATRIX WORKBOOK (Matches user's spreadsheet exactly)
  const outFilename = filename || `Team_Attendance_${startDate}_to_${endDate}.xls`;
  const monthGroups = groupEmployeesByMonth(employees);

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <!-- EMP NO & Date Header: Yellow #FFFF00, bold, border -->
  <Style ss:ID="HeaderYellow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Bold="1" ss:Color="#000000" ss:Size="10"/>
   <Interior ss:Color="#FFFF00" ss:Pattern="Solid"/>
  </Style>
  <!-- Name of Employee Header: Maroon #800000, white text, bold -->
  <Style ss:ID="HeaderMaroon">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
   <Interior ss:Color="#800000" ss:Pattern="Solid"/>
  </Style>
  <!-- Emp No Cell -->
  <Style ss:ID="CellEmpNo">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Size="10"/>
  </Style>
  <!-- Name Cell: Left aligned -->
  <Style ss:ID="CellName">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Size="10"/>
  </Style>
  <!-- Attendance Present 'P' -->
  <Style ss:ID="CellP">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Size="10"/>
  </Style>
  <!-- Half Day '1/2' or Absent 'A': Peach #FCE5CD -->
  <Style ss:ID="CellHighlight">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Interior ss:Color="#FCE5CD" ss:Pattern="Solid"/>
   <Font ss:Size="10"/>
  </Style>
  <!-- Sunday / Saturday / Holiday Cell -->
  <Style ss:ID="CellWeekend">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
   <Font ss:Size="10" ss:Color="#000000"/>
  </Style>
 </Styles>`;

  // Create a worksheet for each month in range (multi-sheet tabs as in user's image)
  monthGroups.forEach(({ monthName, dates }) => {
    xml += `
 <Worksheet ss:Name="${monthName}">
  <Table>
   <!-- Column Widths -->
   <Column ss:Width="70"/>
   <Column ss:Width="140"/>`;

    // Date Columns Width
    dates.forEach(() => {
      xml += `\n   <Column ss:Width="75"/>`;
    });

    // Row 1: Headers
    xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="HeaderYellow"><Data ss:Type="String">EMP NO.</Data></Cell>
    <Cell ss:StyleID="HeaderMaroon"><Data ss:Type="String">Name of Employee</Data></Cell>`;

    dates.forEach((dStr) => {
      xml += `\n    <Cell ss:StyleID="HeaderYellow"><Data ss:Type="String">${formatDateMMDDYYYY(dStr)}</Data></Cell>`;
    });

    xml += `\n   </Row>`;

    // Employee Rows
    employees.forEach((emp, empIdx) => {
      const empNo = emp.emp_no || emp.qd_id || `TIS${String(empIdx + 1).padStart(3, '0')}`;
      const recMap = new Map<string, ExportAttendanceItem>();
      emp.records.forEach((r) => recMap.set(r.date, r));

      xml += `
   <Row ss:Height="19">
    <Cell ss:StyleID="CellEmpNo"><Data ss:Type="String">${empNo}</Data></Cell>
    <Cell ss:StyleID="CellName"><Data ss:Type="String">${emp.full_name}</Data></Cell>`;

      dates.forEach((dStr) => {
        const cell = getMatrixCellValue(recMap.get(dStr), dStr, weeklyOffDays, saturdayOffRule);
        let sId = 'CellP';
        if (cell.isHalf || cell.isAbsent) sId = 'CellHighlight';
        else if (cell.isSunday || cell.isSat || cell.isHoliday) sId = 'CellWeekend';

        xml += `\n    <Cell ss:StyleID="${sId}"><Data ss:Type="String">${cell.val}</Data></Cell>`;
      });

      xml += `\n   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>`;
  });

  xml += `\n</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  triggerDownload(blob, outFilename);
}
