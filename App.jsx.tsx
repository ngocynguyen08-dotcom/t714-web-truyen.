import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Crown, Award, ThumbsUp, Shuffle, MessageSquare, 
  Shield, UserCheck, Moon, Sun, PlusCircle, Eye, CheckCircle, 
  Sparkles, Send, ImagePlus, Trash2, List, FileText, ChevronLeft, ChevronRight, Wand2,
  MessageCircle, X, Hash, Star, LogIn, UserPlus, LogOut, Lock, User, Heart
} from 'lucide-react';

const DEFAULT_LOGO_URL = "image_3c2d84.jpg";

// ================= DỮ LIỆU MẪU =================
const INITIAL_BOOKS = [
  {
    id: 1,
    title: "Bí Ẩn Làng Vô Danh",
    author: "Lưu Lang Thần",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400",
    tags: ["Trinh thám", "Kinh dị"],
    summary: "Một ngôi làng không có trên bản đồ, những vụ mất tích bí ẩn và một thám tử trẻ đang tìm kiếm sự thật...",
    sao: 120, // Tổng Sao song tử (Khí vận)
    views: 3450,
    chapters: [
      { id: 1, title: "Chương 1: Lời mời kì lạ", content: "Mưa rơi rả rích trên con hẻm nhỏ.\nTôi nhận được một bức thư không người gửi.\nBên trong chỉ có một tấm vé tàu cũ kĩ và dòng chữ: 'Đến làng Vô Danh, nếu muốn biết sự thật'.", sao: 45, views: 1200 },
      { id: 2, title: "Chương 2: Chuyến tàu đêm", content: "Chuyến tàu vắng tanh không một bóng người.\nTiếng bánh sắt nghiến trên đường ray nghe rợn người.\nTôi chợt nhận ra, mình không phải hành khách duy nhất.", sao: 75, views: 900 }
    ]
  },
  {
    id: 2,
    title: "Hoa Đào Năm Ngoái",
    author: "Mộng Tiên",
    cover: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&q=80&w=400",
    tags: ["Tình cảm", "Cổ đại"],
    summary: "Nàng chờ đợi ngàn năm dưới gốc bồ đề, chỉ đổi lấy một lần hồi眸 của người ấy.",
    sao: 1500, // Trời sinh may mắn
    views: 12000,
    chapters: [
      { id: 1, title: "Chương 1: Hội Ngộ", content: "Hoa đào rơi lả tả như tuyết mùa xuân.\nHắn vận bạch y, đứng dưới gốc cây mỉm cười.\nKhoảnh khắc đó, ta biết mình đã định sẵn một đời trầm luân.", sao: 500, views: 5000 }
    ]
  }
];

const INITIAL_REVIEWS = [
  { id: 1, bookId: 2, author: "Độc giả T714", authorRole: "Reader", authorReputation: 1200, text: "Truyện quá hay, đọc mà khóc hết nước mắt. Đề cử mạnh cho mọi người nhé! Mong tác giả ra thêm ngoại truyện.", likes: 45 },
  { id: 2, bookId: 1, author: "Người Mới", authorRole: "Reader", authorReputation: 50, text: "Cốt truyện hấp dẫn, suy luận logic. Tuy nhiên chương 2 hơi ngắn.", likes: 12 }
];

export default function App() {
  // ================= STATE =================
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); 
  
  // Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({ username: '', password: '', role: 'Reader' });
  const [currentUser, setCurrentUser] = useState({ username: "Admin T714", role: "Admin", reputation: 1200 });
  const [usersDb, setUsersDb] = useState([
    { username: "Admin T714", password: "123", role: "Admin", reputation: 1200 },
    { username: "Độc giả T714", password: "123", role: "Reader", reputation: 85 },
    { username: "Lưu Lang Thần", password: "123", role: "Author", reputation: 350 },
    { username: "Mộng Tiên", password: "123", role: "Author", reputation: 90 }
  ]);

  // Data State
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [inlineComments, setInlineComments] = useState({}); // Lọc theo key: bookId_chapterId_paraIndex
  
  // Reading & Navigation State
  const [selectedBook, setSelectedBook] = useState(null);
  const [readingChapterIndex, setReadingChapterIndex] = useState(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState('Tất cả');
  const [randomBookModal, setRandomBookModal] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState({ show: false, text: '' });

  // Creation State (Đăng Truyện)
  const [bookForm, setBookForm] = useState({ title: '', cover: '', summary: '' });
  const [formTags, setFormTags] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [newCustomTag, setNewCustomTag] = useState('');
  const [chaptersForm, setChaptersForm] = useState([{ title: '', content: '' }]);

  const userRole = currentUser ? currentUser.role : 'Guest';

  // ================= AUTH LOGIC =================
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.username.trim() || !authForm.password.trim()) {
      setAuthError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (authMode === 'login') {
      const foundUser = usersDb.find(u => u.username.toLowerCase() === authForm.username.trim().toLowerCase() && u.password === authForm.password);
      if (foundUser) {
        setCurrentUser(foundUser);
        setShowAuthModal(false);
      } else {
        setAuthError('Tên đăng nhập hoặc mật khẩu không đúng!');
      }
    } else {
      if (usersDb.some(u => u.username.toLowerCase() === authForm.username.trim().toLowerCase())) {
        setAuthError('Tên người dùng đã tồn tại!');
        return;
      }
      const newUser = { username: authForm.username.trim(), password: authForm.password, role: authForm.role, reputation: 0 };
      setUsersDb([...usersDb, newUser]);
      setCurrentUser(newUser);
      setShowAuthModal(false);
    }
    setAuthForm({ username: '', password: '', role: 'Reader' });
  };

  // ================= HELPERS & BADGES =================
  const showMsg = (text) => setShowMessageModal({ show: true, text });

  const getReputationBadge = (reputation, role) => {
    if (role === 'Admin') {
      return (
        <span className="ml-1 inline-flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 text-transparent bg-clip-text font-black text-xs px-2 py-0.5 rounded-full border border-purple-300 shadow-sm">
          Thiên đạo
        </span>
      );
    }
    if (reputation >= 1000) return <span className="ml-1 inline-flex items-center gap-1 bg-[#FFDAC1] text-[#D37340] font-bold text-xs px-2 py-0.5 rounded-full shadow-sm"><Crown className="w-3 h-3 text-yellow-500" /> Vua sách</span>;
    if (reputation >= 500) return <span className="ml-1 inline-flex items-center bg-[#B5EAD7] text-emerald-700 font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">Đọc rộng hiểu nhiều</span>;
    if (reputation >= 100) return <span className="ml-1 inline-flex items-center bg-[#C7CEEA] text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">Người chia sẻ</span>;
    return null;
  };

  const getAuthorKhiVanBadge = (khiVan) => {
    if (khiVan >= 10000) return <span className="text-yellow-500 font-black ml-1 text-xs drop-shadow-sm">Thiên chi kiêu tử</span>;
    if (khiVan >= 1000) return <span className="text-blue-500 font-bold ml-1 text-xs">Trời sinh may mắn</span>;
    if (khiVan >= 100) return <span className="text-green-500 font-bold ml-1 text-xs">Có thiên phú</span>;
    return null;
  };

  // ================= TƯƠNG TÁC TRUYỆN =================
  const handleLikeReview = (reviewId) => {
    setReviews(reviews.map(r => {
      if (r.id === reviewId) {
        setUsersDb(usersDb.map(u => u.username === r.author ? { ...u, reputation: u.reputation + 1 } : u));
        if (currentUser && currentUser.username === r.author) setCurrentUser({ ...currentUser, reputation: currentUser.reputation + 1 });
        return { ...r, likes: r.likes + 1 };
      }
      return r;
    }));
  };

  const handleAddSaoSongTu = (bookId, chapterId) => {
    setBooks(books.map(b => {
      if (b.id === bookId) {
        return {
          ...b,
          sao: (b.sao || 0) + 1,
          chapters: b.chapters.map(c => c.id === chapterId ? { ...c, sao: (c.sao || 0) + 1 } : c)
        };
      }
      return b;
    }));
  };

  const increaseView = (bookId, chapterId) => {
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        return {
          ...b,
          views: (b.views || 0) + 1,
          chapters: b.chapters.map(c => c.id === chapterId ? { ...c, views: (c.views || 0) + 1 } : c)
        };
      }
      return b;
    }));
  };

  const handleDeleteBook = (bookId) => {
    setBooks(books.filter(b => b.id !== bookId));
    setSelectedBook(null);
    setActiveTab('home');
    showMsg("Đã xoá truyện thành công!");
  };

  const handleRoll = () => {
    const candidates = books.filter(b => (b.sao || 0) > 0);
    if (candidates.length === 0) {
      showMsg("Chưa có truyện nào được xếp hạng để gieo quẻ!");
      return;
    }
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomBookModal(random);
  };

  const handlePublish = () => {
    if (!bookForm.title || !bookForm.summary || formTags.length === 0) {
      showMsg("Vui lòng điền đủ Tên truyện, Thể loại và Văn án!");
      return;
    }
    const newBook = {
      id: Date.now(),
      title: bookForm.title,
      author: currentUser.username,
      cover: bookForm.cover || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400",
      tags: formTags,
      summary: bookForm.summary,
      sao: 0,
      views: 0,
      chapters: chaptersForm.map((ch, i) => ({ id: i + 1, title: ch.title || `Chương ${i+1}`, content: ch.content, sao: 0, views: 0 }))
    };
    setBooks([newBook, ...books]);
    setBookForm({ title: '', cover: '', summary: '' });
    setFormTags([]);
    setChaptersForm([{ title: '', content: '' }]);
    showMsg("Đăng truyện thành công!");
    setActiveTab('books');
  };

  // ================= VIEW COMPONENTS =================
  const renderHome = () => {
    const topSaoBooks = [...books].filter(b => (b.sao || 0) > 0).sort((a, b) => b.sao - a.sao).slice(0, 10);
    return (
      <div className="max-w-6xl mx-auto space-y-12">
        {/* TOP SAO SONG TỬ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 animate-pulse" />
            <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-500 to-[#FF9AA2] bg-clip-text text-transparent">
              Top 10 Sao Song Tử
            </h2>
          </div>
          {topSaoBooks.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-[#FFB7B2]/50">
              <p className="text-slate-500 font-medium">Hiện chưa có truyện trên kệ. Hãy trở thành người chắp bút ^^</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topSaoBooks.map((book, idx) => (
                <div key={book.id} onClick={() => { setSelectedBook(book); setActiveTab('books'); }} className="group flex bg-white dark:bg-slate-800 rounded-2xl p-3 border border-[#E2F0CB] hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1 overflow-hidden relative">
                  <div className="absolute top-0 right-0 bg-[#FF9AA2] text-white font-black px-3 py-1 rounded-bl-xl z-10 shadow-sm">
                    #{idx + 1}
                  </div>
                  <img src={book.cover} alt="cover" className="w-24 h-32 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform" />
                  <div className="ml-4 flex-1 py-1">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-1">{book.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-2">Tác giả: {book.author}</p>
                    <div className="flex items-center gap-3 text-xs font-bold text-[#D37340]">
                      <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> {book.sao} Khí vận</span>
                      <span className="flex items-center gap-1 text-slate-400"><Eye className="w-4 h-4" /> {book.views} Lượt xem</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* GIEO QUẺ (Roll Random) */}
        <section className="py-16 text-center bg-gradient-to-br from-[#FFDAC1]/40 to-[#FFB7B2]/40 rounded-3xl shadow-inner border border-white/50 relative overflow-hidden">
          <Wand2 className="absolute -top-10 -right-10 w-48 h-48 text-[#FF9AA2]/20 rotate-12" />
          <h2 className="text-3xl font-black mb-4 text-[#D37340]">Gieo Quẻ Khám Phá</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto">Không biết nên đọc gì? Hãy để thiên ý chọn giúp bạn một tác phẩm xuất sắc nhất từ kệ truyện!</p>
          <button 
            onClick={handleRoll}
            className="px-8 py-4 bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white font-black rounded-full shadow-[0_8px_30px_rgb(255,154,162,0.5)] transition-all hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 mx-auto text-lg"
          >
            <Shuffle className="w-6 h-6" /> Bắt Đầu Gieo Quẻ
          </button>
        </section>
      </div>
    );
  };

  const renderReadingView = () => {
    const chapter = selectedBook.chapters[readingChapterIndex];
    const paras = chapter.content.split('\n');

    return (
      <div className="max-w-3xl mx-auto bg-[#FDFBF7] dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-[#E2F0CB]/50">
        <div className="bg-[#FFDAC1]/20 p-6 border-b border-[#FFDAC1]/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <button onClick={() => setReadingChapterIndex(null)} className="flex items-center gap-1 text-[#D37340] font-bold hover:text-[#FF9AA2] transition-colors">
            <ChevronLeft className="w-5 h-5" /> Trở về
          </button>
          <div className="text-center flex-1 mx-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 truncate">{chapter.title}</h2>
            <p className="text-xs font-bold text-[#FF9AA2] mt-1">{selectedBook.title}</p>
          </div>
          <div className="w-20"></div>
        </div>

        {/* NỘI DUNG ĐỌC & BÌNH LUẬN NỘI TUYẾN */}
        <div className="p-8 md:p-12 font-sans">
          {paras.map((para, idx) => {
             const commentKey = `${selectedBook.id}_${chapter.id}_${idx}`;
             const parasComments = inlineComments[commentKey] || [];
             const isCommenting = activeTab === `comment_${commentKey}`; // Dùng activeTab tạm để toggle comment
             
             return (
               <div key={idx} className="relative group mb-6">
                 <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap">{para}</p>
                 
                 {/* Nút Toggle Comment */}
                 <button 
                    onClick={() => setActiveTab(isCommenting ? 'reading' : `comment_${commentKey}`)}
                    className="absolute -right-2 top-0 md:-right-10 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[#FFDAC1]/50 text-[#D37340] rounded-full hover:bg-[#FFDAC1] shadow-sm z-10"
                 >
                    <MessageCircle className="w-4 h-4" />
                    {parasComments.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{parasComments.length}</span>}
                 </button>

                 {/* Hộp Comment Nội tuyến */}
                 {isCommenting && (
                   <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#FFDAC1]/50 shadow-lg ml-4 relative">
                     <button onClick={() => setActiveTab('reading')} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                     <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-[#D37340]"><MessageCircle className="w-4 h-4"/> Bình luận đoạn này</h4>
                     
                     <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                        {parasComments.map((c, i) => (
                           <div key={i} className="text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">
                             <div className="font-bold text-[#FF9AA2] mb-1 flex items-center gap-1">{c.author} {getReputationBadge(c.authorReputation, c.authorRole)}</div>
                             <div className="text-slate-700 dark:text-slate-300">{c.text}</div>
                           </div>
                        ))}
                        {parasComments.length === 0 && <div className="text-xs text-slate-400 italic">Chưa có bình luận nào cho đoạn này. Bóc tem ngay!</div>}
                     </div>

                     <div className="flex gap-2">
                       <input 
                         id={`input_${commentKey}`}
                         type="text" 
                         placeholder="Nhập bình luận của bạn..." 
                         className="flex-1 px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:border-[#FF9AA2] bg-slate-50 dark:bg-slate-900 outline-none"
                         onKeyDown={(e) => {
                            if(e.key === 'Enter' && e.target.value.trim()) {
                               if(!currentUser) { showMsg("Vui lòng đăng nhập để bình luận."); return; }
                               setInlineComments({...inlineComments, [commentKey]: [...parasComments, { author: currentUser.username, authorRole: currentUser.role, authorReputation: currentUser.reputation, text: e.target.value }]});
                               e.target.value = '';
                            }
                         }}
                       />
                       <button 
                         onClick={() => {
                            const input = document.getElementById(`input_${commentKey}`);
                            if(input && input.value.trim()) {
                               if(!currentUser) { showMsg("Vui lòng đăng nhập để bình luận."); return; }
                               setInlineComments({...inlineComments, [commentKey]: [...parasComments, { author: currentUser.username, authorRole: currentUser.role, authorReputation: currentUser.reputation, text: input.value }]});
                               input.value = '';
                            }
                         }}
                         className="px-4 py-2 bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white rounded-xl shadow-md"
                       >
                         <Send className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             )
          })}
        </div>

        {/* NÚT THÍCH (SAO SONG TỬ) Ở CUỐI CHƯƠNG */}
        <div className="py-12 border-t border-[#FFDAC1]/50 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/20">
          <p className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Hết Chương</p>
          <button 
            onClick={() => {
              if(!currentUser) { showMsg("Vui lòng đăng nhập để tặng sao!"); return; }
              handleAddSaoSongTu(selectedBook.id, chapter.id);
            }}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-[#FF9AA2] p-0.5 shadow-lg group-hover:scale-110 transition-transform">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 group-hover:animate-spin-slow" />
              </div>
            </div>
            <span className="font-bold text-[#D37340] text-sm group-hover:text-[#FF9AA2] transition-colors">Tặng Sao Song Tử</span>
            <span className="text-xs font-black bg-[#FFDAC1] text-[#D37340] px-3 py-1 rounded-full">{chapter.sao || 0} Lượt Thích</span>
          </button>
        </div>

        {/* ĐIỀU HƯỚNG CHƯƠNG */}
        <div className="bg-[#FFDAC1]/20 p-4 border-t border-[#FFDAC1]/50 flex items-center justify-between">
          <button 
            disabled={readingChapterIndex === 0}
            onClick={() => { setReadingChapterIndex(readingChapterIndex - 1); increaseView(selectedBook.id, selectedBook.chapters[readingChapterIndex - 1].id); window.scrollTo(0,0); }}
            className="px-4 py-2 font-bold text-sm text-slate-600 disabled:opacity-30 flex items-center gap-1 hover:text-[#FF9AA2]"
          >
            <ChevronLeft className="w-4 h-4"/> Chương trước
          </button>
          <button 
            disabled={readingChapterIndex === selectedBook.chapters.length - 1}
            onClick={() => { setReadingChapterIndex(readingChapterIndex + 1); increaseView(selectedBook.id, selectedBook.chapters[readingChapterIndex + 1].id); window.scrollTo(0,0); }}
            className="px-4 py-2 font-bold text-sm text-slate-600 disabled:opacity-30 flex items-center gap-1 hover:text-[#FF9AA2]"
          >
            Chương sau <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    );
  };

  // ================= RENDER MAIN =================
  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* HEADER NAVBAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/90 border-[#FFB7B2]/30 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div onClick={() => { setActiveTab('home'); setSelectedBook(null); setReadingChapterIndex(null); }} className="flex items-center gap-3 cursor-pointer">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md border-2 border-[#FF9AA2] shrink-0 bg-[#FFDAC1]">
              <img src={DEFAULT_LOGO_URL} alt="T714 Logo" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://placehold.co/150x150/FF9AA2/white?text=T714"; }} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#FF9AA2] to-[#D37340] bg-clip-text text-transparent hidden sm:inline-block">
              Sau thứ sáu ngày mười ba (T714)
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#FFDAC1]/30 border-[#FFB7B2]/40'}`}>
                  <User className="w-4 h-4 text-[#FF9AA2]" />
                  <span className="font-bold text-sm text-[#FF9AA2]">{currentUser.username}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black text-white ${currentUser.role === 'Admin' ? 'bg-purple-500' : currentUser.role === 'Author' ? 'bg-[#FF9AA2]' : 'bg-[#C7CEEA] text-indigo-700'}`}>
                    {currentUser.role === 'Admin' ? 'Admin' : currentUser.role === 'Author' ? 'Tác giả' : 'Độc giả'}
                  </span>
                </div>
                <button onClick={() => setCurrentUser(null)} title="Đăng xuất" className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setAuthMode('login'); setAuthError(''); setShowAuthModal(true); }} className="flex items-center gap-1 px-4 py-2 text-sm font-bold rounded-xl text-[#FF9AA2] hover:bg-[#FFDAC1]/20 transition-colors"><LogIn className="w-4 h-4" /> Đăng nhập</button>
                <button onClick={() => { setAuthMode('register'); setAuthError(''); setShowAuthModal(true); }} className="flex items-center gap-1 px-4 py-2 text-sm font-bold rounded-xl bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white shadow-md transition-all"><UserPlus className="w-4 h-4" /> Đăng ký</button>
              </div>
            )}
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-[#B5EAD7]' : 'bg-[#FFDAC1]/20 border-[#FFB7B2]/40 text-[#FF9AA2]'}`}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className={`border-t ${darkMode ? 'border-slate-800' : 'border-[#FFB7B2]/20'}`}>
          <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto items-center gap-2 scrollbar-hide">
            {[
              { id: 'home', label: 'Trang chủ', IconComp: Sparkles },
              { id: 'books', label: 'Thư viện', IconComp: BookOpen },
              { id: 'forum', label: 'Diễn đàn', IconComp: MessageSquare },
              ...(userRole === 'Author' || userRole === 'Admin' ? [{ id: 'publish', label: 'Đăng Truyện', IconComp: PlusCircle }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedBook(null); setReadingChapterIndex(null); }}
                className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-[#FF9AA2] text-[#FF9AA2]' : 'border-transparent text-slate-500 hover:text-[#FFB7B2]'}`}
              >
                <tab.IconComp className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* VIEW: READING OR NOVEL DETAIL */}
        {selectedBook ? (
          readingChapterIndex !== null ? renderReadingView() : (
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-xl border border-[#FFDAC1]/30">
              <div className="flex flex-col md:flex-row gap-8">
                <img src={selectedBook.cover} alt="Cover" className="w-48 h-72 object-cover rounded-2xl shadow-lg shrink-0 mx-auto md:mx-0" />
                <div className="flex-1">
                  <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">{selectedBook.title}</h1>
                  <p className="text-lg font-bold text-slate-600 mb-4 flex items-center">
                    Tác giả: <span className="text-[#FF9AA2] ml-2">{selectedBook.author}</span>
                    {getAuthorKhiVanBadge(selectedBook.sao || 0)}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedBook.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-[#E2F0CB] text-emerald-800 text-xs font-bold rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-500 mb-6 border-y border-slate-100 dark:border-slate-700 py-3">
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {selectedBook.chapters.length} Chương</span>
                    <span className="flex items-center gap-1 text-[#D37340]"><Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> {selectedBook.sao || 0} Khí vận</span>
                    <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {selectedBook.views || 0} Lượt xem</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Văn án:</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedBook.summary}</p>
                  
                  {userRole === 'Admin' && (
                    <button onClick={() => handleDeleteBook(selectedBook.id)} className="mt-6 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" /> Xoá Truyện Này (Admin)
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-12">
                <h3 className="text-xl font-black mb-4 flex items-center gap-2 border-b pb-2"><List className="w-5 h-5 text-[#FF9AA2]"/> Danh sách chương</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedBook.chapters.map((ch, idx) => (
                    <button 
                      key={ch.id} 
                      onClick={() => { setReadingChapterIndex(idx); increaseView(selectedBook.id, ch.id); window.scrollTo(0,0); }}
                      className="text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#FF9AA2] hover:bg-[#FFDAC1]/10 transition-colors flex justify-between items-center group"
                    >
                      <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#FF9AA2] truncate pr-4">{ch.title}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3"/>{ch.views || 0}</span>
                        <span className="flex items-center gap-0.5 text-[#D37340]"><Star className="w-3 h-3"/>{ch.sao || 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : (
          /* MAIN TABS VIEWS */
          <>
            {activeTab === 'home' && renderHome()}

            {activeTab === 'books' && (
              <div className="space-y-6">
                 {/* Lọc Tag logic... có thể thêm menu dropdown đơn giản ở đây */}
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {books.map(book => (
                       <div key={book.id} onClick={() => setSelectedBook(book)} className="group cursor-pointer">
                          <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-md mb-3 border border-[#E2F0CB]">
                            <img src={book.cover} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-[#FF9AA2]">{book.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">{book.author}</p>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            {activeTab === 'publish' && (userRole === 'Author' || userRole === 'Admin') && (
              <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-[#FFDAC1]/50">
                 <h2 className="text-2xl font-black text-[#FF9AA2] mb-6 flex items-center gap-2"><PlusCircle className="w-6 h-6"/> Đăng Tác Phẩm Mới</h2>
                 <div className="space-y-6">
                    <input type="text" placeholder="Tên truyện..." value={bookForm.title} onChange={e=>setBookForm({...bookForm, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:border-[#FF9AA2] bg-slate-50 outline-none font-bold" />
                    
                    <div>
                      <p className="font-bold text-sm mb-2">Gắn thẻ (Tags):</p>
                      <div className="flex flex-wrap gap-2">
                        {["Trinh thám", "Tình cảm", "Huyền huyễn", "Tu tiên", "Kinh dị"].map(tag => (
                          <label key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={formTags.includes(tag)} onChange={e => e.target.checked ? setFormTags([...formTags, tag]) : setFormTags(formTags.filter(t=>t!==tag))} className="rounded text-[#FF9AA2]" />
                            <span className="text-sm">{tag}</span>
                          </label>
                        ))}
                        {customTags.map(tag => (
                          <label key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[#E2F0CB] cursor-pointer">
                            <input type="checkbox" checked={formTags.includes(tag)} onChange={e => e.target.checked ? setFormTags([...formTags, tag]) : setFormTags(formTags.filter(t=>t!==tag))} className="rounded text-[#FF9AA2]" />
                            <span className="text-sm font-bold">{tag}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                         <input type="text" value={newCustomTag} onChange={e=>setNewCustomTag(e.target.value)} placeholder="Tag tự do (Sáng tạo)..." className="px-3 py-1.5 text-sm rounded-lg border outline-none focus:border-[#FF9AA2]" />
                         <button onClick={() => { if(newCustomTag.trim() && !customTags.includes(newCustomTag.trim())) setCustomTags([...customTags, newCustomTag.trim()]); setNewCustomTag(''); }} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-bold">Thêm Tag</button>
                      </div>
                    </div>

                    <textarea placeholder="Văn án (Giới thiệu nội dung)..." value={bookForm.summary} onChange={e=>setBookForm({...bookForm, summary: e.target.value})} rows={4} className="w-full px-4 py-3 rounded-xl border focus:border-[#FF9AA2] bg-slate-50 outline-none" />

                    <div className="border-t pt-6">
                      <h3 className="font-black text-lg mb-4 text-[#D37340]">Quản lý Chương</h3>
                      {chaptersForm.map((ch, i) => (
                        <div key={i} className="mb-4 p-4 rounded-xl border border-slate-200 bg-slate-50 relative">
                          <input type="text" placeholder={`Tên chương ${i+1}`} value={ch.title} onChange={e=>{const newChs=[...chaptersForm]; newChs[i].title=e.target.value; setChaptersForm(newChs);}} className="w-full px-3 py-2 mb-3 rounded-lg border outline-none font-bold text-sm" />
                          <textarea placeholder="Nội dung chương..." value={ch.content} onChange={e=>{const newChs=[...chaptersForm]; newChs[i].content=e.target.value; setChaptersForm(newChs);}} rows={6} className="w-full px-3 py-2 rounded-lg border outline-none text-sm" />
                        </div>
                      ))}
                      <button onClick={()=>setChaptersForm([...chaptersForm, {title:'', content:''}])} className="flex items-center gap-2 px-4 py-2 bg-[#FFDAC1] text-[#D37340] font-bold rounded-xl hover:bg-[#FFB7B2] hover:text-white transition-colors">
                        <PlusCircle className="w-4 h-4"/> Thêm Chương Nữa
                      </button>
                    </div>

                    <button onClick={handlePublish} className="w-full py-4 bg-[#FF9AA2] text-white font-black rounded-xl shadow-lg hover:-translate-y-1 transition-transform text-lg mt-6">
                       Xuất Bản Tác Phẩm
                    </button>
                 </div>
              </div>
            )}
            
            {activeTab === 'forum' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#B5EAD7]/30 p-6 rounded-3xl border border-[#B5EAD7] text-center">
                   <h2 className="text-2xl font-black text-emerald-800 mb-2">Diễn Đàn Cộng Đồng</h2>
                   <p className="text-emerald-700">Chia sẻ, bình luận và tích luỹ Uy tín để trở thành Vua Sách!</p>
                </div>
                {reviews.map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-[#FF9AA2] flex items-center">{r.author} {getReputationBadge(r.authorReputation, r.authorRole)}</div>
                          <div className="text-xs text-slate-500 mt-1">Đánh giá về truyện: <strong>{books.find(b=>b.id===r.bookId)?.title || "Truyện đã xoá"}</strong></div>
                        </div>
                     </div>
                     <p className="text-slate-700">{r.text}</p>
                     <button onClick={() => handleLikeReview(r.id)} className="self-start flex items-center gap-2 px-3 py-1.5 bg-[#FFDAC1]/30 hover:bg-[#FFDAC1] text-[#D37340] rounded-full text-sm font-bold transition-colors">
                        <ThumbsUp className="w-4 h-4" /> Hữu ích ({r.likes})
                     </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL THÔNG BÁO LỖI/THÀNH CÔNG */}
      {showMessageModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border-2 border-[#FFB7B2]">
             <CheckCircle className="w-12 h-12 text-[#FF9AA2] mx-auto mb-4" />
             <p className="font-bold text-lg text-slate-800 mb-6">{showMessageModal.text}</p>
             <button onClick={() => setShowMessageModal({ show: false, text: '' })} className="px-6 py-2 bg-[#FFDAC1] hover:bg-[#FFB7B2] font-bold rounded-xl">Đóng</button>
          </div>
        </div>
      )}

      {/* MODAL AUTH */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative max-w-md w-full p-8 rounded-3xl shadow-2xl bg-white border border-[#FFB7B2]/50">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF9AA2] to-[#D37340]">
                {authMode === 'login' ? 'Đăng Nhập T714' : 'Đăng Ký Tài Khoản'}
              </h3>
            </div>
            {authError && <div className="mb-4 p-3 bg-red-100 text-red-600 text-xs font-bold rounded-xl text-center">{authError}</div>}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1 opacity-80">Tên người dùng</label>
                <input required type="text" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none focus:border-[#FF9AA2]" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 opacity-80">Mật khẩu</label>
                <input required type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 outline-none focus:border-[#FF9AA2]" />
              </div>
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold mb-1.5 opacity-80">Vai trò</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setAuthForm({...authForm, role: 'Reader'})} className={`py-2 px-3 rounded-xl border font-bold text-xs flex justify-center items-center gap-1 ${authForm.role === 'Reader' ? 'bg-[#FF9AA2] text-white' : 'bg-slate-50 text-slate-500'}`}><BookOpen className="w-3.5 h-3.5"/> Độc giả</button>
                    <button type="button" onClick={() => setAuthForm({...authForm, role: 'Author'})} className={`py-2 px-3 rounded-xl border font-bold text-xs flex justify-center items-center gap-1 ${authForm.role === 'Author' ? 'bg-[#FF9AA2] text-white' : 'bg-slate-50 text-slate-500'}`}><Sparkles className="w-3.5 h-3.5"/> Tác giả</button>
                  </div>
                </div>
              )}
              <button type="submit" className="w-full py-3.5 bg-[#FF9AA2] text-white font-bold rounded-xl mt-4">{authMode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</button>
            </form>
            <div className="mt-6 text-center text-xs opacity-80 border-t pt-4 border-slate-200">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="font-bold text-[#FF9AA2] hover:underline">
                {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RANDOM TRUYỆN */}
      {randomBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative max-w-sm w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-[#FFDAC1] text-center animate-bounce-short">
            <button onClick={() => setRandomBookModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
            <Wand2 className="w-16 h-16 mx-auto text-[#FF9AA2] mb-4 drop-shadow-md" />
            <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white">Thiên ý đã chọn!</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn hãy thử đọc tác phẩm này nhé:</p>
            <img src={randomBookModal.cover} alt="Cover" className="w-32 h-48 object-cover rounded-xl shadow-lg mx-auto mb-4 border-2 border-[#E2F0CB]" />
            <h4 className="font-black text-[#FF9AA2] text-xl mb-1">{randomBookModal.title}</h4>
            <p className="text-sm font-bold text-[#D37340] mb-6">Tác giả: {randomBookModal.author}</p>
            <button 
              onClick={() => { setSelectedBook(randomBookModal); setRandomBookModal(null); setActiveTab('books'); }}
              className="w-full py-3 bg-gradient-to-r from-[#FF9AA2] to-[#FFB7B2] text-white font-black rounded-xl shadow-md hover:-translate-y-1 transition-transform"
            >
              Đọc Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}