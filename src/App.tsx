/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Package, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  LogOut, 
  Search, 
  Moon, 
  Sun, 
  Plus, 
  Edit2, 
  Trash2, 
  Printer, 
  RefreshCw, 
  Download,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Menu,
  X,
  Cpu,
  Monitor,
  Code,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from './lib/utils';
import type { 
  Staff, 
  Equipment, 
  LabSys, 
  LabSw, 
  LabEquip,
  Complaint, 
  Schedule, 
  AttendanceRecord, 
  TabType,
  Note
} from './types';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9Q3_0zDjFBHRinZwaEbzcpuB25ANwYLmTEz9cN8BPQRV0ljL1MOTnU5qNrM61QjWP-g/exec';

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('dash');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string, idx: number } | null>(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonStaffId, setReasonStaffId] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [deductSalary, setDeductSalary] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyToShow, setHistoryToShow] = useState<{ text: string; timestamp: string }[]>([]);
  const [historyTitle, setHistoryTitle] = useState('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    return canvas.toDataURL('image/jpeg');
  };

  const convertGDriveLink = (url: string) => {
    const match = url.match(/\/file\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url;
  };

  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [modalMode, setModalMode] = useState<TabType | 'lab_sys' | 'lab_sw' | 'lab_equip'>('staff');
  const [editId, setEditId] = useState<number | -1>(-1);
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('erp_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const isAdmin = currentUser?.r === 'Admin' || currentUser?.id === '01';

  useEffect(() => {
    if (currentUser && !isAdmin) {
      setSelectedLabStaffId(currentUser.id);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('erp_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('erp_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const handleLogin = (idOrName: string, pass: string): boolean => {
    const cleanInput = String(idOrName).trim().toLowerCase();
    const cleanPass = String(pass).trim();
    
    const user = staff.find(s => {
      const sId = String(s.id).trim().toLowerCase();
      const sName = String(s.n).trim().toLowerCase();
      const sPass = String(s.p).trim();
      
      return (sId === cleanInput || 
              parseInt(sId) === parseInt(cleanInput) || 
              sName === cleanInput) && 
             sPass === cleanPass;
    });

    if (user) {
      setCurrentUser(user);
      
      // Check for unread notes/replies
      const isAdmin = user.r === 'Admin';
      const unreadCount = notes.filter(n => {
        if (isAdmin) {
          // Admin sees new notes from staff
          return !n.reply && !n.isRead && n.staffId !== user.id;
        } else {
          // Staff sees new replies from admin or notes targeted at them
          const isTargeted = n.targetStaffId === user.id || n.targetStaffId === 'all';
          const isFromAdmin = staff.find(s => s.id === n.staffId)?.r === 'Admin';
          return (n.reply && !n.isRead && n.staffId === user.id) || (isTargeted && isFromAdmin && !n.isRead && n.staffId !== user.id);
        }
      }).length;

      if (unreadCount > 0) {
        setNotificationCount(unreadCount);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
      return true;
    } else {
      return false;
    }
  };

  const markNotesAsRead = () => {
    if (!currentUser) return;
    const updatedNotes = notes.map(n => {
      const isAdmin = currentUser.r === 'Admin';
      if (isAdmin) {
        if (!n.reply && n.staffId !== currentUser.id) return { ...n, isRead: true };
      } else {
        const isTargeted = n.targetStaffId === currentUser.id || n.targetStaffId === 'all';
        const isFromAdmin = staff.find(s => s.id === n.staffId)?.r === 'Admin';
        if ((n.reply && n.staffId === currentUser.id) || (isTargeted && isFromAdmin && n.staffId !== currentUser.id)) {
          return { ...n, isRead: true };
        }
      }
      return n;
    });
    setNotes(updatedNotes);
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    syncToGoogle('note_delete', { id });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dash');
  };

  // Data State
  const [staff, setStaff] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('erp_staff');
    return saved ? JSON.parse(saved) : [
      { id: '01', n: 'Shahan Ullah', r: 'Admin', s: '1780', p: 'Admin@123', pic: 'https://picsum.photos/seed/admin/200', type: 'Daily' },
      { id: '02', n: 'Sample Staff', r: 'Staff', s: '1200', p: 'Staff@123', pic: 'https://picsum.photos/seed/staff/200', type: 'Daily' }
    ];
  });
  const [equip, setEquip] = useState<Equipment[]>(() => {
    const saved = localStorage.getItem('erp_inv');
    return saved ? JSON.parse(saved) : [];
  });
  const [labSys, setLabSys] = useState<LabSys[]>(() => {
    const saved = localStorage.getItem('erp_lab_sys');
    return saved ? JSON.parse(saved) : [];
  });
  const [labSw, setLabSw] = useState<LabSw[]>(() => {
    const saved = localStorage.getItem('erp_lab_sw');
    return saved ? JSON.parse(saved) : [];
  });
  const [labEquip, setLabEquip] = useState<LabEquip[]>(() => {
    const saved = localStorage.getItem('erp_lab_equip');
    return saved ? JSON.parse(saved) : [];
  });
  const [comp, setComp] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem('erp_comp');
    return saved ? JSON.parse(saved) : [];
  });
  const [sched, setSched] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem('erp_sched');
    return saved ? JSON.parse(saved) : [];
  });
  const [att, setAtt] = useState<AttendanceRecord>(() => {
    const saved = localStorage.getItem('erp_att_v27');
    return saved ? JSON.parse(saved) : {};
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('erp_notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [attDate, setAttDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLabStaffId, setSelectedLabStaffId] = useState<string>(() => currentUser?.id || '');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTarget, setNoteTarget] = useState<string>('all');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const payrollRange = useMemo(() => {
    const today = new Date();
    let startMonth = today.getMonth();
    let startYear = today.getFullYear();

    if (today.getDate() < 24) {
      startMonth -= 1;
    }

    const start = new Date(startYear, startMonth, 24);
    const end = new Date(startYear, startMonth + 1, 24);
    return { 
      start, 
      end,
      startStr: format(start, 'yyyy-MM-dd'),
      endStr: format(end, 'yyyy-MM-dd')
    };
  }, [currentTime.toDateString()]);

  // Sync to LocalStorage
  useEffect(() => localStorage.setItem('erp_staff', JSON.stringify(staff)), [staff]);
  useEffect(() => localStorage.setItem('erp_inv', JSON.stringify(equip)), [equip]);
  useEffect(() => localStorage.setItem('erp_lab_sys', JSON.stringify(labSys)), [labSys]);
  useEffect(() => localStorage.setItem('erp_lab_sw', JSON.stringify(labSw)), [labSw]);
  useEffect(() => localStorage.setItem('erp_lab_equip', JSON.stringify(labEquip)), [labEquip]);
  useEffect(() => localStorage.setItem('erp_comp', JSON.stringify(comp)), [comp]);
  useEffect(() => localStorage.setItem('erp_sched', JSON.stringify(sched)), [sched]);
  useEffect(() => localStorage.setItem('erp_att_v27', JSON.stringify(att)), [att]);
  useEffect(() => localStorage.setItem('erp_notes', JSON.stringify(notes)), [notes]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Sync with Google Sheets on load
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();
        if (cloudData && cloudData.staff) {
          const mappedStaff = cloudData.staff.map((row: any) => ({
            id: String(row.id || row.ID || ''),
            n: String(row.name || row.n || row.Name || 'No Name'),
            r: String(row.role || row.r || 'Staff'),
            s: String(row.salary || row.s || '0'),
            p: String(row.passkey || row.p || '****')
          }));
          
          setStaff(prev => {
            const merged = [...prev];
            mappedStaff.forEach((cloudUser: Staff) => {
              const idx = merged.findIndex(u => String(u.id) === String(cloudUser.id));
              if (idx === -1) {
                merged.push(cloudUser);
              } else {
                // Only update if cloud data has a real passkey
                if (cloudUser.p !== '****') {
                  merged[idx] = cloudUser;
                }
              }
            });
            return merged;
          });
        }
      } catch (e) {
        console.error("Sync Error:", e);
      }
    };
    fetchCloudData();
  }, []);

  const syncToGoogle = async (mode: string, entry: any) => {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, entry })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers
  const handleSave = (formData: any) => {
    const dataWithDefaults = { ...formData };

    if (modalMode === 'staff') {
      if (!dataWithDefaults.r) dataWithDefaults.r = 'Staff';
      if (!dataWithDefaults.type) dataWithDefaults.type = 'Daily';
      if (!dataWithDefaults.s) dataWithDefaults.s = '0';
      if (!dataWithDefaults.id || !dataWithDefaults.p) {
        return;
      }

      const isDuplicate = staff.some((user, index) => String(user.id) === String(dataWithDefaults.id) && index !== editId);
      if (isDuplicate) {
        setIsConfirmModalOpen(true);
        setConfirmAction({ type: 'duplicate_error', idx: -1 });
        return;
      }
      const newStaff = [...staff];
      if (editId === -1) newStaff.push(dataWithDefaults as Staff);
      else newStaff[editId] = dataWithDefaults as Staff;
      
      setStaff(newStaff);
      localStorage.setItem('erp_staff', JSON.stringify(newStaff)); // Immediate save
      syncToGoogle('staff', dataWithDefaults);
    } else if (modalMode === 'equip') {
      if (!dataWithDefaults.st) dataWithDefaults.st = 'Working';
      const newEquip = [...equip];
      if (editId === -1) newEquip.push(dataWithDefaults);
      else newEquip[editId] = dataWithDefaults;
      setEquip(newEquip);
      syncToGoogle('equip', dataWithDefaults);
    } else if (modalMode === 'lab_sys') {
      if (!dataWithDefaults.staffId) {
        dataWithDefaults.staffId = isAdmin ? selectedLabStaffId : currentUser?.id;
      }
      if (!dataWithDefaults.staffId) return; // Cannot save without staffId
      const newLabSys = [...labSys];
      if (editId === -1) newLabSys.push(dataWithDefaults);
      else newLabSys[editId] = dataWithDefaults;
      setLabSys(newLabSys);
      syncToGoogle('lab_sys', dataWithDefaults);
    } else if (modalMode === 'lab_sw') {
      if (!dataWithDefaults.staffId) {
        dataWithDefaults.staffId = isAdmin ? selectedLabStaffId : currentUser?.id;
      }
      if (!dataWithDefaults.staffId) return;
      const newLabSw = [...labSw];
      if (editId === -1) newLabSw.push(dataWithDefaults);
      else newLabSw[editId] = dataWithDefaults;
      setLabSw(newLabSw);
      syncToGoogle('lab_sw', dataWithDefaults);
    } else if (modalMode === 'lab_equip') {
      if (!dataWithDefaults.staffId) {
        dataWithDefaults.staffId = isAdmin ? selectedLabStaffId : currentUser?.id;
      }
      if (!dataWithDefaults.staffId) return;
      if (!dataWithDefaults.status) dataWithDefaults.status = 'Working';
      const newLabEquip = [...labEquip];
      if (editId === -1) newLabEquip.push(dataWithDefaults);
      else newLabEquip[editId] = dataWithDefaults;
      setLabEquip(newLabEquip);
      syncToGoogle('lab_equip', dataWithDefaults);
    } else if (modalMode === 'comp') {
      if (!dataWithDefaults.p) dataWithDefaults.p = 'Low';
      const newComp = [...comp];
      if (editId === -1) newComp.push(dataWithDefaults);
      else newComp[editId] = dataWithDefaults;
      setComp(newComp);
      syncToGoogle('comp', dataWithDefaults);
    } else if (modalMode === 'sched') {
      const newSched = [...sched];
      if (editId === -1) newSched.push(formData);
      else newSched[editId] = formData;
      setSched(newSched);
      syncToGoogle('sched', formData);
    }
    setIsModalOpen(false);
    setEditId(-1);
  };

  const openEditModal = (mode: TabType | 'lab_sys' | 'lab_sw' | 'lab_equip', item: any) => {
    let originalIdx = -1;
    if (mode === 'staff') originalIdx = staff.findIndex(s => s.id === item.id);
    else if (mode === 'equip') originalIdx = equip.findIndex(e => e.s === item.s);
    else if (mode === 'lab_sys') originalIdx = labSys.findIndex(l => l.id === item.id);
    else if (mode === 'lab_sw') originalIdx = labSw.findIndex(s => s.name === item.name && s.staffId === item.staffId);
    else if (mode === 'lab_equip') originalIdx = labEquip.findIndex(e => e.name === item.name && e.staffId === item.staffId);
    else if (mode === 'comp') originalIdx = comp.findIndex(c => c.d === item.d);
    else if (mode === 'sched') originalIdx = sched.findIndex(s => s.sub === item.sub && s.day === item.day);

    setModalMode(mode);
    setEditId(originalIdx);
    setIsModalOpen(true);
  };

  const handleDelete = (mode: string, item: any) => {
    if (mode === 'staff' && item.id === '01') {
      return;
    }
    
    let originalIdx = -1;
    if (mode === 'staff') originalIdx = staff.findIndex(s => s.id === item.id);
    else if (mode === 'equip') originalIdx = equip.findIndex(e => e.s === item.s);
    else if (mode === 'lab_sys') originalIdx = labSys.findIndex(l => l.id === item.id);
    else if (mode === 'lab_sw') originalIdx = labSw.findIndex(s => s.name === item.name && s.pc === item.pc);
    else if (mode === 'lab_equip') originalIdx = labEquip.findIndex(e => e.name === item.name && e.staffId === item.staffId);
    else if (mode === 'comp') originalIdx = comp.findIndex(c => c.d === item.d);
    else if (mode === 'sched') originalIdx = sched.findIndex(s => s.sub === item.sub && s.day === item.day);

    if (originalIdx !== -1) {
      setConfirmAction({ type: 'delete_' + mode, idx: originalIdx });
      setIsConfirmModalOpen(true);
    }
  };

  const executeDelete = async () => {
    if (!confirmAction) return;
    const { type, idx } = confirmAction;
    const mode = type.replace('delete_', '');
    
    const entry = (mode === 'staff' ? staff : mode === 'equip' ? equip : mode === 'lab_sys' ? labSys : mode === 'lab_sw' ? labSw : mode === 'lab_equip' ? labEquip : mode === 'comp' ? comp : sched)[idx];
    await syncToGoogle('delete_' + mode, entry);
    
    if (mode === 'staff') setStaff(prev => prev.filter((_, i) => i !== idx));
    else if (mode === 'equip') setEquip(prev => prev.filter((_, i) => i !== idx));
    else if (mode === 'lab_sys') setLabSys(prev => prev.filter((_, i) => i !== idx));
    else if (mode === 'lab_sw') setLabSw(prev => prev.filter((_, i) => i !== idx));
    else if (mode === 'lab_equip') setLabEquip(prev => prev.filter((_, i) => i !== idx));
    else if (mode === 'comp') setComp(prev => prev.filter((_, i) => i !== idx));
    else if (mode === 'sched') setSched(prev => prev.filter((_, i) => i !== idx));
    
    setIsConfirmModalOpen(false);
    setConfirmAction(null);
  };

  const setAttendance = (id: string, status: 'Present' | 'Absent') => {
    if (status === 'Absent') {
      setReasonStaffId(id);
      setIsReasonModalOpen(true);
      setReasonText('');
      setDeductSalary(false); // Default: do not deduct
    } else {
      setAtt(prev => ({
        ...prev,
        [attDate]: {
          ...(prev[attDate] || {}),
          [id]: { status: 'Present' }
        }
      }));
    }
  };

  const saveAbsenceReason = () => {
    setAtt(prev => ({
      ...prev,
      [attDate]: {
        ...(prev[attDate] || {}),
        [reasonStaffId]: { status: 'Absent', reason: reasonText, deduct: deductSalary }
      }
    }));
    setIsReasonModalOpen(false);
  };

  const exportData = (type: 'excel' | 'pdf' | 'payroll-pdf') => {
    if (type === 'excel') {
      // Export only inventory records
      const hardwareData = equip.map(e => ({ Type: 'Hardware', Name: e.n, Serial: e.s, Status: e.st }));
      const pcSpecsData = labSys.map(l => {
        const staffName = staff.find(s => s.id === l.staffId)?.n || 'Unknown';
        return { Type: 'PC Spec', Staff: staffName, ID: l.id, Gen: l.gen, RAM: l.ram, Disk: l.disk, Qty: l.count };
      });
      const softwareData = labSw.map(s => {
        const staffName = staff.find(st => st.id === s.staffId)?.n || 'Unknown';
        return { Type: 'Software', Staff: staffName, Name: s.name, Version: s.ver };
      });
      const labEquipData = labEquip.map(e => {
        const staffName = staff.find(st => st.id === e.staffId)?.n || 'Unknown';
        return { Type: 'Lab Equipment', Staff: staffName, Name: e.name, Status: e.status };
      });
      
      const combinedData = [...hardwareData, ...pcSpecsData, ...softwareData, ...labEquipData];
      const ws = XLSX.utils.json_to_sheet(combinedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      XLSX.writeFile(wb, "Inventory_Report.xlsx");
    } else if (type === 'pdf') {
      // Export inventory to PDF
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Inventory Control Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 28);

      doc.text("Hardware Assets", 14, 40);
      autoTable(doc, {
        startY: 45,
        head: [['Name', 'Serial', 'Status']],
        body: equip.map(x => [x.n, x.s, x.st])
      });

      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.text("PC Specifications", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Staff', 'PC ID', 'Gen', 'RAM', 'Disk', 'Qty']],
        body: labSys.map(x => [staff.find(s => s.id === x.staffId)?.n || 'Unknown', x.id, x.gen, x.ram, x.disk, x.count])
      });

      const finalY2 = (doc as any).lastAutoTable.finalY || finalY + 20;
      doc.text("Software Inventory", 14, finalY2 + 10);
      autoTable(doc, {
        startY: finalY2 + 15,
        head: [['Staff', 'Name', 'Version']],
        body: labSw.map(x => [staff.find(s => s.id === x.staffId)?.n || 'Unknown', x.name, x.ver])
      });

      const finalY3 = (doc as any).lastAutoTable.finalY || finalY2 + 20;
      doc.text("Lab Equipment", 14, finalY3 + 10);
      autoTable(doc, {
        startY: finalY3 + 15,
        head: [['Staff', 'Name', 'Status']],
        body: labEquip.map(x => [staff.find(s => s.id === x.staffId)?.n || 'Unknown', x.name, x.status])
      });

      doc.save("Inventory_Report.pdf");
    } else if (type === 'payroll-pdf') {
      const doc = new jsPDF();
      const { start, end } = payrollRange;
      
      doc.setFontSize(18);
      doc.text("Monthly Payroll Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`, 14, 28);
      doc.text(`Generated for: ${currentUser.n} (${currentUser.r})`, 14, 34);

      const targetStaff = isAdmin ? staff : staff.filter(s => s.id === currentUser.id);

      targetStaff.forEach((s, index) => {
        if (index > 0) doc.addPage();
        
        doc.setFontSize(14);
        doc.text(`Staff: ${s.n} (ID: ${s.id})`, 14, 45);
        
        // Get attendance for this staff in range
        const attendanceInRange: any[] = [];
        let presents = 0;
        let absents = 0;
        
        const curr = new Date(start);
        while (curr <= end) {
          const dateStr = format(curr, 'yyyy-MM-dd');
          const record = att[dateStr]?.[s.id];
          if (record) {
            attendanceInRange.push([
              format(curr, 'MMM dd, yyyy'),
              record.status,
              record.reason || '-'
            ]);
            if (record.status === 'Present') presents++;
            else absents++;
          }
          curr.setDate(curr.getDate() + 1);
        }

        autoTable(doc, {
          startY: 50,
          head: [['Date', 'Status', 'Reason/Remarks']],
          body: attendanceInRange
        });

        const finalY = (doc as any).lastAutoTable.finalY || 60;
        const dailyRate = parseInt(s.s);
        const totalSalary = presents * dailyRate;

        doc.setFontSize(12);
        doc.text(`Summary:`, 14, finalY + 15);
        doc.text(`Total Present Days: ${presents}`, 14, finalY + 22);
        doc.text(`Total Absent Days: ${absents}`, 14, finalY + 29);
        doc.text(`Daily Rate: Rs. ${dailyRate}`, 14, finalY + 36);
        doc.setFont("helvetica", "bold");
        doc.text(`Net Payable Salary: Rs. ${totalSalary}`, 14, finalY + 45);
        doc.setFont("helvetica", "normal");
      });

      doc.save(`Payroll_Report_${format(new Date(), 'MMM_yyyy')}.pdf`);
    }
  };

  const shareWA = (n: string, p: number, t: number) => {
    window.open(`https://wa.me/?text=*PAYROLL*%0A*Name:* ${n}%0A*Presents:* ${p}%0A*Total:* Rs. ${t}`, '_blank');
  };

  // Filtered Data
  const filteredStaff = staff.filter(s => s.n.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm));
  const filteredEquip = equip.filter(e => e.n.toLowerCase().includes(searchTerm.toLowerCase()) || e.s.toLowerCase().includes(searchTerm));
  const filteredLabSys = labSys.filter(l => l.id.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLabSw = labSw.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredComp = comp.filter(c => c.d.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSched = sched.filter(s => s.sub.toLowerCase().includes(searchTerm.toLowerCase()) || s.inst.toLowerCase().includes(searchTerm));

  if (!currentUser) {
    return <Login onLogin={handleLogin} theme={theme} staff={staff} setStaff={setStaff} />;
  }

  return (
    <div className={cn(
      "min-h-screen font-['Poppins'] transition-colors duration-300",
      theme === 'dark' ? "bg-[#020205] text-[#e0e0e0]" : "bg-[#f0f2f5] text-[#1a1a1a]"
    )}>
      <div className="flex h-screen overflow-hidden relative">
        {/* Sidebar */}
        <aside className={cn(
          "h-full w-64 border-r flex flex-col p-6 gap-2 overflow-y-auto shrink-0 transition-transform duration-300",
          theme === 'dark' ? "bg-[#050508] border-white/5" : "bg-white border-gray-200"
        )}>
          <div className="mb-8">
            <h2 className="font-['Orbitron'] text-2xl font-bold text-[#00f2ff]">SK-OS</h2>
            <p className="text-[10px] text-[#888] tracking-widest uppercase">ERP ENTERPRISE v28.0</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input 
              type="text" 
              placeholder="Search Records..."
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg text-xs outline-none border-l-4 border-[#00f2ff]",
                theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-2 px-2">Main Menu</p>
          <NavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
          
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Human Resources</p>
          {isAdmin && <NavItem active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={18} />} label="Staff Management" />}
          <NavItem active={activeTab === 'salary'} onClick={() => setActiveTab('salary')} icon={<Wallet size={18} />} label="Payroll & Attendance" />
          
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Assets & Ops</p>
          <NavItem active={activeTab === 'equip'} onClick={() => setActiveTab('equip')} icon={<Package size={18} />} label="Inventory Control" />
          <NavItem active={activeTab === 'comp'} onClick={() => setActiveTab('comp')} icon={<AlertTriangle size={18} />} label="Complaint Tracker" />
          <NavItem active={activeTab === 'lab'} onClick={() => setActiveTab('lab')} icon={<Monitor size={18} />} label="Lab Inventory" />
          <NavItem active={activeTab === 'sched'} onClick={() => setActiveTab('sched')} icon={<Calendar size={18} />} label="Lab Schedule" />
          
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Communication</p>
          <NavItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<MessageSquare size={18} />} label="Staff Notes" />

          {isAdmin && (
            <>
              <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Analytics</p>
              <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={18} />} label="Reports Export" />
            </>
          )}

          <button 
            onClick={handleLogout}
            className="mt-auto flex items-center justify-center gap-2 bg-[#ff3f34] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <LogOut size={18} /> LOGOUT
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-semibold">{isAdmin ? 'Admin Overview' : 'Staff Portal'}</h3>
              <p className="text-[#00f2ff] text-xs flex items-center gap-1">
                <Clock size={12} /> {format(currentTime, 'PPpp')}
              </p>
            </div>

            <div className={cn(
              "flex items-center gap-4 px-4 py-2 rounded-full border",
              theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
            )}>
              <button 
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  theme === 'dark' ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                )}
              >
                {theme === 'dark' ? <Sun size={18} className="text-[#00f2ff]" /> : <Moon size={18} className="text-[#2563eb]" />}
              </button>
              <div className="text-right">
                <span className={cn(
                  "block text-xs font-bold leading-none",
                  theme === 'dark' ? "text-white" : "text-gray-900"
                )}>{currentUser.n.toUpperCase()}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                  isAdmin ? "bg-[#00f2ff]/10 text-[#00f2ff]" : "bg-[#00ff88]/10 text-[#00ff88]"
                )}>
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
              </div>
              <div className="relative group cursor-pointer" onClick={() => { setProfilePicUrl(currentUser.pic || ''); setIsProfileModalOpen(true); }}>
                {currentUser.pic ? (
                  <img 
                    src={currentUser.pic} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border-2 border-[#00f2ff] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-[#00f2ff] flex items-center justify-center font-bold text-[#00f2ff] uppercase bg-[#00f2ff]/10">
                    {currentUser.n.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Edit2 size={12} className="text-white" />
                </div>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dash' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                      icon={<Users className="text-[#00f2ff]" />} 
                      label="Active Staff" 
                      value={staff.length} 
                      color="#00f2ff" 
                      onClick={isAdmin ? () => setActiveTab('staff') : undefined}
                      theme={theme}
                    />
                    <StatCard 
                      icon={<Package className="text-[#ff6600]" />} 
                      label="Lab Assets" 
                      value={equip.length + labSys.length} 
                      color="#ff6600" 
                      onClick={() => setActiveTab('equip')}
                      theme={theme}
                    />
                    <StatCard 
                      icon={<AlertTriangle className="text-[#ff3f34]" />} 
                      label="Issues" 
                      value={comp.length} 
                      color="#ff3f34" 
                      onClick={() => setActiveTab('comp')}
                      theme={theme}
                    />
                    <StatCard 
                      icon={<Calendar className="text-[#00ff88]" />} 
                      label="Lab Sessions" 
                      value={sched.length} 
                      color="#00ff88" 
                      onClick={() => setActiveTab('sched')}
                      theme={theme}
                    />
                  </div>
                  <div className={cn(
                    "p-6 rounded-2xl border",
                    theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                  )}>
                    <h4 className="text-[#00f2ff] font-bold mb-2">System Message</h4>
                    <p className="text-sm text-[#888]">Welcome {currentUser.n.split(' ')[0]}. All systems operational. Database synced with cloud.</p>
                  </div>
                </div>
              )}

              {activeTab === 'lab' && (
                <div className="space-y-8">
                  <div className={cn(
                    "p-8 rounded-2xl border",
                    theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                  )}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                      <div>
                        <h3 className="text-2xl font-bold text-[#00f2ff] uppercase tracking-wider">Lab Inventory Management</h3>
                        <p className="text-sm text-[#888]">
                          {isAdmin 
                            ? "Manage PC specifications, software, and equipment for assigned labs." 
                            : `Managing Inventory for: ${currentUser?.lab || 'No Lab Assigned'}`
                          }
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#888] uppercase tracking-widest">View Lab For:</span>
                          <select 
                            className={cn(
                              "p-2 rounded-lg outline-none border text-sm font-bold",
                              theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-100 border-gray-200"
                            )}
                            value={selectedLabStaffId}
                            onChange={(e) => setSelectedLabStaffId(e.target.value)}
                          >
                            {staff.filter(s => s.lab).map(s => (
                              <option key={s.id} value={s.id}>{s.n} ({s.lab})</option>
                            ))}
                            {staff.filter(s => s.lab).length === 0 && <option value="">No Labs Assigned</option>}
                          </select>
                        </div>
                      )}
                    </div>

                    {!selectedLabStaffId && isAdmin ? (
                      <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                        <Monitor size={64} className="mx-auto mb-4 opacity-20 text-[#00f2ff]" />
                        <h4 className="text-xl font-bold mb-2">No Labs Assigned Yet</h4>
                        <p className="text-[#888] max-w-md mx-auto">Assign a lab name to a staff member in the Staff Management tab to start managing their inventory.</p>
                        <button 
                          onClick={() => setActiveTab('staff')}
                          className="mt-6 px-6 py-3 bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 rounded-xl font-bold hover:bg-[#00f2ff]/20 transition-all"
                        >
                          GO TO STAFF MANAGEMENT
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* PC Systems */}
                        <div className={cn(
                          "p-6 rounded-2xl border",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                        )}>
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold flex items-center gap-2"><Cpu size={18} className="text-[#00f2ff]" /> PC Systems</h4>
                            <button 
                              onClick={() => { setModalMode('lab_sys'); setEditId(-1); setIsModalOpen(true); }}
                              className="p-2 bg-[#00f2ff] text-white rounded-lg hover:opacity-80"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {labSys.filter(l => l.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).map((l, idx) => (
                              <div key={l.id} className={cn(
                                "p-4 rounded-xl border group relative",
                                theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white border-gray-100"
                              )}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-[#00f2ff]">{l.id}</span>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal('lab_sys', l)} className="text-[#ffcc00]"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete('lab_sys', l)} className="text-[#ff3f34]"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-[#888]">
                                  <div>Gen: <span className={theme === 'dark' ? "text-white" : "text-black"}>{l.gen}</span></div>
                                  <div>RAM: <span className={theme === 'dark' ? "text-white" : "text-black"}>{l.ram}</span></div>
                                  <div>Disk: <span className={theme === 'dark' ? "text-white" : "text-black"}>{l.disk}</span></div>
                                  <div>Qty: <span className={theme === 'dark' ? "text-white" : "text-black"}>{l.count}</span></div>
                                </div>
                              </div>
                            ))}
                            {labSys.filter(l => l.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).length === 0 && (
                              <p className="text-center text-xs text-[#888] py-4 italic">No PCs recorded.</p>
                            )}
                          </div>
                        </div>

                        {/* Software */}
                        <div className={cn(
                          "p-6 rounded-2xl border",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                        )}>
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold flex items-center gap-2"><Code size={18} className="text-[#00ff88]" /> Software</h4>
                            <button 
                              onClick={() => { setModalMode('lab_sw'); setEditId(-1); setIsModalOpen(true); }}
                              className="p-2 bg-[#00ff88] text-white rounded-lg hover:opacity-80"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {labSw.filter(s => s.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).map((s, idx) => (
                              <div key={idx} className={cn(
                                "p-4 rounded-xl border group relative",
                                theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white border-gray-100"
                              )}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-bold">{s.name}</p>
                                    <p className="text-[10px] text-[#888] uppercase font-bold">Version: {s.ver}</p>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal('lab_sw', s)} className="text-[#ffcc00]"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete('lab_sw', s)} className="text-[#ff3f34]"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {labSw.filter(s => s.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).length === 0 && (
                              <p className="text-center text-xs text-[#888] py-4 italic">No software recorded.</p>
                            )}
                          </div>
                        </div>

                        {/* Equipment */}
                        <div className={cn(
                          "p-6 rounded-2xl border",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                        )}>
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="font-bold flex items-center gap-2"><Package size={18} className="text-[#ff6600]" /> Equipment</h4>
                            <button 
                              onClick={() => { setModalMode('lab_equip'); setEditId(-1); setIsModalOpen(true); }}
                              className="p-2 bg-[#ff6600] text-white rounded-lg hover:opacity-80"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {labEquip.filter(e => e.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).map((e, idx) => (
                              <div key={idx} className={cn(
                                "p-4 rounded-xl border group relative",
                                theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white border-gray-100"
                              )}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-bold">{e.name}</p>
                                    <span className={cn(
                                      "text-[8px] font-bold uppercase px-2 py-0.5 rounded",
                                      e.status === 'Working' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff3f34]/10 text-[#ff3f34]"
                                    )}>{e.status}</span>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal('lab_equip', e)} className="text-[#ffcc00]"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete('lab_equip', e)} className="text-[#ff3f34]"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {labEquip.filter(e => e.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).length === 0 && (
                              <p className="text-center text-xs text-[#888] py-4 italic">No equipment recorded.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'staff' && (
                <div className={cn(
                  "p-4 lg:p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-xl font-bold">Staff Registry</h3>
                    <button 
                      onClick={() => { setModalMode('staff'); setEditId(-1); setIsModalOpen(true); }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00f2ff] text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90"
                    >
                      <Plus size={14} /> Add Staff
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#ff6600] text-[10px] uppercase tracking-wider border-b border-white/5">
                          <th className="pb-4 px-4">ID</th>
                          <th className="pb-4 px-4">Name</th>
                          <th className="pb-4 px-4">Role</th>
                          <th className="pb-4 px-4">Type</th>
                          <th className="pb-4 px-4">Lab</th>
                          <th className="pb-4 px-4">Base Salary</th>
                          <th className="pb-4 px-4">Passkey</th>
                          <th className="pb-4 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredStaff.map((s, i) => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4">{s.id}</td>
                            <td className="py-4 px-4 font-semibold">{s.n}</td>
                            <td className="py-4 px-4">{s.r}</td>
                            <td className="py-4 px-4">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                s.type === 'Permanent' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ffcc00]/10 text-[#ffcc00]"
                              )}>
                                {s.type || 'Daily'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {s.lab ? (
                                <span className="px-2 py-1 rounded bg-[#00f2ff]/10 text-[#00f2ff] text-[10px] font-bold uppercase">{s.lab}</span>
                              ) : (
                                <span className="text-[#888] text-[10px] italic">Not Assigned</span>
                              )}
                            </td>
                            <td className="py-4 px-4">Rs. {s.s}</td>
                            <td className="py-4 px-4"><code className="text-[#888]">****</code></td>
                            <td className="py-4 px-4 flex gap-2">
                              <button onClick={() => openEditModal('staff', s)} className="p-2 bg-[#ffcc00] text-black rounded hover:opacity-80"><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete('staff', s)} className="p-2 bg-[#ff3f34] text-white rounded hover:opacity-80"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'salary' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className={cn(
                    "p-6 rounded-2xl border",
                    theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                  )}>
                    <h3 className="text-lg font-bold mb-4">Daily Attendance</h3>
                    {isAdmin ? (
                      <>
                        <input 
                          type="date" 
                          className={cn(
                            "w-full p-3 rounded-lg mb-6 outline-none",
                            theme === 'dark' ? "bg-white/5 border border-white/5" : "bg-gray-100"
                          )}
                          value={attDate}
                          onChange={(e) => setAttDate(e.target.value)}
                        />
                        <div className="space-y-2">
                          {staff.map(e => (
                            <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                              <span className="text-sm font-semibold">{e.n}</span>
                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setAttendance(e.id, 'Present')}
                                  className={cn(
                                    "flex flex-col items-center gap-1 text-[10px] font-bold",
                                    att[attDate]?.[e.id]?.status === 'Present' ? "text-[#00ff88]" : "text-[#888]"
                                  )}
                                >
                                  <CheckCircle2 size={18} /> P
                                </button>
                                <button 
                                  onClick={() => setAttendance(e.id, 'Absent')}
                                  className={cn(
                                    "flex flex-col items-center gap-1 text-[10px] font-bold",
                                    att[attDate]?.[e.id]?.status === 'Absent' ? "text-[#ff3f34]" : "text-[#888]"
                                  )}
                                >
                                  <XCircle size={18} /> A
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-[#888]">
                        <p className="text-sm italic">Attendance is managed by Admin.</p>
                        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                          <p className="text-xs uppercase font-bold mb-1">Your Status Today</p>
                          <p className={cn(
                            "text-lg font-bold",
                            att[attDate]?.[currentUser.id]?.status === 'Present' ? "text-[#00ff88]" : "text-[#ff3f34]"
                          )}>
                            {att[attDate]?.[currentUser.id]?.status || 'Not Marked'}
                          </p>
                          {att[attDate]?.[currentUser.id]?.reason && (
                            <p className="text-[10px] text-[#888] mt-1 italic">Reason: {att[attDate]?.[currentUser.id]?.reason}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "lg:col-span-2 p-8 rounded-2xl border",
                    theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                  )}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-bold">Monthly Payroll</h3>
                        <p className="text-[10px] text-[#888] uppercase tracking-wider">
                          Period: {format(payrollRange.start, 'MMM dd')} - {format(payrollRange.end, 'MMM dd')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => exportData('payroll-pdf')} className="flex items-center gap-2 bg-[#ff6600] text-white px-4 py-2 rounded-lg text-xs font-bold"><Download size={14} /> PDF</button>
                        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-[#555] text-white px-4 py-2 rounded-lg text-xs font-bold"><RefreshCw size={14} /> Refresh</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[#ff6600] text-[10px] uppercase tracking-wider border-b border-white/5">
                            <th className="pb-4 px-4">Staff Name</th>
                            <th className="pb-4 px-4">Presents</th>
                            <th className="pb-4 px-4">Base</th>
                            <th className="pb-4 px-4">Net Salary</th>
                            <th className="pb-4 px-4">Share</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {staff.filter(e => isAdmin || e.id === currentUser.id).map(e => {
                            let p = 0;
                            let deductibleAbsents = 0;
                            Object.entries(att).forEach(([dateStr, day]) => {
                              if (dateStr >= payrollRange.startStr && dateStr <= payrollRange.endStr) {
                                if (day[e.id]?.status === 'Present') {
                                  p++;
                                } else if (day[e.id]?.status === 'Absent' && day[e.id]?.deduct) {
                                  deductibleAbsents++;
                                }
                              }
                            });
                            const isPermanent = e.type === 'Permanent';
                            const baseSalary = parseInt(e.s) || 0;
                            let total = 0;
                            if (isPermanent) {
                              const dailyRate = Math.round(baseSalary / 30);
                              total = baseSalary - (deductibleAbsents * dailyRate);
                            } else {
                              total = p * baseSalary;
                            }
                            return (
                              <tr key={e.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-4 px-4 font-semibold">
                                  {e.n}
                                  <span className="ml-2 text-[8px] opacity-50 uppercase tracking-tighter">({e.type || 'Daily'})</span>
                                </td>
                                <td className="py-4 px-4">
                                  {isPermanent ? (
                                    <div className="flex flex-col">
                                      <span>Monthly</span>
                                      {deductibleAbsents > 0 && (
                                        <span className="text-[10px] text-[#ff3f34]">-{deductibleAbsents} Deductions</span>
                                      )}
                                    </div>
                                  ) : `${p} Days`}
                                </td>
                                <td className="py-4 px-4">Rs. {e.s}</td>
                                <td className="py-4 px-4 text-[#00ff88] font-bold">Rs. {total}</td>
                                <td className="py-4 px-4">
                                  <button onClick={() => shareWA(e.n, p, total)} className="p-2 bg-[#25D366] text-white rounded hover:opacity-80">
                                    <i className="fab fa-whatsapp text-lg"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'equip' && (
                <div className={cn(
                  "p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold">Inventory Control</h3>
                    <div className="flex gap-2">
                      <button onClick={() => exportData('pdf')} className="flex items-center gap-2 bg-[#555] text-white px-4 py-2 rounded-lg text-xs font-bold"><Printer size={14} /> Print</button>
                      {isAdmin && (
                        <>
                          <button onClick={() => { setModalMode('equip'); setEditId(-1); setIsModalOpen(true); }} className="flex items-center gap-2 bg-[#00f2ff] text-white px-4 py-2 rounded-lg text-xs font-bold"><Plus size={14} /> Hardware</button>
                          <button onClick={() => { setModalMode('lab_sys'); setEditId(-1); setIsModalOpen(true); }} className="flex items-center gap-2 bg-[#ff6600] text-white px-4 py-2 rounded-lg text-xs font-bold"><Plus size={14} /> PC Specs</button>
                          <button onClick={() => { setModalMode('lab_sw'); setEditId(-1); setIsModalOpen(true); }} className="flex items-center gap-2 bg-[#00ff88] text-black px-4 py-2 rounded-lg text-xs font-bold"><Plus size={14} /> Software</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-10">
                    <section>
                      <h4 className="text-[#00f2ff] font-bold mb-4 uppercase text-xs tracking-widest">Hardware Assets</h4>
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn(
                            "text-[10px] uppercase border-b",
                            theme === 'dark' ? "text-[#888] border-white/5" : "text-gray-500 border-gray-200"
                          )}>
                            <th className="pb-4 px-4">Item</th>
                            <th className="pb-4 px-4">Serial</th>
                            <th className="pb-4 px-4">Status</th>
                            <th className="pb-4 px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {filteredEquip.map((x, i) => (
                            <tr key={i} className={cn(
                              "border-b",
                              theme === 'dark' ? "border-white/5" : "border-gray-100"
                            )}>
                              <td className="py-4 px-4 font-semibold">{x.n}</td>
                              <td className="py-4 px-4">{x.s}</td>
                              <td className="py-4 px-4">
                                <span className={cn(
                                  "px-2 py-1 rounded text-[10px] font-bold",
                                  x.st === 'Working' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff3f34]/10 text-[#ff3f34]"
                                )}>{x.st || 'Working'}</span>
                              </td>
                              <td className="py-4 px-4 flex gap-2">
                                {isAdmin && (
                                  <>
                                    <button onClick={() => openEditModal('equip', x)} className="p-1.5 bg-[#ffcc00] text-black rounded"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete('equip', x)} className="p-1.5 bg-[#ff3f34] text-white rounded"><Trash2 size={12} /></button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>

                    <section>
                      <h4 className="text-[#ff6600] font-bold mb-4 uppercase text-xs tracking-widest">PC Specifications</h4>
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn(
                            "text-[10px] uppercase border-b",
                            theme === 'dark' ? "text-[#888] border-white/5" : "text-gray-500 border-gray-200"
                          )}>
                            <th className="pb-4 px-4">PC ID</th>
                            <th className="pb-4 px-4">Gen</th>
                            <th className="pb-4 px-4">RAM</th>
                            <th className="pb-4 px-4">Disk</th>
                            <th className="pb-4 px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {filteredLabSys.map((x, i) => (
                            <tr key={i} className={cn(
                              "border-b",
                              theme === 'dark' ? "border-white/5" : "border-gray-100"
                            )}>
                              <td className="py-4 px-4 font-semibold">{x.id}</td>
                              <td className="py-4 px-4">{x.gen}</td>
                              <td className="py-4 px-4">{x.ram}</td>
                              <td className="py-4 px-4">{x.disk}</td>
                              <td className="py-4 px-4 flex gap-2">
                                {isAdmin && (
                                  <>
                                    <button onClick={() => openEditModal('lab_sys', x)} className="p-1.5 bg-[#ffcc00] text-black rounded"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete('lab_sys', x)} className="p-1.5 bg-[#ff3f34] text-white rounded"><Trash2 size={12} /></button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>

                    <section>
                      <h4 className="text-[#00ff88] font-bold mb-4 uppercase text-xs tracking-widest">Software Inventory</h4>
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn(
                            "text-[10px] uppercase border-b",
                            theme === 'dark' ? "text-[#888] border-white/5" : "text-gray-500 border-gray-200"
                          )}>
                            <th className="pb-4 px-4">Software Name</th>
                            <th className="pb-4 px-4">Version</th>
                            <th className="pb-4 px-4">PC ID</th>
                            <th className="pb-4 px-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {filteredLabSw.map((x, i) => (
                            <tr key={i} className={cn(
                              "border-b",
                              theme === 'dark' ? "border-white/5" : "border-gray-100"
                            )}>
                              <td className="py-4 px-4 font-semibold">{x.name}</td>
                              <td className="py-4 px-4">{x.ver}</td>
                              <td className="py-4 px-4">{x.pc}</td>
                              <td className="py-4 px-4 flex gap-2">
                                {isAdmin && (
                                  <>
                                    <button onClick={() => openEditModal('lab_sw', x)} className="p-1.5 bg-[#ffcc00] text-black rounded"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDelete('lab_sw', x)} className="p-1.5 bg-[#ff3f34] text-white rounded"><Trash2 size={12} /></button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  </div>
                </div>
              )}

              {activeTab === 'comp' && (
                <div className={cn(
                  "p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Complaint Tracker</h3>
                    <button 
                      onClick={() => { setModalMode('comp'); setEditId(-1); setIsModalOpen(true); }}
                      className="flex items-center gap-2 bg-[#00f2ff] text-white px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      <Plus size={14} /> New Entry
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#ff6600] text-[10px] uppercase tracking-wider border-b border-white/5">
                          <th className="pb-4 px-4">Issue Description</th>
                          <th className="pb-4 px-4">Assigned To</th>
                          <th className="pb-4 px-4">Priority</th>
                          <th className="pb-4 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredComp.map((x, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-4 px-4">{x.d}</td>
                            <td className="py-4 px-4 font-semibold">{x.a}</td>
                            <td className="py-4 px-4">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold",
                                x.p === 'Critical' ? "bg-[#ff3f34]/10 text-[#ff3f34]" : 
                                x.p === 'High' ? "bg-[#ff6600]/10 text-[#ff6600]" : "bg-[#00f2ff]/10 text-[#00f2ff]"
                              )}>{x.p || 'Low'}</span>
                            </td>
                            <td className="py-4 px-4 flex gap-2">
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEditModal('comp', x)} className="p-2 bg-[#ffcc00] text-black rounded"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDelete('comp', x)} className="p-2 bg-[#ff3f34] text-white rounded"><Trash2 size={14} /></button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'sched' && (
                <div className={cn(
                  "p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Lab Schedule</h3>
                    <button 
                      onClick={() => { setModalMode('sched'); setEditId(-1); setIsModalOpen(true); }}
                      className="flex items-center gap-2 bg-[#00f2ff] text-white px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      <Plus size={14} /> Add Session
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[#ff6600] text-[10px] uppercase tracking-wider border-b border-white/5">
                          <th className="pb-4 px-4">Day</th>
                          <th className="pb-4 px-4">Time</th>
                          <th className="pb-4 px-4">Subject</th>
                          <th className="pb-4 px-4">Instructor</th>
                          <th className="pb-4 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredSched.map((x, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-4 px-4 font-bold">{x.day}</td>
                            <td className="py-4 px-4 text-[#00f2ff]">{x.st} - {x.et}</td>
                            <td className="py-4 px-4 font-semibold">{x.sub}</td>
                            <td className="py-4 px-4">{x.inst}</td>
                            <td className="py-4 px-4 flex gap-2">
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEditModal('sched', x)} className="p-2 bg-[#ffcc00] text-black rounded"><Edit2 size={14} /></button>
                                  <button onClick={() => handleDelete('sched', x)} className="p-2 bg-[#ff3f34] text-white rounded"><Trash2 size={14} /></button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className={cn(
                  "p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <h3 className="text-xl font-bold mb-6">Cloud Export Center</h3>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => exportData('excel')}
                      className="flex items-center gap-3 bg-[#1D6F42] text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
                    >
                      <Download size={20} /> Export to Excel
                    </button>
                    <button 
                      onClick={() => exportData('pdf')}
                      className="flex items-center gap-3 bg-[#E74C3C] text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
                    >
                      <Download size={20} /> Export to PDF
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className={cn(
                  "p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Staff Notes & Communication</h3>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button 
                          onClick={() => { setSelectedNote(null); setNoteText(''); setNoteTarget('all'); setIsNoteModalOpen(true); }}
                          className="flex items-center gap-2 bg-[#00ff88] text-black px-4 py-2 rounded-lg text-xs font-bold"
                        >
                          <Plus size={14} /> Admin Note
                        </button>
                      )}
                      {!isAdmin && (
                        <button 
                          onClick={() => { setSelectedNote(null); setNoteText(''); setIsNoteModalOpen(true); }}
                          className="flex items-center gap-2 bg-[#00f2ff] text-white px-4 py-2 rounded-lg text-xs font-bold"
                        >
                          <Plus size={14} /> Leave a Note
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {notes.filter(n => {
                      if (isAdmin) return true; // Admin sees everything
                      if (n.staffId === currentUser.id) return true; // Staff sees their own notes
                      if (n.targetStaffId === currentUser.id || n.targetStaffId === 'all') {
                        // Staff sees notes targeted at them from admin
                        const isFromAdmin = staff.find(s => s.id === n.staffId)?.r === 'Admin';
                        return isFromAdmin;
                      }
                      return false;
                    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(note => {
                      const noteAuthor = staff.find(s => s.id === note.staffId);
                      const replyAuthor = note.replyStaffId ? staff.find(s => s.id === note.replyStaffId) : staff.find(s => s.r === 'Admin');
                      
                      return (
                        <div key={note.id} className={cn(
                          "p-6 rounded-2xl border transition-all relative group",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200"
                        )}>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              {noteAuthor?.pic ? (
                                <img 
                                  src={noteAuthor.pic} 
                                  alt={note.staffName} 
                                  className="w-10 h-10 rounded-full object-cover border-2 border-[#00f2ff]/20"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase",
                                  noteAuthor?.r === 'Admin' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#00f2ff]/10 text-[#00f2ff]"
                                )}>
                                  {note.staffName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold">{note.staffName} <span className="text-[10px] opacity-50 font-normal">({note.staffId})</span></p>
                                  {note.targetStaffId && (
                                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-[#888] uppercase tracking-tighter">
                                      To: {note.targetStaffId === 'all' ? 'Everyone' : staff.find(s => s.id === note.targetStaffId)?.n || 'Unknown'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-[#888]">{format(new Date(note.timestamp), 'PPpp')}</p>
                                  {note.editedTimestamp && (
                                    <div className="flex items-center gap-2">
                                      <p className="text-[9px] text-[#00f2ff] italic">Edited: {format(new Date(note.editedTimestamp), 'PPpp')}</p>
                                      {isAdmin && (
                                        <button 
                                          onClick={() => {
                                            setHistoryToShow(note.history || []);
                                            setHistoryTitle('Note Edit History');
                                            setIsHistoryModalOpen(true);
                                          }}
                                          className="text-[8px] bg-[#00f2ff]/10 text-[#00f2ff] px-1 rounded hover:bg-[#00f2ff]/20 transition-colors"
                                        >
                                          HISTORY
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {isAdmin && !note.reply && note.staffId !== currentUser.id && (
                                <button 
                                  onClick={() => { setSelectedNote(note); setReplyText(''); setIsNoteModalOpen(true); }}
                                  className="text-[10px] font-bold text-[#00f2ff] uppercase tracking-widest hover:underline"
                                >
                                  Reply
                                </button>
                              )}
                              {(note.staffId === currentUser.id) && !note.reply && (
                                <button 
                                  onClick={() => { setSelectedNote(note); setNoteText(note.text); setIsNoteModalOpen(true); }}
                                  className="text-[10px] font-bold text-[#ffcc00] uppercase tracking-widest hover:underline"
                                >
                                  Edit
                                </button>
                              )}
                              {(isAdmin || note.staffId === currentUser.id) && (
                                <button 
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="text-[10px] font-bold text-[#ff3f34] uppercase tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <p className={cn(
                            "text-sm leading-relaxed mb-4",
                            noteAuthor?.r === 'Admin' ? "text-[#00ff88] font-medium" : ""
                          )}>{note.text}</p>
                          
                          {note.reply && (
                            <div className={cn(
                              "mt-4 p-4 rounded-xl border-l-4 border-[#00ff88]",
                              theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-gray-100"
                            )}>
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  {replyAuthor?.pic ? (
                                    <img 
                                      src={replyAuthor.pic} 
                                      alt={replyAuthor.n} 
                                      className="w-6 h-6 rounded-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#00ff88]/20 flex items-center justify-center text-[10px] font-bold text-[#00ff88] uppercase">
                                      {(replyAuthor?.n || 'Admin').charAt(0)}
                                    </div>
                                  )}
                                  <p className="text-[10px] font-bold text-[#00ff88] uppercase tracking-widest">Admin {replyAuthor?.n || 'Admin'} Reply</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {isAdmin && note.isClosed && (
                                    <button 
                                      onClick={() => {
                                        const updatedNotes = notes.map(n => n.id === note.id ? { ...n, isClosed: false } : n);
                                        setNotes(updatedNotes);
                                        syncToGoogle('note_reopen', { id: note.id });
                                      }}
                                      className="text-[9px] font-bold text-[#00ff88] uppercase tracking-widest hover:underline"
                                    >
                                      Reopen Conversation
                                    </button>
                                  )}
                                  {isAdmin && !note.isClosed && (
                                    <button 
                                      onClick={() => {
                                        const updatedNotes = notes.map(n => n.id === note.id ? { ...n, isClosed: true } : n);
                                        setNotes(updatedNotes);
                                        syncToGoogle('note_close', { id: note.id });
                                      }}
                                      className="text-[9px] font-bold text-[#ff4444] uppercase tracking-widest hover:underline"
                                    >
                                      Close Conversation
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button 
                                      onClick={() => { setSelectedNote(note); setReplyText(note.reply || ''); setIsNoteModalOpen(true); }}
                                      className="text-[9px] font-bold text-[#ffcc00] uppercase tracking-widest hover:underline"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {!isAdmin && note.staffId === currentUser.id && note.reply && !note.isClosed && (
                                    <button 
                                      onClick={() => { setSelectedNote(note); setReplyText(note.staffReply || ''); setIsNoteModalOpen(true); }}
                                      className="text-[9px] font-bold text-[#00f2ff] uppercase tracking-widest hover:underline"
                                    >
                                      Reply to Admin
                                    </button>
                                  )}
                                  <div className="flex flex-col items-end">
                                    <p className="text-[10px] text-[#888]">{note.replyTimestamp ? format(new Date(note.replyTimestamp), 'PPpp') : ''}</p>
                                    {isAdmin && note.replyEditedTimestamp && (
                                      <div className="flex items-center gap-2">
                                        <p className="text-[9px] text-[#00ff88] italic">Edited: {format(new Date(note.replyEditedTimestamp), 'PPpp')}</p>
                                        <button 
                                          onClick={() => {
                                            setHistoryToShow(note.replyHistory || []);
                                            setHistoryTitle('Reply Edit History');
                                            setIsHistoryModalOpen(true);
                                          }}
                                          className="text-[8px] bg-[#00ff88]/10 text-[#00ff88] px-1 rounded hover:bg-[#00ff88]/20 transition-colors"
                                        >
                                          HISTORY
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm italic">{note.reply}</p>
                            </div>
                          )}

                          {note.staffReply && (
                            <div className={cn(
                              "mt-4 p-4 rounded-xl border-l-4 border-[#00f2ff]",
                              theme === 'dark' ? "bg-white/5 border-white/5" : "bg-white border-gray-100"
                            )}>
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  {noteAuthor?.pic ? (
                                    <img 
                                      src={noteAuthor.pic} 
                                      alt={noteAuthor.n} 
                                      className="w-6 h-6 rounded-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-[#00f2ff]/20 flex items-center justify-center text-[10px] font-bold text-[#00f2ff] uppercase">
                                      {(noteAuthor?.n || note.staffName || 'Staff').charAt(0)}
                                    </div>
                                  )}
                                  <p className="text-[10px] font-bold text-[#00f2ff] uppercase tracking-widest">{noteAuthor?.n || 'Staff'} Reply</p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <p className="text-[10px] text-[#888]">{note.staffReplyTimestamp ? format(new Date(note.staffReplyTimestamp), 'PPpp') : ''}</p>
                                </div>
                              </div>
                              <p className="text-sm italic">{note.staffReply}</p>
                            </div>
                          )}

                          {note.isClosed && (
                            <div className="mt-4 p-2 rounded-lg bg-[#ff4444]/10 border border-[#ff4444]/20 text-center">
                              <p className="text-[10px] font-bold text-[#ff4444] uppercase tracking-widest">Conversation Closed by Admin</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {notes.filter(n => {
                      if (isAdmin) return true;
                      if (n.staffId === currentUser.id) return true;
                      if (n.targetStaffId === currentUser.id || n.targetStaffId === 'all') {
                        const isFromAdmin = staff.find(s => s.id === n.staffId)?.r === 'Admin';
                        return isFromAdmin;
                      }
                      return false;
                    }).length === 0 && (
                      <div className="text-center py-12 text-[#888]">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No notes found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "relative w-full max-w-lg p-8 rounded-3xl border shadow-2xl",
                theme === 'dark' ? "bg-[#0d0d15] border-[#00f2ff]/30" : "bg-white border-gray-200"
              )}
            >
              <h3 className="text-2xl font-bold text-[#00f2ff] mb-6 uppercase tracking-wider">
                {editId === -1 ? "New" : "Edit"} {modalMode.replace('_', ' ')}
              </h3>
              
              <ModalForm 
                mode={modalMode} 
                initialData={editId === -1 ? null : (modalMode === 'staff' ? staff[editId] : modalMode === 'equip' ? equip[editId] : modalMode === 'lab_sys' ? labSys[editId] : modalMode === 'lab_sw' ? labSw[editId] : modalMode === 'comp' ? comp[editId] : sched[editId])}
                onSave={handleSave}
                onCancel={() => setIsModalOpen(false)}
                theme={theme}
              />
            </motion.div>
          </div>
        )}

        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-sm p-8 rounded-3xl border shadow-2xl text-center",
                theme === 'dark' ? "bg-[#0d0d15] border-white/10" : "bg-white border-gray-200"
              )}
            >
              <div className="mb-6">
                {confirmAction?.type === 'duplicate_error' ? (
                  <AlertTriangle size={48} className="mx-auto text-[#ff3f34] mb-4" />
                ) : (
                  <Trash2 size={48} className="mx-auto text-[#ff3f34] mb-4" />
                )}
                <h3 className="text-xl font-bold mb-2">
                  {confirmAction?.type === 'duplicate_error' ? "Duplicate ID Error" : "Confirm Action"}
                </h3>
                <p className="text-sm text-[#888]">
                  {confirmAction?.type === 'duplicate_error' 
                    ? "⛔ This ID is already assigned to another staff member. Please use a unique ID." 
                    : "Are you sure you want to delete this record? This action cannot be undone."}
                </p>
              </div>
              <div className="flex gap-4">
                {confirmAction?.type === 'duplicate_error' ? (
                  <button 
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="flex-1 py-3 bg-[#00f2ff] text-white font-bold rounded-xl"
                  >
                    OK, I'LL FIX IT
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={executeDelete}
                      className="flex-1 py-3 bg-[#ff3f34] text-white font-bold rounded-xl"
                    >
                      DELETE
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isReasonModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-sm p-8 rounded-3xl border shadow-2xl",
                theme === 'dark' ? "bg-[#0d0d15] border-white/10" : "bg-white border-gray-200"
              )}
            >
              <h3 className="text-xl font-bold mb-4">Reason for Absence</h3>
              <textarea 
                className={cn(
                  "w-full p-4 rounded-xl outline-none border mb-6 h-32 resize-none",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200"
                )}
                placeholder="Enter reason for absence..."
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
              />
              
              {staff.find(s => s.id === reasonStaffId)?.type === 'Permanent' && (
                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-[#ff3f34]/10 border border-[#ff3f34]/20">
                  <input 
                    type="checkbox" 
                    id="deductSalary"
                    checked={deductSalary}
                    onChange={(e) => setDeductSalary(e.target.checked)}
                    className="w-5 h-5 accent-[#ff3f34]"
                  />
                  <label htmlFor="deductSalary" className="text-sm font-bold text-[#ff3f34] cursor-pointer">
                    Deduct Salary for this day?
                  </label>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsReasonModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold"
                >
                  CANCEL
                </button>
                <button 
                  onClick={saveAbsenceReason}
                  className="flex-1 py-3 bg-[#ff3f34] text-white font-bold rounded-xl"
                >
                  SAVE ABSENCE
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsProfileModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-sm p-8 rounded-3xl border shadow-2xl overflow-hidden",
                theme === 'dark' ? "bg-[#0d0d15] border-white/10" : "bg-white border-gray-200"
              )}
            >
              {imageToCrop ? (
                <div className="h-[400px] relative">
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                    onZoomChange={setZoom}
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                    <button 
                      onClick={() => setImageToCrop(null)}
                      className="flex-1 py-2 bg-white/10 backdrop-blur-md text-white rounded-lg font-bold text-xs"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={async () => {
                        if (croppedAreaPixels) {
                          const cropped = await getCroppedImg(imageToCrop, croppedAreaPixels);
                          setProfilePicUrl(cropped);
                          setImageToCrop(null);
                        }
                      }}
                      className="flex-1 py-2 bg-[#00f2ff] text-white rounded-lg font-bold text-xs"
                    >
                      CROP & USE
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-4">Update Profile Picture</h3>
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-[#888] uppercase mb-2">Upload from PC</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      id="profile-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setImageToCrop(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label 
                      htmlFor="profile-upload"
                      className={cn(
                        "w-full p-4 rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors",
                        theme === 'dark' ? "border-white/20" : "border-gray-300"
                      )}
                    >
                      <Plus size={24} className="mb-2 text-[#888]" />
                      <span className="text-xs font-bold text-[#888]">SELECT IMAGE</span>
                    </label>
                  </div>
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-[#888] uppercase mb-2">Or Paste URL / GDrive Link</label>
                    <input 
                      type="text" 
                      className={cn(
                        "w-full p-4 rounded-xl outline-none border",
                        theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200"
                      )}
                      placeholder="https://example.com/image.jpg"
                      value={profilePicUrl}
                      onChange={(e) => setProfilePicUrl(convertGDriveLink(e.target.value))}
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsProfileModalOpen(false)}
                      className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={() => {
                        const updatedUser = { ...currentUser, pic: profilePicUrl };
                        const newStaff = staff.map(s => s.id === currentUser.id ? updatedUser : s);
                        setStaff(newStaff);
                        setCurrentUser(updatedUser);
                        syncToGoogle('staff', updatedUser);
                        setIsProfileModalOpen(false);
                      }}
                      className="flex-1 py-3 bg-[#00f2ff] text-white font-bold rounded-xl"
                    >
                      UPDATE
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsHistoryModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-md p-8 rounded-3xl border shadow-2xl max-h-[80vh] overflow-y-auto",
                theme === 'dark' ? "bg-[#0d0d15] border-white/10" : "bg-white border-gray-200"
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{historyTitle}</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-[#888] hover:text-white transition-colors">
                  <LogOut size={20} className="rotate-180" />
                </button>
              </div>
              <div className="space-y-6">
                {historyToShow.length === 0 ? (
                  <p className="text-center text-[#888] py-8 italic">No edit history found.</p>
                ) : (
                  historyToShow.slice().reverse().map((item, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-[#00f2ff]/30">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-[#00f2ff]" />
                      <p className="text-[10px] font-bold text-[#888] uppercase mb-2">
                        {format(new Date(item.timestamp), 'PPpp')}
                      </p>
                      <div className={cn(
                        "p-4 rounded-xl text-sm italic",
                        theme === 'dark' ? "bg-white/5" : "bg-gray-50"
                      )}>
                        "{item.text}"
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsNoteModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "relative w-full max-w-md p-8 rounded-3xl border shadow-2xl",
                theme === 'dark' ? "bg-[#0d0d15] border-white/10" : "bg-white border-gray-200"
              )}
            >
              <h3 className="text-xl font-bold mb-6">
                {(selectedNote && selectedNote.staffId !== currentUser.id) || (!isAdmin && selectedNote?.reply) ? "Reply to Admin" : 
                 selectedNote ? "Edit Note" : 
                 isAdmin ? "Send Note to Staff" : "Leave a Note for Admin"}
              </h3>
              
              {selectedNote && selectedNote.staffId !== currentUser.id && (
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 text-sm italic text-[#888]">
                  "{selectedNote.text}"
                </div>
              )}

              {!isAdmin && selectedNote?.reply && (
                <div className="mb-6 p-4 rounded-xl bg-[#00ff88]/5 border border-[#00ff88]/20 text-sm italic text-[#00ff88]">
                  Admin: "{selectedNote.reply}"
                </div>
              )}

              {isAdmin && !selectedNote && (
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-[#888] uppercase mb-2 block">Target Staff</label>
                  <select 
                    className={cn(
                      "w-full p-4 rounded-xl outline-none border [&>option]:bg-[#151619]",
                      theme === 'dark' ? "bg-[#151619] border-white/10 text-white" : "bg-gray-50 border-gray-200 text-black"
                    )}
                    value={noteTarget}
                    onChange={(e) => setNoteTarget(e.target.value)}
                  >
                    <option value="all">All Staff Members</option>
                    {staff.filter(s => s.r !== 'Admin').map(s => (
                      <option key={s.id} value={s.id}>{s.n} ({s.id})</option>
                    ))}
                  </select>
                </div>
              )}

              <textarea 
                className={cn(
                  "w-full p-4 rounded-xl outline-none border mb-6 h-40 resize-none",
                  theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200"
                )}
                placeholder={(selectedNote && selectedNote.staffId !== currentUser.id) || (!isAdmin && selectedNote?.reply) ? "Type your reply..." : "Type your note here..."}
                value={(selectedNote && selectedNote.staffId !== currentUser.id) || (!isAdmin && selectedNote?.reply) ? replyText : noteText}
                onChange={(e) => (selectedNote && selectedNote.staffId !== currentUser.id) || (!isAdmin && selectedNote?.reply) ? setReplyText(e.target.value) : setNoteText(e.target.value)}
              />
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                    if (selectedNote && selectedNote.staffId !== currentUser.id) {
                      // Admin Reply or Edit Reply
                      const isEdit = !!selectedNote.reply;
                      const updatedNotes = notes.map(n => n.id === selectedNote.id ? {
                        ...n,
                        reply: replyText,
                        replyStaffId: currentUser.id,
                        replyTimestamp: isEdit ? n.replyTimestamp : new Date().toISOString(),
                        replyEditedTimestamp: isEdit ? new Date().toISOString() : n.replyEditedTimestamp,
                        replyHistory: isEdit ? [...(n.replyHistory || []), { text: n.reply || '', timestamp: n.replyEditedTimestamp || n.replyTimestamp || new Date().toISOString() }] : n.replyHistory,
                        isRead: false
                      } : n);
                      setNotes(updatedNotes);
                      syncToGoogle(isEdit ? 'note_reply_edit' : 'note_reply', { 
                        id: selectedNote.id, 
                        reply: replyText, 
                        replyStaffId: currentUser.id,
                        replyEditedTimestamp: isEdit ? new Date().toISOString() : undefined,
                        replyHistory: isEdit ? updatedNotes.find(un => un.id === selectedNote.id)?.replyHistory : undefined
                      });
                    } else if (selectedNote) {
                      if (!isAdmin && selectedNote.reply) {
                        // Staff Reply to Admin
                        const updatedNotes = notes.map(n => n.id === selectedNote.id ? {
                          ...n,
                          staffReply: replyText,
                          staffReplyTimestamp: new Date().toISOString(),
                          isRead: false
                        } : n);
                        setNotes(updatedNotes);
                        syncToGoogle('note_staff_reply', { id: selectedNote.id, staffReply: replyText });
                      } else {
                        // Edit Note
                        const updatedNotes = notes.map(n => n.id === selectedNote.id ? {
                          ...n,
                          text: noteText,
                          editedTimestamp: new Date().toISOString(),
                          history: [...(n.history || []), { text: n.text, timestamp: n.editedTimestamp || n.timestamp }]
                        } : n);
                        setNotes(updatedNotes);
                        syncToGoogle('note_edit', { 
                          id: selectedNote.id, 
                          text: noteText,
                          history: updatedNotes.find(un => un.id === selectedNote.id)?.history
                        });
                      }
                    } else {
                      // New Note
                      const newNote: Note = {
                        id: Math.random().toString(36).substr(2, 9),
                        staffId: currentUser.id,
                        staffName: currentUser.n,
                        text: noteText,
                        timestamp: new Date().toISOString(),
                        targetStaffId: isAdmin ? noteTarget : undefined,
                        isRead: false
                      };
                      setNotes([newNote, ...notes]);
                      syncToGoogle('note_create', newNote);
                    }
                    setIsNoteModalOpen(false);
                  }}
                  className="flex-1 py-3 bg-[#00f2ff] text-white font-bold rounded-xl"
                >
                  {(selectedNote && selectedNote.staffId !== currentUser.id) || (!isAdmin && selectedNote?.reply) ? "SEND REPLY" : 
                   selectedNote ? "UPDATE NOTE" : "SUBMIT NOTE"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {showNotification && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed bottom-8 right-8 z-[3000] p-6 rounded-2xl bg-[#00f2ff] text-white shadow-2xl flex items-center gap-4 cursor-pointer"
              onClick={() => { setActiveTab('notes'); setShowNotification(false); markNotesAsRead(); }}
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="font-bold">New Notifications</p>
                <p className="text-xs opacity-80">You have {notificationCount} unread notes/replies.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

function Login({ onLogin, theme, staff, setStaff }: { onLogin: (id: string, pass: string) => boolean, theme: string, staff: Staff[], setStaff: React.Dispatch<React.SetStateAction<Staff[]>> }) {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({
    show: false,
    type: 'success',
    message: ''
  });
  
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [changePassStaffId, setChangePassStaffId] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleAuth = () => {
    if (!id || !pass) {
      setStatusModal({ show: true, type: 'error', message: "Please enter credentials" });
      return;
    }

    setIsLoading(true);
    setShowError(false);

    // Simulate verification delay
    setTimeout(() => {
      const success = onLogin(id, pass);
      setIsLoading(false);
      
      if (!success) {
        setShowError(true);
      }
    }, 1500);
  };

  const handleChangePassword = () => {
    if (!changePassStaffId.trim() || !oldPassword.trim() || !newPassword.trim()) {
      setStatusModal({ show: true, type: 'error', message: 'Please fill all fields' });
      return;
    }
    
    const staffMember = staff.find(s => String(s.id) === String(changePassStaffId));
    
    if (!staffMember) {
      setStatusModal({ show: true, type: 'error', message: 'Staff ID not found' });
      return;
    }
    
    if (String(staffMember.p) !== String(oldPassword)) {
      setStatusModal({ show: true, type: 'error', message: 'Old password is incorrect' });
      return;
    }

    setStaff(prev => {
      const newStaff = prev.map(s => String(s.id) === String(changePassStaffId) ? { ...s, p: newPassword } : s);
      localStorage.setItem('erp_staff', JSON.stringify(newStaff));
      return newStaff;
    });
    
    setIsChangePassModalOpen(false);
    setChangePassStaffId('');
    setOldPassword('');
    setNewPassword('');
    setStatusModal({ show: true, type: 'success', message: 'Password updated successfully!' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#f1f5f9] to-[#cbd5e1] font-sans text-[#0f172a]">
      {/* Loader Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/85 backdrop-blur-md z-[2000] flex flex-col items-center justify-center"
          >
            <div className="w-[50px] h-[50px] border-[5px] border-[#e2e8f0] border-t-[#2563eb] rounded-full animate-spin-slow" />
            <div className="mt-[15px] font-bold text-[#2563eb] text-[12px] tracking-[1px] uppercase">VERIFYING SECURITY...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background Shapes */}
      <div className="absolute -z-10 blur-[80px] rounded-full w-[400px] h-[400px] bg-blue-500/10 -top-[100px] -right-[50px] animate-move" />
      <div className="absolute -z-10 blur-[80px] rounded-full w-[350px] h-[350px] bg-purple-500/10 -bottom-[50px] -left-[50px] animate-move" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card animate-slide-up"
      >
        <div className="text-center mb-[30px]">
          <div className="brand-icon">
            <i className="fas fa-layer-group"></i>
          </div>
          <h2 className="text-[22px] font-bold">SK-OS TITAN ERP</h2>
          <p className="text-[13px] text-[#64748b]">Enterprise Access Terminal</p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {showError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-500/10 border border-[#ff3f34] text-[#ff3f34] p-3 rounded-xl mb-5 text-[13px] font-semibold flex items-center justify-center gap-2 animate-shake"
            >
              <i className="fas fa-times-circle"></i> Access Denied: Invalid Credentials
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5">
          <div className="relative">
            <i className="fas fa-user-circle absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]"></i>
            <input 
              type="text" 
              placeholder="Staff ID or Name" 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#e2e8f0] rounded-xl text-[15px] outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>

          <div className="relative">
            <i className="fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]"></i>
            <input 
              type={showPass ? "text" : "password"} 
              placeholder="Passkey" 
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#e2e8f0] rounded-xl text-[15px] outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <i 
              className={cn("fas absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] cursor-pointer", showPass ? "fa-eye-slash" : "fa-eye")}
              onClick={() => setShowPass(!showPass)}
            ></i>
          </div>

          <button 
            onClick={handleAuth}
            className="w-full py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            Authorize & Sign In
          </button>
        </div>

        <div className="mt-[25px] text-center text-[14px] text-[#64748b] flex flex-col gap-2">
          <div>
            Forgot Password? <span className="text-[#2563eb] font-semibold cursor-pointer" onClick={() => setIsSupportModalOpen(true)}>Get Help</span>
          </div>
          <div className="text-[12px]">
            want to change password? <span className="text-[#ff6600] font-semibold cursor-pointer" onClick={() => setIsChangePassModalOpen(true)}>change password</span>
          </div>
        </div>
      </motion.div>

      {/* Status Modal */}
      <AnimatePresence>
        {statusModal.show && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatusModal({ ...statusModal, show: false })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-8 rounded-[32px] w-full max-w-[350px] text-center shadow-2xl"
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                statusModal.type === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              )}>
                {statusModal.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800">
                {statusModal.type === 'success' ? 'Success' : 'Attention'}
              </h3>
              <p className="text-sm text-slate-500 mb-6">{statusModal.message}</p>
              <button 
                onClick={() => setStatusModal({ ...statusModal, show: false })}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-white transition-all",
                  statusModal.type === 'success' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                CONTINUE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {isSupportModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSupportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-[30px] rounded-[24px] w-[350px] text-center shadow-2xl"
            >
              <i className="fas fa-user-shield text-[40px] text-[#2563eb] mb-[15px]"></i>
              <h3 className="text-lg font-bold mb-[10px]">Support Terminal</h3>
              <p className="text-[12px] text-[#64748b] mb-[20px]">
                Contact Shahan Khan for assistance or password recovery. 
              </p>
              
              <a href="https://wa.me/923178973735" className="contact-btn" target="_blank" rel="noreferrer">
                <i className="fab fa-whatsapp text-[#25D366] text-[20px]"></i> WhatsApp Support
              </a>
              
              <a href="mailto:shahanullah@imsciences.edu.pk" className="contact-btn">
                <i className="fas fa-envelope text-[#ea4335] text-[20px]"></i> Official Email
              </a>

              <a href="https://facebook.com/shahanullah890" className="contact-btn" target="_blank" rel="noreferrer">
                <i className="fab fa-facebook text-[#1877f2] text-[20px]"></i> Facebook Profile
              </a>

              <button 
                onClick={() => setIsSupportModalOpen(false)}
                className="mt-[15px] border-none bg-none text-[#64748b] cursor-pointer text-[13px] underline"
              >
                Return to Login
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangePassModalOpen && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-8 rounded-[32px] w-full max-w-[400px] shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2 text-slate-800">Change Password</h3>
              <p className="text-xs text-slate-500 mb-6">Verify your identity to update your password.</p>
              
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:border-[#2563eb] transition-all"
                    placeholder="Staff ID"
                    value={changePassStaffId}
                    onChange={(e) => setChangePassStaffId(e.target.value)}
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:border-[#2563eb] transition-all"
                    placeholder="Old Password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff6600]" size={18} />
                  <input 
                    type="password"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl outline-none border border-slate-200 bg-slate-50 text-slate-800 focus:border-[#ff6600] transition-all"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIsChangePassModalOpen(false);
                    setChangePassStaffId('');
                    setOldPassword('');
                    setNewPassword('');
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleChangePassword}
                  className="flex-1 py-3 bg-[#2563eb] text-white font-bold rounded-xl hover:bg-[#1d4ed8] transition-colors shadow-lg shadow-blue-200"
                >
                  UPDATE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-[#0078d4]/10 text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.1)]" 
          : "text-[#888] hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn("transition-transform duration-200", active && "scale-110")}>{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, color, onClick, theme }: { icon: React.ReactNode, label: string, value: number, color: string, onClick?: () => void, theme: string }) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-3xl border overflow-hidden cursor-pointer group transition-all duration-500",
        theme === 'dark' 
          ? "bg-[#0d0d15] border-white/5 hover:border-white/20 shadow-2xl hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]" 
          : "bg-white border-gray-200 hover:border-[#00f2ff]/50 shadow-lg hover:shadow-[0_0_30px_rgba(0,242,255,0.1)]"
      )}
      style={{
        boxShadow: theme === 'dark' ? `0 0 20px ${color}11` : `0 10px 20px rgba(0,0,0,0.05)`
      }}
    >
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl pointer-events-none"
        style={{ backgroundColor: color }}
      />
      
      <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-40 transition-all duration-500 scale-150 group-hover:scale-[2] rotate-12 group-hover:rotate-0">
        {icon}
      </div>
      
      <h4 className="text-[10px] uppercase text-[#888] font-bold tracking-widest mb-2 relative z-10">{label}</h4>
      <h2 className="text-4xl font-['JetBrains_Mono'] font-bold relative z-10" style={{ 
        color,
        textShadow: theme === 'dark' ? `0 0 15px ${color}44` : `0 0 10px ${color}22`
      }}>{value}</h2>
      
      <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '85%' }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ 
            backgroundColor: color, 
            boxShadow: `0 0 20px ${color}` 
          }}
        />
      </div>
      
      {/* Animated Border Glow */}
      <motion.div 
        animate={{
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 border-2 rounded-3xl pointer-events-none"
        style={{ borderColor: `${color}22` }}
      />
    </motion.div>
  );
}

function ModalForm({ mode, initialData, onSave, onCancel, theme }: { mode: string, initialData: any, onSave: (data: any) => void, onCancel: () => void, theme: string }) {
  const [formData, setFormData] = useState(initialData || {});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputClass = cn(
    "w-full p-3 rounded-xl outline-none border transition-all duration-200 [&>option]:bg-[#151619]",
    theme === 'dark' 
      ? "bg-[#151619] border-white/10 text-white focus:border-[#00f2ff]" 
      : "bg-gray-50 border-gray-200 text-black focus:border-[#00f2ff]"
  );

  return (
    <div className="space-y-4">
      {mode === 'staff' && (
        <>
          <input name="id" placeholder="Staff ID" className={inputClass} value={formData.id || ''} onChange={handleChange} />
          <input name="n" placeholder="Full Name" className={inputClass} value={formData.n || ''} onChange={handleChange} />
          <select name="r" className={inputClass} value={formData.r || 'Staff'} onChange={handleChange}>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </select>
          <select name="type" className={inputClass} value={formData.type || 'Daily'} onChange={handleChange}>
            <option value="Daily">Daily Wage</option>
            <option value="Permanent">Permanent</option>
          </select>
          <input name="lab" placeholder="Assigned Lab Name (Optional)" className={inputClass} value={formData.lab || ''} onChange={handleChange} />
          <input name="s" type="number" placeholder="Base Salary (Daily or Monthly)" className={inputClass} value={formData.s || ''} onChange={handleChange} />
          <input name="p" placeholder="Passkey" className={inputClass} value={formData.p || ''} onChange={handleChange} />
        </>
      )}

      {mode === 'equip' && (
        <>
          <input name="n" placeholder="Item Name" className={inputClass} value={formData.n || ''} onChange={handleChange} />
          <input name="s" placeholder="Serial Number" className={inputClass} value={formData.s || ''} onChange={handleChange} />
          <select name="st" className={inputClass} value={formData.st || 'Working'} onChange={handleChange}>
            <option value="Working">Working</option>
            <option value="Faulty">Faulty</option>
          </select>
        </>
      )}

      {mode === 'lab_sys' && (
        <>
          <input name="id" placeholder="PC ID" className={inputClass} value={formData.id || ''} onChange={handleChange} />
          <input name="gen" placeholder="Generation" className={inputClass} value={formData.gen || ''} onChange={handleChange} />
          <input name="ram" placeholder="RAM" className={inputClass} value={formData.ram || ''} onChange={handleChange} />
          <input name="disk" placeholder="Storage (SSD/HDD)" className={inputClass} value={formData.disk || ''} onChange={handleChange} />
          <input name="count" type="number" placeholder="Quantity" className={inputClass} value={formData.count || ''} onChange={handleChange} />
        </>
      )}

      {mode === 'lab_sw' && (
        <>
          <input name="name" placeholder="Software Name" className={inputClass} value={formData.name || ''} onChange={handleChange} />
          <input name="ver" placeholder="Version" className={inputClass} value={formData.ver || ''} onChange={handleChange} />
          <input name="pc" placeholder="PC ID" className={inputClass} value={formData.pc || ''} onChange={handleChange} />
        </>
      )}

      {mode === 'lab_equip' && (
        <>
          <input name="name" placeholder="Equipment Name" className={inputClass} value={formData.name || ''} onChange={handleChange} />
          <select name="status" className={inputClass} value={formData.status || 'Working'} onChange={handleChange}>
            <option value="Working">Working</option>
            <option value="Faulty">Faulty</option>
          </select>
        </>
      )}

      {mode === 'comp' && (
        <>
          <textarea name="d" placeholder="Issue Description" className={cn(inputClass, "h-32")} value={formData.d || ''} onChange={handleChange} />
          <input name="a" placeholder="Assignee" className={inputClass} value={formData.a || ''} onChange={handleChange} />
          <select name="p" className={inputClass} value={formData.p || 'Low'} onChange={handleChange}>
            <option value="Low">Low</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </>
      )}

      {mode === 'sched' && (
        <>
          <select name="day" className={inputClass} value={formData.day || 'Monday'} onChange={handleChange}>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
          </select>
          <div className="grid grid-cols-2 gap-4">
            <input name="st" type="time" className={inputClass} value={formData.st || ''} onChange={handleChange} />
            <input name="et" type="time" className={inputClass} value={formData.et || ''} onChange={handleChange} />
          </div>
          <input name="sub" placeholder="Subject" className={inputClass} value={formData.sub || ''} onChange={handleChange} />
          <input name="inst" placeholder="Instructor" className={inputClass} value={formData.inst || ''} onChange={handleChange} />
        </>
      )}

      <div className="flex gap-4 pt-4">
        <button 
          onClick={() => onSave(formData)}
          className="flex-1 bg-[#00f2ff] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
        >
          SAVE RECORD
        </button>
        <button 
          onClick={onCancel}
          className="flex-1 bg-[#ff3f34] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
