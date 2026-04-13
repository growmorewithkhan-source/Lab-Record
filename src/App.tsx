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

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmbIoRyz_XkDpv0cC5ica-YvDLfC9sisc31VrbUT6ITTLfLaY1JXP8uBFXc8b_2qpFEA/exec';

import { db, auth } from './firebase';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  where,
  getDoc,
  getDocs
} from 'firebase/firestore';

const getLightModeColor = (color: string) => {
  switch (color.toLowerCase()) {
    case '#00f2ff': return '#0078d4';
    case '#00ff88': return '#008a4e';
    case '#ff6600': return '#c2410c';
    case '#ff3f34': return '#b91c1c';
    case '#ffcc00': return '#a16207';
    case '#ff6600': return '#c2410c';
    case '#ff3f34': return '#dc2626';
    default: return color;
  }
};

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('dash');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string, idx: number, docId?: string } | null>(null);
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [equip, setEquip] = useState<Equipment[]>([]);
  const [labSys, setLabSys] = useState<LabSys[]>([]);
  const [labSw, setLabSw] = useState<LabSw[]>([]);
  const [labEquip, setLabEquip] = useState<LabEquip[]>([]);
  const [comp, setComp] = useState<Complaint[]>([]);
  const [sched, setSched] = useState<Schedule[]>([]);
  const [att, setAtt] = useState<AttendanceRecord>({});
  const [notes, setNotes] = useState<Note[]>([]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      // ISO string
      try {
        const date = new Date(timeStr);
        return format(date, 'hh:mm a');
      } catch (e) {
        return timeStr;
      }
    }
    return timeStr;
  };

  const [isAuthReady, setIsAuthReady] = useState(false);

  // Firebase Auth & Listeners
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthReady(true);
      } else {
        // If no user is signed in, we still set isAuthReady to true
        // to allow the app to proceed. If Firestore rules require auth,
        // listeners will fail with permission errors, but we avoid the
        // admin-restricted-operation error from forced anonymous sign-in.
        setIsAuthReady(true);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      setStaff(snap.docs.map(doc => ({ ...doc.data() as Staff, docId: doc.id })));
    }, (err) => console.error("Staff Listener Error:", err));

    const unsubEquip = onSnapshot(collection(db, 'equipment'), (snap) => {
      setEquip(snap.docs.map(doc => ({ ...doc.data() as Equipment, docId: doc.id })));
    }, (err) => console.error("Equip Listener Error:", err));

    const unsubLabSys = onSnapshot(collection(db, 'lab_sys'), (snap) => {
      setLabSys(snap.docs.map(doc => ({ ...doc.data() as LabSys, docId: doc.id })));
    }, (err) => console.error("LabSys Listener Error:", err));

    const unsubLabSw = onSnapshot(collection(db, 'lab_sw'), (snap) => {
      setLabSw(snap.docs.map(doc => ({ ...doc.data() as LabSw, docId: doc.id })));
    }, (err) => console.error("LabSw Listener Error:", err));

    const unsubLabEquip = onSnapshot(collection(db, 'lab_equip'), (snap) => {
      setLabEquip(snap.docs.map(doc => ({ ...doc.data() as LabEquip, docId: doc.id })));
    }, (err) => console.error("LabEquip Listener Error:", err));

    const unsubComp = onSnapshot(collection(db, 'complaints'), (snap) => {
      setComp(snap.docs.map(doc => ({ ...doc.data() as Complaint, docId: doc.id })));
    }, (err) => console.error("Comp Listener Error:", err));

    const unsubSched = onSnapshot(collection(db, 'schedules'), (snap) => {
      setSched(snap.docs.map(doc => ({ ...doc.data() as Schedule, docId: doc.id })));
    }, (err) => console.error("Sched Listener Error:", err));

    const unsubNotes = onSnapshot(collection(db, 'notes'), (snap) => {
      setNotes(snap.docs.map(doc => ({ ...doc.data() as Note, docId: doc.id })));
    }, (err) => console.error("Notes Listener Error:", err));

    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      const attData: AttendanceRecord = {};
      snap.docs.forEach(doc => {
        attData[doc.id] = doc.data() as any;
      });
      setAtt(attData);
    }, (err) => console.error("Att Listener Error:", err));

    return () => {
      unsubStaff();
      unsubEquip();
      unsubLabSys();
      unsubLabSw();
      unsubLabEquip();
      unsubComp();
      unsubSched();
      unsubNotes();
      unsubAtt();
    };
  }, [isAuthReady]);

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
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  const isAdmin = currentUser?.r === 'Admin' || currentUser?.id === '01';

  useEffect(() => {
    if (currentUser) {
      const updatedUser = staff.find(s => s.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [staff, currentUser]);


  useEffect(() => {
    if (currentUser && !isAdmin) {
      setSelectedLabStaffId(currentUser.id);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    // We no longer persist currentUser to localStorage to force login on every session
    // as per user request: "jab b koi click kary to wo pehly login page osy ana chaheyy"
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const handleLogin = (idOrName: string, pass: string): boolean => {
    const cleanInput = String(idOrName).trim().toLowerCase();
    const cleanPass = String(pass).trim();
    
    const user = staff.find(s => {
      if (!s) return false;
      const sId = String(s.id || '').trim().toLowerCase();
      const sName = String(s.n || '').trim().toLowerCase();
      const sPass = String(s.p || '').trim();
      
      return (sId === cleanInput || 
              parseInt(sId) === parseInt(cleanInput) || 
              sName === cleanInput) && 
             sPass === cleanPass;
    });

    if (user) {
      setCurrentUser(user);
      
      if (user.firstLogin) {
        setIsFirstLoginModalOpen(true);
        // Set to false in Firestore so it doesn't show again
        if (user.docId) {
          updateDoc(doc(db, 'staff', user.docId), { firstLogin: false });
        }
      }
      
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
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dash');
  };

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

  const todayStr = format(currentTime, 'yyyy-MM-dd');

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

  // Handlers
  const handleSave = async (formData: any) => {
    const dataWithDefaults = { ...formData };

    if (modalMode === 'staff') {
      if (!dataWithDefaults.r) dataWithDefaults.r = 'Staff';
      if (!dataWithDefaults.type) dataWithDefaults.type = 'Daily';
      if (!dataWithDefaults.s) dataWithDefaults.s = '0';
      if (!dataWithDefaults.id || !dataWithDefaults.p) {
        return;
      }

      const isDuplicate = staff.some((user) => String(user.id) === String(dataWithDefaults.id) && user.docId !== dataWithDefaults.docId);
      if (isDuplicate) {
        setIsConfirmModalOpen(true);
        setConfirmAction({ type: 'duplicate_error', idx: -1 });
        return;
      }

      if (dataWithDefaults.docId) {
        // Preserve pic if not provided in formData
        const existingStaff = staff.find(s => s.docId === dataWithDefaults.docId);
        if (existingStaff && !dataWithDefaults.pic) {
          dataWithDefaults.pic = existingStaff.pic;
        }
        await updateDoc(doc(db, 'staff', dataWithDefaults.docId), dataWithDefaults);
      } else {
        dataWithDefaults.firstLogin = true; // New staff must change password on first login
        await addDoc(collection(db, 'staff'), dataWithDefaults);
      }
    } else if (modalMode === 'equip') {
      if (!dataWithDefaults.st) dataWithDefaults.st = 'Working';
      if (dataWithDefaults.docId) {
        await updateDoc(doc(db, 'equipment', dataWithDefaults.docId), dataWithDefaults);
      } else {
        await addDoc(collection(db, 'equipment'), dataWithDefaults);
      }
    } else if (modalMode === 'lab_sys') {
      if (!dataWithDefaults.staffId) {
        // If adding from Inventory Control tab, set as global
        dataWithDefaults.staffId = activeTab === 'equip' ? 'global' : (isAdmin ? selectedLabStaffId : currentUser?.id);
      }
      if (!dataWithDefaults.staffId) return;
      if (dataWithDefaults.docId) {
        await updateDoc(doc(db, 'lab_sys', dataWithDefaults.docId), dataWithDefaults);
      } else {
        await addDoc(collection(db, 'lab_sys'), dataWithDefaults);
      }
    } else if (modalMode === 'lab_sw') {
      if (!dataWithDefaults.staffId) {
        // If adding from Inventory Control tab, set as global
        dataWithDefaults.staffId = activeTab === 'equip' ? 'global' : (isAdmin ? selectedLabStaffId : currentUser?.id);
      }
      if (!dataWithDefaults.staffId) return;
      if (dataWithDefaults.docId) {
        await updateDoc(doc(db, 'lab_sw', dataWithDefaults.docId), dataWithDefaults);
      } else {
        await addDoc(collection(db, 'lab_sw'), dataWithDefaults);
      }
    } else if (modalMode === 'lab_equip') {
      if (!dataWithDefaults.staffId) {
        dataWithDefaults.staffId = isAdmin ? selectedLabStaffId : currentUser?.id;
      }
      if (!dataWithDefaults.staffId) return;
      if (!dataWithDefaults.status) dataWithDefaults.status = 'Working';
      if (dataWithDefaults.docId) {
        await updateDoc(doc(db, 'lab_equip', dataWithDefaults.docId), dataWithDefaults);
      } else {
        await addDoc(collection(db, 'lab_equip'), dataWithDefaults);
      }
    } else if (modalMode === 'comp') {
      if (!dataWithDefaults.p) dataWithDefaults.p = 'Low';
      if (dataWithDefaults.docId) {
        await updateDoc(doc(db, 'complaints', dataWithDefaults.docId), dataWithDefaults);
      } else {
        await addDoc(collection(db, 'complaints'), dataWithDefaults);
      }
    } else if (modalMode === 'sched') {
      if (dataWithDefaults.docId) {
        await updateDoc(doc(db, 'schedules', dataWithDefaults.docId), dataWithDefaults);
      } else {
        await addDoc(collection(db, 'schedules'), dataWithDefaults);
      }
    }
    setIsModalOpen(false);
    setEditItem(null);
    setEditId(-1);
  };

  const [editItem, setEditItem] = useState<any>(null);

  const openEditModal = (mode: TabType | 'lab_sys' | 'lab_sw' | 'lab_equip', item: any) => {
    setModalMode(mode);
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (mode: string, item: any) => {
    if (mode === 'staff' && item.id === '01') {
      return;
    }
    
    setConfirmAction({ type: 'delete_' + mode, idx: -1, docId: item.docId });
    setIsConfirmModalOpen(true);
  };

  const executeDelete = async () => {
    if (!confirmAction || !confirmAction.docId) return;
    const { type, docId } = confirmAction;
    const mode = type.replace('delete_', '');
    
    const collectionName = mode === 'staff' ? 'staff' : 
                         mode === 'equip' ? 'equipment' : 
                         mode === 'lab_sys' ? 'lab_sys' : 
                         mode === 'lab_sw' ? 'lab_sw' : 
                         mode === 'lab_equip' ? 'lab_equip' : 
                         mode === 'comp' ? 'complaints' : 'schedules';
    
    await deleteDoc(doc(db, collectionName, docId));
    
    setIsConfirmModalOpen(false);
    setConfirmAction(null);
  };

  const setAttendance = async (id: string, status: 'Present' | 'Absent') => {
    if (status === 'Absent') {
      setReasonStaffId(id);
      setIsReasonModalOpen(true);
      setReasonText('');
      setDeductSalary(false); // Default: do not deduct
    } else {
      const dayData = att[attDate] || {};
      await setDoc(doc(db, 'attendance', attDate), {
        ...dayData,
        [id]: { status: 'Present' }
      });
    }
  };

  const saveAbsenceReason = async () => {
    const dayData = att[attDate] || {};
    await setDoc(doc(db, 'attendance', attDate), {
      ...dayData,
      [reasonStaffId]: { status: 'Absent', reason: reasonText, deduct: deductSalary }
    });
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
        body: filteredEquip.map(x => [x.n, x.s, x.st])
      });

      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.text("PC Specifications", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Staff', 'PC ID', 'Gen', 'RAM', 'Disk', 'Qty']],
        body: filteredLabSys.map(x => [staff.find(s => s.id === x.staffId)?.n || 'Unknown', x.id, x.gen, x.ram, x.disk, x.count])
      });

      const finalY2 = (doc as any).lastAutoTable.finalY || finalY + 20;
      doc.text("Software Inventory", 14, finalY2 + 10);
      autoTable(doc, {
        startY: finalY2 + 15,
        head: [['Staff', 'Name', 'Version']],
        body: filteredLabSw.map(x => [staff.find(s => s.id === x.staffId)?.n || 'Unknown', x.name, x.ver])
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
          const isFuture = dateStr > todayStr;
          const record = att[dateStr]?.[s.id];
          
          let status = record?.status || (isFuture ? '-' : 'Present');
          let reason = record?.reason || (record ? '-' : (isFuture ? 'Future Date' : 'Auto-Present'));

          attendanceInRange.push([
            format(curr, 'MMM dd, yyyy'),
            status,
            reason
          ]);
          
          if (status === 'Present') presents++;
          else if (status === 'Absent') absents++;
          
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

  const handlePrintLabInventory = () => {
    const staffMember = staff.find(s => s.id === (isAdmin ? selectedLabStaffId : currentUser?.id));
    const labName = staffMember?.lab || 'N/A';
    const staffName = staffMember?.n || 'N/A';
    
    const sys = labSys.filter(l => l.staffId === (isAdmin ? selectedLabStaffId : currentUser?.id));
    const sw = labSw.filter(s => s.staffId === (isAdmin ? selectedLabStaffId : currentUser?.id));
    const equipList = labEquip.filter(e => e.staffId === (isAdmin ? selectedLabStaffId : currentUser?.id));

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Lab Inventory - ${labName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { color: #00f2ff; margin-bottom: 5px; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .meta { font-size: 14px; color: #666; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            .section-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #444; }
            .status { font-weight: bold; font-size: 11px; padding: 3px 8px; border-radius: 4px; }
            .status-working { color: #00ff88; background: rgba(0, 255, 136, 0.1); }
            .status-faulty { color: #ff3f34; background: rgba(255, 63, 52, 0.1); }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Lab Inventory Report</h1>
            <div class="meta"><strong>Lab Name:</strong> ${labName}</div>
            <div class="meta"><strong>In-Charge:</strong> ${staffName}</div>
            <div class="meta"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="section-title">PC Systems</div>
          <table>
            <thead>
              <tr><th>PC ID</th><th>Generation</th><th>RAM</th><th>Disk</th><th>Qty</th></tr>
            </thead>
            <tbody>
              ${sys.map(l => `<tr><td>${l.id}</td><td>${l.gen}</td><td>${l.ram}</td><td>${l.disk}</td><td>${l.count}</td></tr>`).join('')}
              ${sys.length === 0 ? '<tr><td colspan="5" style="text-align:center">No records found</td></tr>' : ''}
            </tbody>
          </table>

          <div class="section-title">Software Inventory</div>
          <table>
            <thead>
              <tr><th>Software Name</th><th>Version</th></tr>
            </thead>
            <tbody>
              ${sw.map(s => `<tr><td>${s.name}</td><td>${s.ver}</td></tr>`).join('')}
              ${sw.length === 0 ? '<tr><td colspan="2" style="text-align:center">No records found</td></tr>' : ''}
            </tbody>
          </table>

          <div class="section-title">Equipment</div>
          <table>
            <thead>
              <tr><th>Equipment Name</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${equipList.map(e => `<tr><td>${e.name}</td><td><span class="status ${e.status === 'Working' ? 'status-working' : 'status-faulty'}">${e.status}</span></td></tr>`).join('')}
              ${equipList.length === 0 ? '<tr><td colspan="2" style="text-align:center">No records found</td></tr>' : ''}
            </tbody>
          </table>

          <div style="margin-top: 50px; font-size: 12px; color: #999; text-align: center;">
            Generated by ERP System - ${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close window after printing
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const shareWA = (n: string, p: number, t: number) => {
    window.open(`https://wa.me/?text=*PAYROLL*%0A*Name:* ${n}%0A*Presents:* ${p}%0A*Total:* Rs. ${t}`, '_blank');
  };

  // Filtered Data
  const filteredStaff = staff.filter(s => (s.n || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (s.id || '').includes(searchTerm || ''));
  const filteredEquip = equip.filter(e => (e.n || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (e.s || '').toLowerCase().includes(searchTerm || ''));
  const filteredLabSys = labSys.filter(l => 
    (l.id || '').toLowerCase().includes((searchTerm || '').toLowerCase()) && 
    (activeTab === 'equip' ? (l.staffId === 'global' || !l.staffId) : true)
  );
  const filteredLabSw = labSw.filter(s => 
    (s.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) && 
    (activeTab === 'equip' ? (s.staffId === 'global' || !s.staffId) : true)
  );
  const filteredComp = comp.filter(c => (c.d || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
  const filteredSched = sched.filter(s => (s.sub || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (s.inst || '').toLowerCase().includes(searchTerm || ''));

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
            <h2 className={cn("font-['Orbitron'] text-2xl font-bold", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>SK-OS</h2>
            <p className="text-[10px] text-[#888] tracking-widest uppercase">ERP ENTERPRISE v28.0</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input 
              type="text" 
              placeholder="Search Records..."
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg text-xs outline-none border-l-4",
                theme === 'dark' ? "bg-white/5 border-white/5 border-l-[#00f2ff]" : "bg-gray-100 border-gray-200 border-l-[#2563eb]"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-2 px-2">Main Menu</p>
          <NavItem active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} icon={<LayoutDashboard size={18} />} label="Dashboard" theme={theme} />
          
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Human Resources</p>
          {isAdmin && <NavItem active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={18} />} label="Staff Management" theme={theme} />}
          <NavItem active={activeTab === 'salary'} onClick={() => setActiveTab('salary')} icon={<Wallet size={18} />} label="Payroll & Attendance" theme={theme} />
          
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Assets & Ops</p>
          {isAdmin && <NavItem active={activeTab === 'equip'} onClick={() => setActiveTab('equip')} icon={<Package size={18} />} label="Inventory Control" theme={theme} />}
          <NavItem active={activeTab === 'comp'} onClick={() => setActiveTab('comp')} icon={<AlertTriangle size={18} />} label="Complaint Tracker" theme={theme} />
          <NavItem active={activeTab === 'lab'} onClick={() => setActiveTab('lab')} icon={<Monitor size={18} />} label="Lab Inventory" theme={theme} />
          <NavItem active={activeTab === 'sched'} onClick={() => setActiveTab('sched')} icon={<Calendar size={18} />} label="Lab Schedule" theme={theme} />
          
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Communication</p>
          <NavItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<MessageSquare size={18} />} label="Staff Notes" theme={theme} />

          {isAdmin && (
            <>
              <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mt-6 mb-2 px-2">Analytics</p>
              <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={18} />} label="Reports Export" theme={theme} />
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
              <p className="text-[#00f2ff] text-xs flex items-center gap-1" style={{ color: theme === 'dark' ? '#00f2ff' : getLightModeColor('#00f2ff') }}>
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
                  isAdmin ? (theme === 'dark' ? "bg-[#00f2ff]/10 text-[#00f2ff]" : "bg-[#2563eb]/10 text-[#2563eb]") : (theme === 'dark' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#008a4e]/10 text-[#008a4e]")
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
                      icon={<Users className={theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]"} />} 
                      label="Active Staff" 
                      value={staff.length} 
                      color={theme === 'dark' ? "#00f2ff" : "#2563eb"} 
                      onClick={isAdmin ? () => setActiveTab('staff') : undefined}
                      theme={theme}
                    />
                    <StatCard 
                      icon={<Package className="text-[#ff6600]" />} 
                      label="Lab Assets" 
                      value={equip.length + labSys.length} 
                      color="#ff6600" 
                      onClick={isAdmin ? () => setActiveTab('equip') : () => setActiveTab('lab')}
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
                    <h4 className={cn("font-bold mb-2", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>System Message</h4>
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
                        <h3 className={cn("text-2xl font-bold uppercase tracking-wider", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>Lab Inventory Management</h3>
                        <p className="text-sm text-[#888]">
                          {isAdmin 
                            ? "Manage PC specifications, software, and equipment for assigned labs." 
                            : `Managing Inventory for: ${currentUser?.lab || 'No Lab Assigned'}`
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handlePrintLabInventory}
                          className="flex items-center gap-2 bg-[#555] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#666] transition-colors"
                        >
                          <Printer size={14} /> Print Inventory
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[#888] uppercase tracking-widest">View Lab For:</span>
                            <select 
                              className={cn(
                                "p-2 rounded-lg outline-none border text-sm font-bold",
                                theme === 'dark' 
                                  ? "bg-white/5 border-white/10 text-white [&>option]:bg-[#0d0d15] [&>option]:text-white" 
                                  : "bg-gray-100 border-gray-200 text-black [&>option]:bg-white [&>option]:text-black"
                              )}
                              value={selectedLabStaffId}
                              onChange={(e) => setSelectedLabStaffId(e.target.value)}
                            >
                              {staff.filter(s => s.lab).map((s, i) => (
                                <option key={`lab-opt-${s.docId || s.id || i}-${i}`} value={s.id}>{s.n} ({s.lab})</option>
                              ))}
                              {staff.filter(s => s.lab).length === 0 && <option value="">No Labs Assigned</option>}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {!selectedLabStaffId && isAdmin ? (
                      <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                        <Monitor size={64} className={cn("mx-auto mb-4 opacity-20", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")} />
                        <h4 className="text-xl font-bold mb-2">No Labs Assigned Yet</h4>
                        <p className="text-[#888] max-w-md mx-auto">Assign a lab name to a staff member in the Staff Management tab to start managing their inventory.</p>
                        <button 
                          onClick={() => setActiveTab('staff')}
                          className={cn(
                            "mt-6 px-6 py-3 border rounded-xl font-bold transition-all",
                            theme === 'dark' 
                              ? "bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/30 hover:bg-[#00f2ff]/20" 
                              : "bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/30 hover:bg-[#2563eb]/20"
                          )}
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
                            <h4 className="font-bold flex items-center gap-2"><Cpu size={18} className={theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]"} /> PC Systems</h4>
                            <button 
                              onClick={() => { setModalMode('lab_sys'); setEditId(-1); setIsModalOpen(true); }}
                              className={cn(
                                "p-2 text-white rounded-lg hover:opacity-80 transition-all",
                                theme === 'dark' ? "bg-[#00f2ff]" : "bg-[#2563eb]"
                              )}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {labSys.filter(l => l.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).map((l, idx) => (
                              <div key={`lab-sys-${l.docId || l.id || idx}-${idx}`} className={cn(
                                "p-4 rounded-xl border group relative",
                                theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white border-gray-100"
                              )}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className={cn("text-xs font-bold", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>{l.id}</span>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openEditModal('lab_sys', l)} className={cn(theme === 'dark' ? "text-[#ffcc00]" : "text-[#a16207]")}><Edit2 size={12} /></button>
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
                            <h4 className="font-bold flex items-center gap-2"><Code size={18} className={theme === 'dark' ? "text-[#00ff88]" : "text-[#008a4e]"} /> Software</h4>
                            <button 
                              onClick={() => { setModalMode('lab_sw'); setEditId(-1); setIsModalOpen(true); }}
                              className="p-2 bg-[#00ff88] text-white rounded-lg hover:opacity-80"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {labSw.filter(s => s.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).map((s, idx) => (
                              <div key={`lab-sw-${s.docId || s.name || idx}-${idx}`} className={cn(
                                "p-4 rounded-xl border group relative",
                                theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white border-gray-100"
                              )}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-bold">{s.name}</p>
                                    <p className="text-[10px] text-[#888] uppercase font-bold">Version: {s.ver}</p>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal('lab_sw', s)} className={cn(theme === 'dark' ? "text-[#ffcc00]" : "text-[#a16207]")}><Edit2 size={12} /></button>
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
                            <h4 className="font-bold flex items-center gap-2"><Package size={18} className={theme === 'dark' ? "text-[#ff6600]" : "text-[#d97706]"} /> Equipment</h4>
                            <button 
                              onClick={() => { setModalMode('lab_equip'); setEditId(-1); setIsModalOpen(true); }}
                              className="p-2 bg-[#ff6600] text-white rounded-lg hover:opacity-80"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {labEquip.filter(e => e.staffId === (isAdmin ? selectedLabStaffId : currentUser.id)).map((e, idx) => (
                              <div key={`lab-eq-${e.docId || e.name || idx}-${idx}`} className={cn(
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
                                  <button onClick={() => openEditModal('lab_equip', e)} className={cn(theme === 'dark' ? "text-[#ffcc00]" : "text-[#a16207]")}><Edit2 size={12} /></button>
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
                          <tr className={cn(
                            "text-[#ff6600] text-[10px] uppercase tracking-wider border-b",
                            theme === 'dark' ? "border-white/5" : "border-gray-100"
                          )}>
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
                            <tr key={`staff-row-${s.docId || s.id || i}-${i}`} className={cn(
                              "border-b transition-colors",
                              theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-gray-50 hover:bg-gray-50"
                            )}>
                            <td className="py-4 px-4">{s.id}</td>
                            <td className="py-4 px-4 font-semibold">{s.n}</td>
                            <td className="py-4 px-4">{s.r}</td>
                            <td className="py-4 px-4">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                s.type === 'Permanent' ? (theme === 'dark' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#008a4e]/10 text-[#008a4e]") : (theme === 'dark' ? "bg-[#ffcc00]/10 text-[#ffcc00]" : "bg-[#a16207]/10 text-[#a16207]")
                              )}>
                                {s.type || 'Daily'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {s.lab ? (
                                <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", theme === 'dark' ? "bg-[#00f2ff]/10 text-[#00f2ff]" : "bg-[#2563eb]/10 text-[#2563eb]")}>{s.lab}</span>
                              ) : (
                                <span className="text-[#888] text-[10px] italic">Not Assigned</span>
                              )}
                            </td>
                            <td className="py-4 px-4">Rs. {s.s}</td>
                            <td className="py-4 px-4"><code className="text-[#888]">****</code></td>
                            <td className="py-4 px-4 flex gap-2">
                              <button onClick={() => openEditModal('staff', s)} className={cn("p-2 rounded hover:opacity-80", theme === 'dark' ? "bg-[#ffcc00] text-black" : "bg-[#a16207] text-white")}><Edit2 size={14} /></button>
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
                          {staff.map((e, i) => (
                            <div key={`att-card-${e.docId || e.id || i}-${i}`} className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                            )}>
                              <span className="text-sm font-semibold">{e.n}</span>
                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setAttendance(e.id, 'Present')}
                                  className={cn(
                                    "flex flex-col items-center gap-1 text-[10px] font-bold",
                                    (attDate <= todayStr && (!att[attDate]?.[e.id]?.status || att[attDate]?.[e.id]?.status === 'Present')) ? (theme === 'dark' ? "text-[#00ff88]" : "text-[#008a4e]") : "text-[#888]"
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
                        <div className={cn(
                          "mt-4 p-4 rounded-xl border",
                          theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                        )}>
                          <p className="text-xs uppercase font-bold mb-1">Your Status Today</p>
                          <p className={cn(
                            "text-lg font-bold",
                            (attDate <= todayStr && (!att[attDate]?.[currentUser.id]?.status || att[attDate]?.[currentUser.id]?.status === 'Present')) ? (theme === 'dark' ? "text-[#00ff88]" : "text-[#008a4e]") : (attDate > todayStr ? "text-[#888]" : "text-[#ff3f34]")
                          )}>
                            {att[attDate]?.[currentUser.id]?.status || (attDate > todayStr ? 'Not Yet' : 'Present')}
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
                          <tr className={cn(
                            "text-[#ff6600] text-[10px] uppercase tracking-wider border-b",
                            theme === 'dark' ? "border-white/5" : "border-gray-100"
                          )}>
                            <th className="pb-4 px-4">Staff Name</th>
                            <th className="pb-4 px-4">Presents</th>
                            <th className="pb-4 px-4">Base</th>
                            <th className="pb-4 px-4">Net Salary</th>
                            <th className="pb-4 px-4">Share</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {staff.filter(e => isAdmin || e.id === currentUser.id).map((e, i) => {
                            let p = 0;
                            let deductibleAbsents = 0;
                            
                            // Iterate through every day in the payroll range
                            let current = new Date(payrollRange.start);
                            while (current <= payrollRange.end) {
                              const dateStr = format(current, 'yyyy-MM-dd');
                              const day = att[dateStr];
                              const isFuture = dateStr > todayStr;
                              
                              if (day && day[e.id]) {
                                if (day[e.id].status === 'Present') {
                                  p++;
                                } else if (day[e.id].status === 'Absent' && day[e.id].deduct) {
                                  deductibleAbsents++;
                                }
                              } else if (!isFuture) {
                                // Default to Present only if day has passed or is today
                                p++;
                              }
                              current.setDate(current.getDate() + 1);
                            }

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
                              <tr key={`payroll-row-${e.docId || e.id || i}-${i}`} className={cn(
                                "border-b transition-colors",
                                theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-gray-50 hover:bg-gray-50"
                              )}>
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
                                <td className={cn("py-4 px-4 font-bold", theme === 'dark' ? "text-[#00ff88]" : "text-[#008a4e]")}>Rs. {total}</td>
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

              {activeTab === 'equip' && isAdmin && (
                <div className={cn(
                  "p-8 rounded-2xl border",
                  theme === 'dark' ? "bg-[#0d0d15] border-white/5" : "bg-white border-gray-200"
                )}>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold">Inventory Control</h3>
                    <div className="flex gap-2">
                      <button onClick={() => exportData('pdf')} className="flex items-center gap-2 bg-[#555] text-white px-4 py-2 rounded-lg text-xs font-bold"><Printer size={14} /> Print</button>
                      {currentUser?.id === '01' && (
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
                      <h4 className={cn("font-bold mb-4 uppercase text-xs tracking-widest", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>Hardware Assets</h4>
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
                            <tr key={`equip-row-${x.docId || x.s || i}-${i}`} className={cn(
                              "border-b",
                              theme === 'dark' ? "border-white/5" : "border-gray-100"
                            )}>
                              <td className="py-4 px-4 font-semibold">{x.n}</td>
                              <td className="py-4 px-4">{x.s}</td>
                              <td className="py-4 px-4">
                                <span className={cn(
                                  "px-2 py-1 rounded text-[10px] font-bold",
                                  x.st === 'Working' ? (theme === 'dark' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#008a4e]/10 text-[#008a4e]") : "bg-[#ff3f34]/10 text-[#ff3f34]"
                                )}>{x.st || 'Working'}</span>
                              </td>
                              <td className="py-4 px-4 flex gap-2">
                                {currentUser?.id === '01' && (
                                  <>
                                    <button onClick={() => openEditModal('equip', x)} className={cn("p-1.5 rounded", theme === 'dark' ? "bg-[#ffcc00] text-black" : "bg-[#a16207] text-white")}><Edit2 size={12} /></button>
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
                            <tr key={`sys-row-${x.docId || x.id || i}-${i}`} className={cn(
                              "border-b",
                              theme === 'dark' ? "border-white/5" : "border-gray-100"
                            )}>
                              <td className="py-4 px-4 font-semibold">{x.id}</td>
                              <td className="py-4 px-4">{x.gen}</td>
                              <td className="py-4 px-4">{x.ram}</td>
                              <td className="py-4 px-4">{x.disk}</td>
                              <td className="py-4 px-4 flex gap-2">
                                {currentUser?.id === '01' && (
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
                      <h4 className={cn("font-bold mb-4 uppercase text-xs tracking-widest", theme === 'dark' ? "text-[#00ff88]" : "text-[#008a4e]")}>Software Inventory</h4>
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
                            <tr key={`sw-row-${x.docId || x.name || i}-${i}`} className={cn(
                              "border-b",
                              theme === 'dark' ? "border-white/5" : "border-gray-100"
                            )}>
                              <td className="py-4 px-4 font-semibold">{x.name}</td>
                              <td className="py-4 px-4">{x.ver}</td>
                              <td className="py-4 px-4">{x.pc}</td>
                              <td className="py-4 px-4 flex gap-2">
                                {currentUser?.id === '01' && (
                                  <>
                                    <button onClick={() => openEditModal('lab_sw', x)} className={cn("p-1.5 rounded", theme === 'dark' ? "bg-[#ffcc00] text-black" : "bg-[#a16207] text-white")}><Edit2 size={12} /></button>
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
                        <tr className={cn(
                          "text-[#ff6600] text-[10px] uppercase tracking-wider border-b",
                          theme === 'dark' ? "border-white/5" : "border-gray-100"
                        )}>
                          <th className="pb-4 px-4">Issue Description</th>
                          <th className="pb-4 px-4">Assigned To</th>
                          <th className="pb-4 px-4">Priority</th>
                          <th className="pb-4 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredComp.map((x, i) => (
                          <tr key={`comp-row-${x.docId || i}-${i}`} className={cn(
                            "border-b",
                            theme === 'dark' ? "border-white/5" : "border-gray-100"
                          )}>
                            <td className="py-4 px-4">{x.d}</td>
                            <td className="py-4 px-4 font-semibold">{x.a}</td>
                            <td className="py-4 px-4">
                              <span className={cn(
                                "px-2 py-1 rounded text-[10px] font-bold",
                                x.p === 'Critical' ? "bg-[#ff3f34]/10 text-[#ff3f34]" : 
                                x.p === 'High' ? (theme === 'dark' ? "bg-[#ff6600]/10 text-[#ff6600]" : "bg-[#c2410c]/10 text-[#c2410c]") : (theme === 'dark' ? "bg-[#00f2ff]/10 text-[#00f2ff]" : "bg-[#2563eb]/10 text-[#2563eb]")
                              )}>{x.p || 'Low'}</span>
                            </td>
                            <td className="py-4 px-4 flex gap-2">
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEditModal('comp', x)} className={cn("p-2 rounded", theme === 'dark' ? "bg-[#ffcc00] text-black" : "bg-[#a16207] text-white")}><Edit2 size={14} /></button>
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
                        <tr className={cn(
                          "text-[#ff6600] text-[10px] uppercase tracking-wider border-b",
                          theme === 'dark' ? "border-white/5" : "border-gray-100"
                        )}>
                          <th className="pb-4 px-4">Lab</th>
                          <th className="pb-4 px-4">Day</th>
                          <th className="pb-4 px-4">Time</th>
                          <th className="pb-4 px-4">Subject</th>
                          <th className="pb-4 px-4">Instructor</th>
                          <th className="pb-4 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredSched.map((x, i) => (
                          <tr key={`sched-row-${x.docId || i}-${i}`} className={cn(
                            "border-b transition-colors",
                            theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-gray-50 hover:bg-gray-50"
                          )}>
                            <td className={cn("py-4 px-4 font-bold", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>{x.lab || 'N/A'}</td>
                            <td className="py-4 px-4 font-bold">{x.day}</td>
                            <td className={cn("py-4 px-4", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>{formatTime(x.st)} - {formatTime(x.et)}</td>
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
                    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((note, i) => {
                      const noteAuthor = staff.find(s => s.id === note.staffId);
                      const replyAuthor = note.replyStaffId ? staff.find(s => s.id === note.replyStaffId) : staff.find(s => s.r === 'Admin');
                      
                      return (
                        <div key={`note-card-${note.docId || note.id || i}-${i}`} className={cn(
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
                                  noteAuthor?.r === 'Admin' ? (theme === 'dark' ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#008a4e]/10 text-[#008a4e]") : (theme === 'dark' ? "bg-[#00f2ff]/10 text-[#00f2ff]" : "bg-[#2563eb]/10 text-[#2563eb]")
                                )}>
                                  {note.staffName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold">{note.staffName} <span className="text-[10px] opacity-50 font-normal">({note.staffId})</span></p>
                                  {note.targetStaffId && (
                                    <span className={cn(
                                      "text-[9px] px-2 py-0.5 rounded uppercase tracking-tighter",
                                      theme === 'dark' ? "bg-white/5 text-[#888]" : "bg-gray-100 text-gray-500"
                                    )}>
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
                                  className={cn("text-[10px] font-bold uppercase tracking-widest hover:underline", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}
                                >
                                  Reply
                                </button>
                              )}
                              {(note.staffId === currentUser.id) && !note.reply && (
                                <button 
                                  onClick={() => { setSelectedNote(note); setNoteText(note.text); setIsNoteModalOpen(true); }}
                                  className={cn("text-[10px] font-bold uppercase tracking-widest hover:underline", theme === 'dark' ? "text-[#ffcc00]" : "text-[#d97706]")}
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
                              "mt-4 p-4 rounded-xl border-l-4",
                              theme === 'dark' ? "border-[#00ff88]" : "border-[#008a4e]",
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
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-[#00ff88]" : "text-[#008a4e]")}>Admin {replyAuthor?.n || 'Admin'} Reply</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {isAdmin && note.isClosed && (
                                    <button 
                                      onClick={() => {
                                        const updatedNotes = notes.map(n => n.id === note.id ? { ...n, isClosed: false } : n);
                                        setNotes(updatedNotes);
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
                              "mt-4 p-4 rounded-xl border-l-4",
                              theme === 'dark' ? "border-[#00f2ff]" : "border-[#2563eb]",
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
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>{noteAuthor?.n || 'Staff'} Reply</p>
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
                      <h3 className={cn("text-2xl font-bold mb-6 uppercase tracking-wider", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")}>
                {!editItem ? "New" : "Edit"} {modalMode.replace('_', ' ')}
              </h3>
              
              <ModalForm 
                key={editItem?.docId || 'new'}
                mode={modalMode} 
                initialData={editItem}
                onSave={handleSave}
                onCancel={() => { setIsModalOpen(false); setEditItem(null); }}
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
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold border transition-all",
                        theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                      )}
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
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold border transition-all",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
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
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold border transition-all",
                        theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={async () => {
                        if (currentUser && currentUser.docId) {
                          try {
                            const updatedUser = { ...currentUser, pic: profilePicUrl };
                            await updateDoc(doc(db, 'staff', currentUser.docId), { pic: profilePicUrl });
                            setCurrentUser(updatedUser);
                            setIsProfileModalOpen(false);
                          } catch (error) {
                            console.error("Error updating profile picture:", error);
                            alert("Failed to update profile picture. Please try again.");
                          }
                        }
                      }}
                      className="flex-1 py-3 bg-[#00f2ff] text-white font-bold rounded-xl"
                    >
                      UPDATE
                    </button>
                  </div>
                  {currentUser?.pic && (
                    <button 
                      onClick={async () => {
                        if (currentUser && currentUser.docId) {
                          try {
                            const updatedUser = { ...currentUser, pic: '' };
                            await updateDoc(doc(db, 'staff', currentUser.docId), { pic: '' });
                            setCurrentUser(updatedUser);
                            setProfilePicUrl('');
                            setIsProfileModalOpen(false);
                          } catch (error) {
                            console.error("Error clearing profile picture:", error);
                          }
                        }
                      }}
                      className="w-full mt-4 py-2 text-xs font-bold text-[#ff3f34] hover:underline"
                    >
                      CLEAR PROFILE PICTURE
                    </button>
                  )}
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
                    <div key={`history-${item.timestamp}-${idx}`} className="relative pl-6 border-l-2 border-[#00f2ff]/30">
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
                      "w-full p-4 rounded-xl outline-none border transition-all",
                      theme === 'dark' 
                        ? "bg-[#151619] border-white/10 text-white [&>option]:bg-[#151619] [&>option]:text-white" 
                        : "bg-gray-50 border-gray-200 text-black [&>option]:bg-white [&>option]:text-black"
                    )}
                    value={noteTarget}
                    onChange={(e) => setNoteTarget(e.target.value)}
                  >
                    <option value="all">All Staff Members</option>
                    {staff.filter(s => s.r !== 'Admin').map((s, i) => (
                      <option key={`target-staff-opt-${s.docId || s.id || i}-${i}`} value={s.id}>{s.n} ({s.id})</option>
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
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold border transition-all",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
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
                      } else {
                        // Edit Note
                        const updatedNotes = notes.map(n => n.id === selectedNote.id ? {
                          ...n,
                          text: noteText,
                          editedTimestamp: new Date().toISOString(),
                          history: [...(n.history || []), { text: n.text, timestamp: n.editedTimestamp || n.timestamp }]
                        } : n);
                        setNotes(updatedNotes);
                        setIsNoteModalOpen(false);
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

        {isFirstLoginModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
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
                "relative w-full max-w-md p-8 rounded-3xl border shadow-2xl",
                theme === 'dark' ? "bg-[#0d0d15] border-[#00f2ff]/30" : "bg-white border-gray-200"
              )}
            >
              <div className="text-center mb-6">
                <Lock size={48} className="mx-auto text-[#00f2ff] mb-4" />
                <h3 className="text-2xl font-bold mb-2">Change Password</h3>
                <p className="text-sm text-[#888]">Welcome! Since this is your first login, please set a new password for your account.</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-[#888] uppercase mb-1 block">New Password</label>
                  <input 
                    type="password" 
                    className={cn(
                      "w-full p-4 rounded-xl outline-none border",
                      theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200"
                    )}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#888] uppercase mb-1 block">Confirm New Password</label>
                  <input 
                    type="password" 
                    className={cn(
                      "w-full p-4 rounded-xl outline-none border",
                      theme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200"
                    )}
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsFirstLoginModalOpen(false)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold border transition-all",
                    theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  LATER
                </button>
                <button 
                  onClick={async () => {
                    if (!newPassword || newPassword !== confirmNewPassword) {
                      alert("Passwords do not match or are empty!");
                      return;
                    }
                    if (currentUser && currentUser.docId) {
                      await updateDoc(doc(db, 'staff', currentUser.docId), {
                        p: newPassword,
                        firstLogin: false
                      });
                      setCurrentUser({ ...currentUser, p: newPassword, firstLogin: false });
                      setIsFirstLoginModalOpen(false);
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }
                  }}
                  className="flex-1 py-3 bg-[#00f2ff] text-white font-bold rounded-xl"
                >
                  UPDATE PASSWORD
                </button>
              </div>
            </motion.div>
          </div>
        )}
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

  const handleChangePassword = async () => {
    if (!changePassStaffId.trim() || !oldPassword.trim() || !newPassword.trim()) {
      setStatusModal({ show: true, type: 'error', message: 'Please fill all fields' });
      return;
    }
    
    const staffMember = staff.find(s => s && String(s.id || '') === String(changePassStaffId));
    
    if (!staffMember) {
      setStatusModal({ show: true, type: 'error', message: 'Staff ID not found' });
      return;
    }
    
    if (String(staffMember.p || '') !== String(oldPassword)) {
      setStatusModal({ show: true, type: 'error', message: 'Old password is incorrect' });
      return;
    }

    if (staffMember.docId) {
      await updateDoc(doc(db, 'staff', staffMember.docId), { p: newPassword });
    }
    
    setIsChangePassModalOpen(false);
    setChangePassStaffId('');
    setOldPassword('');
    setNewPassword('');
    setStatusModal({ show: true, type: 'success', message: 'Password updated successfully!' });
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center relative overflow-hidden font-sans transition-colors duration-500",
      theme === 'dark' 
        ? "bg-[#020205] text-[#e0e0e0]" 
        : "bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] text-[#0f172a]"
    )}>
      {/* Loader Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[2000] flex flex-col items-center justify-center backdrop-blur-md",
              theme === 'dark' ? "bg-black/80" : "bg-white/85"
            )}
          >
            <div className={cn(
              "w-[50px] h-[50px] border-[5px] rounded-full animate-spin-slow",
              theme === 'dark' ? "border-white/10 border-t-[#00f2ff]" : "border-[#e2e8f0] border-t-[#2563eb]"
            )} />
            <div className={cn(
              "mt-[15px] font-bold text-[12px] tracking-[1px] uppercase",
              theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]"
            )}>VERIFYING SECURITY...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background Shapes */}
      <div className={cn(
        "absolute -z-10 blur-[80px] rounded-full w-[400px] h-[400px] -top-[100px] -right-[50px] animate-move",
        theme === 'dark' ? "bg-blue-900/20" : "bg-blue-500/10"
      )} />
      <div className={cn(
        "absolute -z-10 blur-[80px] rounded-full w-[350px] h-[350px] -bottom-[50px] -left-[50px] animate-move",
        theme === 'dark' ? "bg-purple-900/20" : "bg-purple-500/10"
      )} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-10 rounded-[32px] w-full max-w-[420px] relative z-10 border transition-all duration-500",
          theme === 'dark' 
            ? "bg-[#0d0d15] border-white/5 shadow-2xl" 
            : "bg-white border-slate-200 shadow-xl"
        )}
      >
        <div className="text-center mb-[30px]">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl",
            theme === 'dark' ? "bg-[#00f2ff]/10 text-[#00f2ff]" : "bg-[#2563eb]/10 text-[#2563eb]"
          )}>
            <i className="fas fa-layer-group"></i>
          </div>
          <h2 className="text-[24px] font-bold tracking-tight">SK-OS TITAN ERP</h2>
          <p className={cn(
            "text-[13px]",
            theme === 'dark' ? "text-[#888]" : "text-[#64748b]"
          )}>Enterprise Access Terminal</p>
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
            <i className={cn("fas fa-user-circle absolute left-4 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-[#888]" : "text-[#64748b]")}></i>
            <input 
              type="text" 
              placeholder="Staff ID or Name" 
              className={cn(
                "w-full pl-12 pr-4 py-3.5 rounded-xl text-[15px] outline-none transition-all border",
                theme === 'dark' 
                  ? "bg-white/5 border-white/10 text-white focus:border-[#00f2ff] focus:ring-4 focus:ring-[#00f2ff]/10" 
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
              )}
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>

          <div className="relative">
            <i className={cn("fas fa-shield-alt absolute left-4 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-[#888]" : "text-[#64748b]")}></i>
            <input 
              type={showPass ? "text" : "password"} 
              placeholder="Passkey" 
              className={cn(
                "w-full pl-12 pr-12 py-3.5 rounded-xl text-[15px] outline-none transition-all border",
                theme === 'dark' 
                  ? "bg-white/5 border-white/10 text-white focus:border-[#00f2ff] focus:ring-4 focus:ring-[#00f2ff]/10" 
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#2563eb] focus:ring-4 focus:ring-blue-500/10"
              )}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <i 
              className={cn("fas absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer", theme === 'dark' ? "text-[#888]" : "text-[#64748b]", showPass ? "fa-eye-slash" : "fa-eye")}
              onClick={() => setShowPass(!showPass)}
            ></i>
          </div>

          <button 
            onClick={handleAuth}
            className={cn(
              "w-full py-4 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg",
              theme === 'dark' 
                ? "bg-[#00f2ff] hover:bg-[#00d8e6] text-black shadow-[#00f2ff]/20" 
                : "bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/20"
            )}
          >
            Authorize & Sign In
          </button>
        </div>

        <div className="mt-[25px] text-center text-[13px] flex flex-col gap-2">
          <div className={theme === 'dark' ? "text-[#888]" : "text-[#64748b]"}>
            Forgot Password? <span className={cn("font-semibold cursor-pointer", theme === 'dark' ? "text-[#00f2ff]" : "text-[#2563eb]")} onClick={() => setIsSupportModalOpen(true)}>Get Help</span>
          </div>
          <div className="text-[11px]">
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
              <h3 className="text-lg font-bold mb-[10px] text-black">Support Terminal</h3>
              <p className="text-[12px] text-slate-900 font-medium mb-[20px]">
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

function NavItem({ active, onClick, icon, label, theme }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, theme: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? (theme === 'dark' 
              ? "bg-[#0078d4]/10 text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.1)]" 
              : "bg-[#2563eb]/10 text-[#2563eb] shadow-[0_0_15px_rgba(37,99,235,0.1)]")
          : (theme === 'dark'
              ? "text-[#888] hover:bg-white/5 hover:text-white"
              : "text-[#64748b] hover:bg-gray-100 hover:text-[#0f172a]")
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
        color: theme === 'dark' ? color : getLightModeColor(color),
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

function ModalForm({ mode, initialData, onSave, onCancel, theme }: { mode: string, initialData: any, onSave: (data: any) => void, onCancel: () => void, theme: string, key?: string }) {
  const [formData, setFormData] = useState(() => {
    const data = initialData || {};
    // Format time strings for input type="time"
    if (mode === 'sched') {
      if (data.st && data.st.includes('T')) {
        data.st = format(new Date(data.st), 'HH:mm');
      }
      if (data.et && data.et.includes('T')) {
        data.et = format(new Date(data.et), 'HH:mm');
      }
    }
    return data;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputClass = cn(
    "w-full p-3 rounded-xl outline-none border transition-all duration-200",
    theme === 'dark' 
      ? "bg-[#151619] border-white/10 text-white focus:border-[#00f2ff] [&>option]:bg-[#151619] [&>option]:text-white" 
      : "bg-gray-50 border-gray-200 text-black focus:border-[#00f2ff] [&>option]:bg-white [&>option]:text-black"
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
          <input name="lab" placeholder="Lab Name / Room" className={inputClass} value={formData.lab || ''} onChange={handleChange} />
        </>
      )}

      <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => onSave(formData)}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity text-white",
                        theme === 'dark' ? "bg-[#00f2ff] text-black" : "bg-[#2563eb]"
                      )}
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
