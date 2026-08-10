import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Lock, 
  Shield, 
  Crown, 
  Camera, 
  Building, 
  Phone, 
  Mail, 
  BookOpen, 
  X, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  Upload, 
  Zap,
  KeyRound,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders, setTeacher } from '../lib/auth';

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

  // Handle Avatar Image File Select
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

  // Handle Profile Update
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header Banner */}
        <div className="relative bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-850 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Avatar Circle with Upload Trigger */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-white/20 overflow-hidden flex items-center justify-center text-xl font-bold shadow-inner">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-300">{name?.charAt(0)?.toUpperCase() || 'O'}</span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 p-1.5 bg-white text-zinc-900 rounded-full shadow-md cursor-pointer hover:bg-zinc-100 transition-colors">
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{name || 'O\'qituvchi'}</h2>
                {teacher?.plan === 'premium' ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40 uppercase tracking-widest flex items-center gap-1">
                    <Crown size={10} /> Premium
                  </span>
                ) : teacher?.plan === 'standard' ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-widest flex items-center gap-1">
                    <Zap size={10} /> Standard
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/20 uppercase tracking-widest">
                    Free
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">{teacher?.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-zinc-200/80 bg-zinc-50/50 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-zinc-900 text-zinc-900 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <User size={14} /> Shaxsiy Profil
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'border-zinc-900 text-zinc-900 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Crown size={14} /> Obuna & Limitlar
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-zinc-900 text-zinc-900 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Lock size={14} /> Xavfsizlik & Parol
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'branding'
                ? 'border-zinc-900 text-zinc-900 bg-white shadow-xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Building size={14} /> Branding & Maktab
          </button>
        </div>

        {/* Modal Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-zinc-900">
          
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    F.I.SH (Ism va Familiya)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Masalan: Hasanboy Nurmuhammadov"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Dars beradigan Fani
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      placeholder="Masalan: Informatika va Axborot Texnologiyalari"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Telefon Raqami
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Elektron Pochta (Email)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="email"
                      value={teacher?.email || ''}
                      disabled
                      className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-100/80 border border-zinc-200 rounded-xl text-zinc-500 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SUBSCRIPTION & LIMITS */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              {/* Current Plan Overview Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 text-white relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                      Joriy Obuna Holati
                    </span>
                    <h3 className="text-xl font-bold tracking-tight capitalize">
                      {teacher?.plan || 'Free'} Plan
                    </h3>
                  </div>
                  {teacher?.plan === 'premium' ? (
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                      <Crown size={28} />
                    </div>
                  ) : (
                    <div className="p-3 bg-white/10 text-white rounded-2xl border border-white/20">
                      <Zap size={28} />
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                  {teacher?.plan === 'premium'
                    ? 'Siz Premium tarifidasiz! Cheksiz AI testlar, OCR Scanner, Word/Excel eksport va Shaxsiy branding imkoniyatlaridan to\'liq foydalanishingiz mumkin.'
                    : teacher?.plan === 'standard'
                    ? 'Siz Standard tarifidasiz! Kuniga 25 ta AI test yaratish hamda DOCX va Excel fayllarni yuklab olish huquqiga egasiz.'
                    : 'Siz Free (Bepul) tarifidasiz. Kuniga 3 ta AI test yaratish va 2 ta aktiv test saqlash cheklovi mavjud.'}
                </p>

                {teacher?.planExpiresAt && (
                  <div className="text-[11px] text-zinc-400 pt-3 border-t border-white/10 flex items-center gap-1.5">
                    <Shield size={12} />
                    <span>Amal qilish muddati: {new Date(teacher.planExpiresAt).toLocaleDateString()}gacha</span>
                  </div>
                )}
              </div>

              {/* Daily AI Usage Meter */}
              <div className="p-5 bg-white rounded-2xl border border-zinc-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    Kunlik AI Test Yaratish Limiti
                  </span>
                  <span>{todayAiCount} / {maxAiAllowed}</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                  <div
                    className={`h-full transition-all duration-500 ${
                      aiProgressPercent >= 90 ? 'bg-red-500' : aiProgressPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${aiProgressPercent}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Har kuni kechasi 00:00 da sun'iy intellekt limiti avtomatik ravishda yangilanadi.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <Shield className="shrink-0 text-amber-600 mt-0.5" size={16} />
                <p>
                  Hisobingiz xavfsizligini ta'minlash uchun parolingizni muntazam yangilab turishingiz tavsiya etiladi. Parol kamida 6 ta belgidan iborat bo'lishi lozim.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Joriy Parol
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Yangi Parol
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Kamida 6 ta belgi"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Yangi Parolni Tasdiqlang
                  </label>
                  <div className="relative">
                    <CheckCircle2 className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Yangi parolni qayta kiriting"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                  <span>Parolni Yangilash</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: BRANDING & SCHOOL LOGO */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
                <Building className="shrink-0 text-blue-600 mt-0.5" size={16} />
                <p>
                  Ushbu ma'lumotlar Word hamda PDF formatda yuklab olinadigan test qog'ozlarining sarlavhasida va muassasa brendingida ko'rinadi.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Maktab / O'quv Markazi Nomi
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Masalan: 14-IDUM yoki Perfect Academy"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Muassasa Logotipi / Pechati
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-100 border border-zinc-300 flex items-center justify-center overflow-hidden shrink-0">
                    {schoolLogo ? (
                      <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-zinc-400 text-center px-2">Logo yo'q</span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload size={14} />
                    <span>Logo Yuklash</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>Brandingni Saqlash</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
