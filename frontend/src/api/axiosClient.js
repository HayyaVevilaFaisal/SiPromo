//konfigurasi komunikasi frontend dan backend; mengirimkan js ke server 
import axios from 'axios';

//instace axios untuk untuk API
const axiosClient = axios.create({ baseURL: '/api', withCredentials: true });

//interceptor untuk menangani error 401 (Unauthorized) dari backend
axiosClient.interceptors.response.use(
  res => res,
  err => {
    // /me digunakan juga untuk mengecek sesi saat halaman login dibuka.
    // jangan redirect pemeriksaan itu agar tidak membuat loop reload.
    // jika error 401 terjadi pada request selain /me, redirect ke halaman login.
    if (err.response?.status === 401 && err.config?.url !== '/auth/me') {
      window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);
export default axiosClient;
