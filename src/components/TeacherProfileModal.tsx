import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowUpRight, 
  Loader2, 
  Camera, 
  Upload, 
  Zap, 
  Crown,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders, setTeacher, logout } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any;
  onTeacherUpdate: (updated: any) => void;
}

export default function TeacherProfileModal({
  isOpen,
  onClose,
  teacher,
  onTeacherUpdate
}: TeacherProfileModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'security' | 'branding'>('profile');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Form states
  const [name, setName] = useState(teacher?.name || '');
  const [subject, setSubject] = useState(teacher?.subject || '');
  const [phone, setPhone] = useState(teacher?.phone || '');
  const [schoolName, setSchoolName] = useState(teacher?.schoolName || '');
  const [schoolLogo, setSchoolLogo] = useState(teacher?.schoolLogo || '');
  const [avatar, setAvatar] = useState(teacher?.avatar || '');

  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (teacher) {
      setName(teacher.name || '');
      setSubject(teacher.subject || '');
      setPhone(teacher.phone || '');
      setSchoolName(teacher.schoolName || '');
      setSchoolLogo(teacher.schoolLogo || '');
      setAvatar(teacher.avatar || '');
    }
  }, [teacher]);

  if (!isOpen) return null;

  // Handle Avatar Image Select
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Rasm hajmi 5MB dan kichik bo'lishi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      toast.success("Profil rasmi tanlandi");
    };
    reader.readAsDataURL(file);
  };

  // Handle School Logo File Select
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo hajmi 5MB dan kichik bo'lishi kerak");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSchoolLogo(reader.result as string);
      toast.success("Maktab logotipi tanlandi");
    };
    reader.readAsDataURL(file);
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          subject,
          phone,
          schoolName,
          schoolLogo,
          avatar
        })
      });
      const data = await res.json();
      if (res.ok && data.teacher) {
        setTeacher(data.teacher);
        onTeacherUpdate(data.teacher);
        toast.success("Profil ma'lumotlari yangilandi!");
      } else {
        toast.error(data.error || "Xatolik yuz berdi");
      }
    } catch (err) {
      toast.error("Server bilan ulanishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yangi parollar mos kelmadi!");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Parol muvaffaqiyatli yangilandi!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || "Parolni o'zgartirishda xatolik");
      }
    } catch (err) {
      toast.error("Server bilan ulanishda xatolik");
    } finally {
      setPasswordLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAiCount = teacher?.lastAiGenDate === todayStr ? (teacher?.dailyAiCount || 0) : 0;
  const maxAiAllowed = teacher?.plan === 'premium' ? 'Cheksiz' : (teacher?.plan === 'standard' ? 25 : 3);
  const maxAiNum = teacher?.plan === 'premium' ? 100 : (teacher?.plan === 'standard' ? 25 : 3);
  const aiProgressPercent = Math.min(100, Math.round((todayAiCount / maxAiNum) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md font-sans text-[#111111]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#fdfdfd] border border-black/10 shadow-[0_25px_70px_rgba(0,0,0,0.1)] rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-black/10 flex items-center justify-between shrink-0 bg-white/50">
            <div>
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-1">
                PROFILE & SETTINGS
              </span>
              <h2 className="text-xl font-medium tracking-tight text-[#111111]">O'qituvchi Kabineti</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-gray-500 hover:text-black hover:border-black transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body: Asymmetric Grid Layout (4 cols sidebar, 8 cols content) */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
            
            {/* LEFT COLUMN: NAVIGATION & AVATAR (4 cols) */}
            <div className="md:col-span-4 border-r border-black/10 p-6 flex flex-col justify-between bg-gray-50/50 overflow-y-auto">
              <div>
                {/* Minimalist Avatar Box */}
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="relative mb-3 group">
                    <div className="w-20 h-20 rounded-full border-2 border-black/10 bg-[#111111] text-white overflow-hidden flex items-center justify-center font-bold text-2xl shadow-sm">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{name?.charAt(0)?.toUpperCase() || 'O'}</span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-[#111111] text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-black transition-transform group-hover:scale-110">
                      <Camera size={12} />
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                  </div>

                  <h3 className="text-base font-medium tracking-tight text-[#111111]">{name || 'O\'qituvchi'}</h3>
                  <p className="text-xs text-gray-500 font-normal mb-2">{teacher?.email}</p>

                  {/* Plan Badge Pill */}
                  {teacher?.plan === 'premium' ? (
                    <span className="text-[9px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full bg-black text-white flex items-center gap-1">
                      <Crown size={10} /> Premium
                    </span>
                  ) : teacher?.plan === 'standard' ? (
                    <span className="text-[9px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full bg-gray-900 text-white flex items-center gap-1">
                      <Zap size={10} /> Standard
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full border border-black/20 text-gray-600">
                      Free Plan
                    </span>
                  )}
                </div>

                {/* Minimalist Menu Tabs */}
                <div className="space-y-1.5 pt-4 border-t border-zinc-200/80">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between group ${
                      activeTab === 'profile'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                    }`}
                  >
                    <span>01 / Shaxsiy Profil</span>
                    <ArrowUpRight className={`transition-transform duration-300 ${activeTab === 'profile' ? '-rotate-45' : 'group-hover:-rotate-45'}`} size={14} />
                  </button>

                  <button
                    onClick={() => setActiveTab('subscription')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between group ${
                      activeTab === 'subscription'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                    }`}
                  >
                    <span>02 / Obuna & Limitlar</span>
                    <ArrowUpRight className={`transition-transform duration-300 ${activeTab === 'subscription' ? '-rotate-45' : 'group-hover:-rotate-45'}`} size={14} />
                  </button>

                  <button
                    onClick={() => setActiveTab('security')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between group ${
                      activeTab === 'security'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                    }`}
                  >
                    <span>03 / Xavfsizlik & Parol</span>
                    <ArrowUpRight className={`transition-transform duration-300 ${activeTab === 'security' ? '-rotate-45' : 'group-hover:-rotate-45'}`} size={14} />
                  </button>

                  <button
                    onClick={() => setActiveTab('branding')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between group ${
                      activeTab === 'branding'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                    }`}
                  >
                    <span>04 / Maktab Brandingi</span>
                    <ArrowUpRight className={`transition-transform duration-300 ${activeTab === 'branding' ? '-rotate-45' : 'group-hover:-rotate-45'}`} size={14} />
                  </button>
                </div>
              </div>

              {/* Status footer & Logout */}
              <div className="pt-4 border-t border-black/10 flex flex-col gap-3">
                <div className="text-[10px] tracking-[0.2em] uppercase text-gray-400">
                  STATUS: <span className="text-black font-bold">FAOL SESSYA</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-red-600 hover:bg-red-50 transition-colors flex items-center justify-between group border border-red-200/50"
                >
                  <span className="flex items-center gap-2">
                    <LogOut size={14} />
                    <span>Tizimdan Chiqish</span>
                  </span>
                  <ArrowUpRight className="group-hover:rotate-45 transition-transform duration-300" size={14} />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: TAB CONTENT (8 cols) */}
            <div className="md:col-span-8 p-6 overflow-y-auto bg-[#fdfdfd]">
              
              {/* TAB 1: SHAXSIY PROFIL */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-1">
                      SECTION 01
                    </span>
                    <h3 className="text-lg font-medium tracking-tight text-[#111111] mb-6">
                      Shaxsiy Ma'lumotlar
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        F.I.SH (Ism va Familiya)
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Hasanboy Nurmuhammadov"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Dars Beradigan Fani
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        placeholder="Informatika"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Telefon Raqami
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Elektron Pochta (Email)
                      </label>
                      <input
                        type="email"
                        value={teacher?.email || ''}
                        disabled
                        className="w-full bg-transparent border-b border-black/10 py-2.5 text-sm text-gray-400 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-black/10 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#111111] text-white hover:bg-black text-xs font-semibold uppercase tracking-[0.2em] rounded-full px-8 py-3.5 flex items-center gap-3 group transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <span>Saqlash</span>}
                      <ArrowUpRight className="group-hover:rotate-45 transition-transform duration-300" size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: OBUNA & LIMITLAR */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-1">
                      SECTION 02
                    </span>
                    <h3 className="text-lg font-medium tracking-tight text-[#111111] mb-6">
                      Obuna & AI Limitlari
                    </h3>
                  </div>

                  {/* Minimalist Plan Card */}
                  <div className="p-6 rounded-2xl bg-[#111111] text-white shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400">
                        JORIY OBUNA
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-white border border-white/20">
                        {teacher?.plan || 'Free'}
                      </span>
                    </div>

                    <h4 className="text-2xl font-medium tracking-tight capitalize mb-2">
                      {teacher?.plan === 'premium' ? 'Premium 👑 Plan' : teacher?.plan === 'standard' ? 'Standard 🔥 Plan' : 'Free Plan'}
                    </h4>

                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                      {teacher?.plan === 'premium'
                        ? 'Cheksiz AI testlar, OCR Scanner, Word/Excel eksport va Shaxsiy branding imkoniyati faol.'
                        : 'Kunlik AI testlar soni va eksport imkoniyatlari obunangizga binoan cheklangan.'}
                    </p>

                    {teacher?.plan !== 'premium' && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/#pricing');
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-[0.2em] py-3 rounded-xl transition-colors flex items-center justify-center gap-2 group"
                      >
                        <span>Tarifni Oshirish (Upgrade)</span>
                        <ArrowUpRight className="group-hover:rotate-45 transition-transform duration-300" size={14} />
                      </button>
                    )}

                    {teacher?.planExpiresAt && (
                      <div className="mt-4 pt-4 border-t border-white/10 text-[10px] tracking-[0.2em] uppercase text-gray-400">
                        MUDDATI: {new Date(teacher.planExpiresAt).toLocaleDateString()} GACHA
                      </div>
                    )}
                  </div>

                  {/* AI Progress Meter */}
                  <div className="p-5 border border-black/10 rounded-2xl bg-white">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#111111] mb-2">
                      <span className="uppercase tracking-[0.2em] text-[10px] text-gray-500">Kunlik AI Yaratish Limiti</span>
                      <span>{todayAiCount} / {maxAiAllowed}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-black/10">
                      <div
                        className="h-full bg-black transition-all duration-500"
                        style={{ width: `${aiProgressPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-400 tracking-wider uppercase mt-2">
                      Limitlar har kuni 00:00 da yangilanadi.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: XAVFSIZLIK & PAROL */}
              {activeTab === 'security' && (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-1">
                      SECTION 03
                    </span>
                    <h3 className="text-lg font-medium tracking-tight text-[#111111] mb-6">
                      Xavfsizlik & Parolni Yangilash
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Joriy Parol
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Yangi Parol
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Kamida 6 ta belgi"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Yangi Parolni Tasdiqlang
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Yangi parolni qayta kiriting"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-black/10 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="bg-[#111111] text-white hover:bg-black text-xs font-semibold uppercase tracking-[0.2em] rounded-full px-8 py-3.5 flex items-center gap-3 group transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {passwordLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Parolni Saqlash</span>}
                      <ArrowUpRight className="group-hover:rotate-45 transition-transform duration-300" size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: MAKTAB BRANDINGI */}
              {activeTab === 'branding' && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400 block mb-1">
                      SECTION 04
                    </span>
                    <h3 className="text-lg font-medium tracking-tight text-[#111111] mb-6">
                      Shaxsiy Branding & Logotip
                    </h3>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-1">
                        Maktab / O'quv Markazi Nomi
                      </label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="14-IDUM yoki Perfect Academy"
                        className="w-full bg-transparent border-b border-black/20 focus:border-black py-2.5 text-sm text-[#111111] focus:outline-none transition-colors font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
                        Muassasa Logotipi
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl border border-black/10 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                          {schoolLogo ? (
                            <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest">Logo</span>
                          )}
                        </div>
                        <label className="cursor-pointer px-5 py-2.5 rounded-full border border-black/20 hover:border-black text-xs font-semibold uppercase tracking-[0.2em] text-[#111111] transition-colors flex items-center gap-2">
                          <Upload size={14} />
                          <span>Rasm Tanlash</span>
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-black/10 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#111111] text-white hover:bg-black text-xs font-semibold uppercase tracking-[0.2em] rounded-full px-8 py-3.5 flex items-center gap-3 group transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <span>Brandingni Saqlash</span>}
                      <ArrowUpRight className="group-hover:rotate-45 transition-transform duration-300" size={14} />
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
