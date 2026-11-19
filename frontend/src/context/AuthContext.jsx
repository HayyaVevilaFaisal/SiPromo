//pengelola status autentikasi;menjalankan request dan memperbarui user
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';//melakukan http request ke backend

const AuthContext = createContext(null);//membuat context baru 

//children : komponen yang dibungkus AuthProvider; akan menerima nilai context
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);//mengetahui apakah sesi sebelumnya masih berlangsung, dilogin ada loading?
  
  //pemeriksaan sesi
  useEffect(() => {
    let active = true;

    //memperoleh informasi pengguna berdasarkan sesi
    axiosClient.get('/auth/me').then(({ data }) => { if (active) setUser(data.user); })
      .catch(() => { if (active) setUser(null); })//kondisi gagal
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const logout = useCallback(async () => {
    await axiosClient.post('/auth/logout');
    setUser(null);
  }, []);

  //kontext value yang dibagikan ke komponen lain; user, loading, logout
  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
