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

export const logout = () => {
  removeToken();
  removeTeacher();
  window.location.href = '/teacher/login';
};
