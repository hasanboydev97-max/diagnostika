export const getToken = () => localStorage.getItem('teacher_token');
export const setToken = (token: string) => localStorage.setItem('teacher_token', token);
export const removeToken = () => localStorage.removeItem('teacher_token');
export const getTeacher = () => {
  const t = localStorage.getItem('teacher_data');
  return t ? JSON.parse(t) : null;
};
export const setTeacher = (teacher: any) => localStorage.setItem('teacher_data', JSON.stringify(teacher));
export const removeTeacher = () => localStorage.removeItem('teacher_data');

export const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const fetchCurrentTeacher = async () => {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const freshTeacher = await res.json();
      setTeacher(freshTeacher);
      return freshTeacher;
    }
  } catch (err) {
    console.error('Failed to sync current teacher data:', err);
  }
  return getTeacher();
};

export const logout = () => {
  removeToken();
  removeTeacher();
  window.location.href = '/teacher/login';
};
