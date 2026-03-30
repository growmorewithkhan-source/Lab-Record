/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Staff {
  id: string;
  n: string; // Name
  r: string; // Role
  s: string; // Salary
  p: string; // Password
  pic?: string; // Profile Picture URL
  lab?: string; // Assigned Lab Name
  type?: 'Daily' | 'Permanent'; // Staff Type
}

export interface Equipment {
  n: string; // Name
  s: string; // Serial
  st: 'Working' | 'Faulty'; // Status
}

export interface LabSys {
  id: string;
  staffId: string;
  gen: string;
  ram: string;
  disk: string;
  count: number;
}

export interface LabSw {
  id: string;
  staffId: string;
  name: string;
  ver: string;
}

export interface LabEquip {
  id: string;
  staffId: string;
  name: string;
  status: 'Working' | 'Faulty';
}

export interface Complaint {
  d: string; // Description
  a: string; // Assignee
  p: 'Low' | 'High' | 'Critical'; // Priority
}

export interface Schedule {
  day: string;
  st: string; // Start time
  et: string; // End time
  sub: string; // Subject
  inst: string; // Instructor
}

export interface AttendanceRecord {
  [date: string]: {
    [staffId: string]: {
      status: 'Present' | 'Absent';
      reason?: string;
    };
  };
}

export interface Note {
  id: string;
  staffId: string;
  staffName: string;
  text: string;
  timestamp: string;
  editedTimestamp?: string;
  reply?: string;
  replyStaffId?: string;
  replyTimestamp?: string;
  replyEditedTimestamp?: string;
  staffReply?: string;
  staffReplyTimestamp?: string;
  targetStaffId?: string; // 'all' or specific staffId
  isRead?: boolean;
  isClosed?: boolean;
  history?: { text: string; timestamp: string }[];
  replyHistory?: { text: string; timestamp: string }[];
}

export type TabType = 'dash' | 'staff' | 'salary' | 'equip' | 'comp' | 'sched' | 'reports' | 'notes' | 'lab';
