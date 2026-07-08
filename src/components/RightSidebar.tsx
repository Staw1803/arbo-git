import { useState, useEffect } from 'react';
import { Search, Hash, UserPlus, Loader } from 'lucide-react';
import { db, isFirebaseConfigured } from '../firebaseClient';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const STATIC_TRENDS = [
  { id: '1', tag: '#PredixSocial', postsCount: '1.245 posts' },
  { id: '2', tag: '#PixBrasil', postsCount: '892 posts' },
  { id: '3', tag: '#EfiPix', postsCount: '512 posts' },
  { id: '4', tag: '#InteligenciaArtificial', postsCount: '2.310 posts' },
];

export default function RightSidebar() {
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUsers([
        { id: '1', displayName: 'Arthur Santos', username: '@arthur_s', photoURL: 'https://i.pravatar.cc/80?img=11' },
        { id: '2', displayName: 'Juliana Lima', username: '@ju_lima', photoURL: 'https://i.pravatar.cc/80?img=5' },
        { id: '3', displayName: 'Gustavo Dev', username: '@gusta_dev', photoURL: 'https://i.pravatar.cc/80?img=15' },
      ]);
      setLoadingUsers(false);
      return;
    }
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('credits', 'desc'), limit(4));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching sidebar users:', err);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <aside className="hidden lg:flex flex-col gap-6 w-80 p-4 sticky top-0 h-screen overflow-y-auto bg-black border-l border-zinc-800 z-35 text-left select-none">
      <div className="relative flex items-center bg-zinc-900 rounded-full px-4 py-2 border border-transparent focus-within:border-sky-500 focus-within:bg-black transition-all duration-200">
        <Search className="text-zinc-500 w-4 h-4 shrink-0 mr-3" />
        <input
          type="text"
          placeholder="Buscar no Predix..."
          className="bg-transparent text-white placeholder-zinc-500 text-xs focus:outline-none w-full font-medium"
        />
      </div>

      <div className="bg-transparent border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
          <Hash className="text-zinc-300 w-4 h-4" />
          <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Assuntos do momento</h3>
        </div>
        <div className="flex flex-col gap-3.5">
          {STATIC_TRENDS.map((trend) => (
            <div key={trend.id} className="flex flex-col gap-0.5 text-left cursor-pointer group">
              <span className="text-xs font-bold text-zinc-200 group-hover:text-sky-400 transition-all duration-150 leading-snug">{trend.tag}</span>
              <span className="text-[10px] text-zinc-500 font-semibold">{trend.postsCount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-transparent border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
          <UserPlus className="text-zinc-300 w-4 h-4" />
          <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Quem seguir</h3>
        </div>
        {loadingUsers ? (
          <div className="flex items-center justify-center py-4 text-zinc-600">
            <Loader className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={user.photoURL || `https://i.pravatar.cc/80?u=${user.id}`}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0"
                    onError={(e: any) => { e.target.src = `https://i.pravatar.cc/80?u=${user.id}`; }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-zinc-200 text-xs truncate">{user.displayName}</span>
                    <span className="text-zinc-500 text-[10px] font-mono truncate">
                      {user.username?.startsWith('@') ? user.username : `@${user.username || user.id.slice(0, 8)}`}
                    </span>
                  </div>
                </div>
                <button className="px-3 py-1 rounded-full bg-white hover:bg-zinc-200 text-black text-[10px] font-bold transition-all duration-150 cursor-pointer shrink-0 active:scale-95">
                  Seguir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[10px] text-zinc-600 font-semibold px-2 flex flex-wrap gap-x-2 gap-y-1 justify-center leading-normal">
        <a href="#" className="hover:underline">Privacidade</a>
        <span>•</span>
        <a href="#" className="hover:underline">Termos</a>
        <span>•</span>
        <a href="#" className="hover:underline">Diretrizes</a>
        <span>•</span>
        <span>© 2026 Predix Inc.</span>
      </div>
    </aside>
  );
}
