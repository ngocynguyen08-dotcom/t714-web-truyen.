import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Crown, Award, ThumbsUp, Shuffle, MessageSquare, 
  Shield, UserCheck, Moon, Sun, PlusCircle, Eye, CheckCircle, 
  Sparkles, Send, ImagePlus, Trash2, List, FileText, ChevronLeft, ChevronRight, Wand2,
  MessageCircle, X, Hash, Star, LogIn, UserPlus, LogOut, Lock, User, Heart, Bookmark, Edit3, Settings,
  Save, Clock, ArrowLeft, Check
} from 'lucide-react';

// === IMPORT FIREBASE ===
import { db, auth, storage } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, onSnapshot
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DEFAULT_LOGO_URL = "image_3c2d84.jpg";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); 
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({ username: '', password: '', role: 'Reader' });
  
  const [showChangePass, setShowChangePass] = useState(false);
  const [changePassForm, setChangePassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [changePassMsg, setChangePassMsg] = useState({ type: '', text: '' });
  
  const [currentUser, setCurrentUser] = useState(null);

  const [usersDb, setUsersDb] = useState(() => {
    const saved = localStorage.getItem('t714_users_db');
    if (saved) {
      return JSON.parse(saved).map(({ password, ...user }) => user);
    }
    return [
      { username: "Admin T714", role: "Admin", reputation: 1200 },
      { username: "Độc giả T714", role: "Reader", reputation: 85 },
      { username: "Lưu Lang Thần", role: "Author", reputation: 350 },
      { username: "Mộng Tiên", role: "Author", reputation: 90 }
    ];
  });

  const [books, setBooks] = useState([]); 
  const [isFetchingBooks, setIsFetchingBooks] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        return;
      }
      try {
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setCurrentUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...profileSnap.data() });
        } else {
          setCurrentUser({ uid: firebaseUser.uid, email: firebaseUser.email, username: firebaseUser.email, role: 'Reader', reputation: 0 });
        }
      } catch (error) {
        console.error('Không tải được hồ sơ người dùng:', error);
        setCurrentUser(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'books'),
      (querySnapshot) => {
        const booksData = querySnapshot.docs.map(bookDoc => ({
          id: bookDoc.id,
          ...bookDoc.data()
        }));
        setBooks(booksData);
        setIsFetchingBooks(false);
      },
      (error) => {
        console.error('Lỗi đồng bộ truyện từ Firestore:', error);
        setIsFetchingBooks(false);
        showMsg(`Không thể tải dữ liệu truyện: ${error.message}`);
      }
    );
    return unsubscribe;
  }, []);

  const [selectedBook, setSelectedBook] = useState(null);
  
  useEffect(() => {
    if (selectedBook) {
      const currentLatest = books.find(b => b.id === selectedBook.id);
      if (!currentLatest) {
        setSelectedBook(null);
      } else if (JSON.stringify(currentLatest) !== JSON.stringify(selectedBook)) {
        setSelectedBook(currentLatest);
      }
    }
  }, [books, selectedBook]);

  const [reviews, setReviews] = useState([]);
  const [inlineComments, setInlineComments] = useState({});
  const [savedBookIds, setSavedBookIds] = useState({});
  
  const [readingProgress, setReadingProgress] = useState(() => {
    const saved = localStorage.getItem('t714_reading_progress');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const unsubReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData.sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsubAppData = onSnapshot(doc(db, 'appData', 'globalData'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.inlineComments) setInlineComments(data.inlineComments);
        if (data.savedBookIds) setSavedBookIds(data.savedBookIds);
        if (data.readingProgress) setReadingProgress(prev => ({ ...prev, ...data.readingProgress }));
      } else {
        setDoc(doc(db, 'appData', 'globalData'), { inlineComments: {}, savedBookIds: {}, readingProgress: {} });
      }
    });

    return () => { unsubReviews(); unsubAppData(); };
  }, []);

  const [readingChapterIndex, setReadingChapterIndex] = useState(null);
  const [randomBookModal, setRandomBookModal] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState({ show: false, text: '' });
  const [newReviewText, setNewReviewText] = useState('');

  const [bookForm, setBookForm] = useState({ title: '', cover: '', summary: '' });
  const [formTags, setFormTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [chaptersForm, setChaptersForm] = useState([{ title: '', content: '' }]);

  const [editingBook, setEditingBook] = useState(null);

  const [editorState, setEditorState] = useState({
    active: false, mode: 'create', bookId: null, chapterId: null, title: '', content: ''
  });
  const [saveStatus, setSaveStatus] = useState('saved');

  const showMsg = (text) => setShowMessageModal({ show: true, text });

  // === ĐÃ SỬA LỖI ĐỒNG BỘ Ở HÀM NÀY ===
  const openChapterEditor = (mode, bookId, chapter = null) => {
    const draftKey = `t714_draft_${bookId}_${chapter ? chapter.id : 'new'}`;
    
    let initialTitle = chapter ? chapter.title : '';
    let initialContent = chapter ? chapter.content : '';

    // Chỉ load nháp cục bộ nếu đang TẠO MỚI.
    // Nếu ĐANG SỬA, ưu tiên dữ liệu từ đám mây (Firebase) và bỏ qua nháp cũ để tránh đè dữ liệu.
    if (mode === 'create') {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          initialTitle = parsed.title || initialTitle;
          initialContent = parsed.content || initialContent;
        } catch (e) { console.error(e); }
      }
    } else {
      localStorage.removeItem(draftKey);
    }

    setEditorState({
      active: true, mode, bookId,
      chapterId: chapter ? chapter.id : null,
      title: initialTitle, content: initialContent
    });
    setSaveStatus('saved');
  };

  useEffect(() => {
    if (!editorState.active) return;
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      setSaveStatus('saving');
      const draftKey = `t714_draft_${editorState.bookId}_${editorState.chapterId || 'new'}`;
      localStorage.setItem(draftKey, JSON.stringify({ title: editorState.title, content: editorState.content, updatedAt: Date.now() }));
      setTimeout(() => setSaveStatus('saved'), 400);
    }, 1000);
    return () => clearTimeout(timer);
  }, [editorState.title, editorState.content, editorState.active]);

  useEffect(() => { localStorage.setItem('t714_users_db', JSON.stringify(usersDb)); }, [usersDb]);
  
  const userRole = currentUser ? currentUser.role : 'Guest';

  const usernameToEmail = (username) => {
    const normalized = username.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
    return `${normalized}@t714-account.com`;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const inputName = authForm.username.trim();
    if (!inputName || !authForm.password.trim()) {
      setAuthError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    const email = usernameToEmail(inputName);
    if (!email || email.startsWith('@')) {
      setAuthError('Tên tài khoản không hợp lệ.');
      return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, authForm.password);
        setShowAuthModal(false);
      } else {
        if (authForm.password.length < 6) {
          setAuthError('Mật khẩu phải có ít nhất 6 ký tự.');
          return;
        }
        const credential = await createUserWithEmailAndPassword(auth, email, authForm.password);
        const profile = {
          username: inputName, usernameKey: inputName.toLowerCase(), role: 'Reader', reputation: 0, createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', credential.user.uid), profile);
        setCurrentUser({ uid: credential.user.uid, email, ...profile });
        setShowAuthModal(false);
        showMsg('Đăng ký tài khoản thành công. Tài khoản mới mặc định là Độc giả.');
      }
      setAuthForm({ username: '', password: '', role: 'Reader' });
    } catch (error) {
      console.error('Lỗi xác thực Firebase:', error);
      const messages = {
        'auth/invalid-credential': 'Tên tài khoản hoặc mật khẩu không đúng.',
        'auth/user-not-found': 'Không tìm thấy tài khoản.',
        'auth/wrong-password': 'Mật khẩu không chính xác.',
        'auth/email-already-in-use': 'Tên tài khoản này đã tồn tại.',
        'auth/weak-password': 'Mật khẩu cần có ít nhất 6 ký tự.',
        'auth/invalid-email': 'Tên tài khoản không hợp lệ.'
      };
      setAuthError(messages[error.code] || `Không thể xác thực: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showMsg('Đã đăng xuất tài khoản.');
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
      showMsg('Không thể đăng xuất. Vui lòng thử lại.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!changePassForm.oldPass || !changePassForm.newPass || !changePassForm.confirmPass) {
      setChangePassMsg({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin.' });
      return;
    }
    if (changePassForm.newPass.length < 6) {
      setChangePassMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (changePassForm.newPass !== changePassForm.confirmPass) {
      setChangePassMsg({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, changePassForm.oldPass);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, changePassForm.newPass);
      setChangePassMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setTimeout(() => {
        setShowChangePass(false);
        setChangePassForm({ oldPass: '', newPass: '', confirmPass: '' });
        setChangePassMsg({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      console.error('Lỗi đổi mật khẩu:', error);
      const message = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
        ? 'Mật khẩu cũ không chính xác.'
        : error.code === 'auth/requires-recent-login'
          ? 'Phiên đăng nhập đã cũ. Hãy đăng xuất rồi đăng nhập lại trước khi đổi mật khẩu.'
          : `Không thể đổi mật khẩu: ${error.message}`;
      setChangePassMsg({ type: 'error', text: message });
    }
  };

  const getReputationBadge = (reputation, role) => {
    if (role === 'Admin') return <span className="ml-1 inline-flex items-center justify-center bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 text-transparent bg-clip-text font-black text-xs px-2 py-0.5 rounded-full border border-purple-300 shadow-sm">Thiên đạo</span>;
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

  const isBookSaved = (bookId) => {
    if (!currentUser) return false;
    const userSaved = savedBookIds[currentUser.username] || [];
    return userSaved.includes(bookId);
  };

  const toggleSaveBook = (bookId) => {
    if (!currentUser) { showMsg("Vui lòng đăng nhập để lưu truyện vào tủ sách!"); return; }
    const userSaved = savedBookIds[currentUser.username] || [];
    let updated;
    if (userSaved.includes(bookId)) { updated = userSaved.filter(id => id !== bookId); showMsg("Đã xóa truyện khỏi Tủ sách."); } 
    else { updated = [...userSaved, bookId]; showMsg("Đã lưu truyện vào Tủ sách!"); }
    
    const newSavedData = { ...savedBookIds, [currentUser.username]: updated };
    setSavedBookIds(newSavedData);
    setDoc(doc(db, 'appData', 'globalData'), { savedBookIds: newSavedData }, { merge: true }).catch(console.error);
  };

  const saveReadingProgress = (bookId, chapterIndex) => {
    if (!currentUser) return;
    const key = `${currentUser.username}_${bookId}`;
    const newProgress = { ...readingProgress, [key]: chapterIndex };
    setReadingProgress(newProgress);
    localStorage.setItem('t714_reading_progress', JSON.stringify(newProgress));
    setDoc(doc(db, 'appData', 'globalData'), { readingProgress: newProgress }, { merge: true }).catch(console.error);
  };

  const getSavedChapterIndex = (bookId) => {
    if (!currentUser) return 0;
    const key = `${currentUser.username}_${bookId}`;
    return readingProgress[key] !== undefined ? readingProgress[key] : 0;
  };

  const handleAddSaoSongTu = async (bookId, chapterId) => {
    if (!currentUser) { showMsg("Vui lòng đăng nhập để tặng sao!"); return; }

    const targetBook = books.find(b => b.id === bookId);
    if (!targetBook) return;

    let alreadyLiked = false;
    const updatedChapters = (targetBook.chapters || []).map(c => {
      if (c.id === chapterId) {
        const likedBy = c.likedBy || [];
        if (likedBy.includes(currentUser.username)) { alreadyLiked = true; return c; }
        return { ...c, sao: (c.sao || 0) + 1, likedBy: [...likedBy, currentUser.username] };
      }
      return c;
    });

    if (alreadyLiked) { showMsg("Bạn đã tặng sao cho chương này rồi!"); return; }

    const updatedBook = { ...targetBook, sao: (targetBook.sao || 0) + 1, chapters: updatedChapters };
    setBooks(books.map(b => b.id === bookId ? updatedBook : b));
    setSelectedBook(updatedBook);
    
    try {
      await updateDoc(doc(db, "books", bookId), { sao: updatedBook.sao, chapters: updatedBook.chapters });
    } catch (e) { console.error("Lỗi cập nhật sao", e); }
    showMsg("Cảm ơn bạn đã tặng sao ủng hộ tác giả!");
  };

  const increaseView = async (bookId, chapterId) => {
    const targetBook = books.find(b => b.id === bookId);
    if (!targetBook) return;
    
    const updatedViews = (targetBook.views || 0) + 1;
    const updatedChapters = targetBook.chapters.map(c => c.id === chapterId ? { ...c, views: (c.views || 0) + 1 } : c);
    
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, views: updatedViews, chapters: updatedChapters } : b));
    
    try {
      await updateDoc(doc(db, "books", bookId), { views: updatedViews, chapters: updatedChapters });
    } catch (e) { console.error(e); }
  };

  const handleRoll = () => {
    const candidates = books.filter(b => (b.sao || 0) >= 0);
    if (candidates.length === 0) { showMsg("Chưa có truyện nào để gieo quẻ!"); return; }
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    setRandomBookModal(random);
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    if (!formTags.includes(tag)) setFormTags([...formTags, tag]);
    setCustomTagInput('');
  };

  const handlePublish = async () => {
    if (!bookForm.title || !bookForm.summary || formTags.length === 0) {
      showMsg("Vui lòng điền đủ Tên truyện, Thể loại và Văn án!");
      return;
    }
    const newBookData = {
      title: bookForm.title,
      author: currentUser.username,
      cover: bookForm.cover || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400",
      tags: formTags,
      summary: bookForm.summary,
      sao: 0,
      views: 0,
      chapters: chaptersForm.map((ch, i) => ({ id: i + 1, title: ch.title || `Chương ${i+1}`, content: ch.content, sao: 0, views: 0 }))
    };

    try {
      showMsg("Đang xử lý đăng truyện...");
      const docRef = await addDoc(collection(db, "books"), newBookData);
      const bookWithId = { ...newBookData, id: docRef.id };
      
      setBooks([bookWithId, ...books]);
      setBookForm({ title: '', cover: '', summary: '' });
      setFormTags([]);
      setChaptersForm([{ title: '', content: '' }]);
      showMsg("Đăng truyện thành công lên Đám Mây!");
      setActiveTab('books');
    } catch (error) {
      console.error("Lỗi khi thêm truyện: ", error);
      showMsg(`Không thể đăng truyện: ${error.message}`);
    }
  };

  const handleSaveBookDetails = async () => {
    if (!editingBook) return;
    try {
      await updateDoc(doc(db, "books", editingBook.id), {
        title: editingBook.title,
        cover: editingBook.cover,
        summary: editingBook.summary
      });
      setBooks(books.map(b => b.id === editingBook.id ? editingBook : b));
      setEditingBook(null);
      showMsg("Đã cập nhật thông tin truyện!");
    } catch (error) {
      console.error("Lỗi sửa truyện: ", error);
      showMsg("Không thể cập nhật truyện!");
    }
  };

  const handleDeleteBook = async (bookId) => {
    const targetBook = books.find(b => b.id === bookId);
    if (!targetBook) return;

    if (userRole !== 'Admin' && targetBook.author !== currentUser.username) {
      showMsg("Bạn chỉ có quyền xóa truyện do chính mình sáng tác!");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn xoá truyện này vĩnh viễn không?")) return;
    try {
      await deleteDoc(doc(db, "books", bookId));
      setBooks(books.filter(b => b.id !== bookId));
      if (selectedBook && selectedBook.id === bookId) setSelectedBook(null);
      showMsg("Đã xoá truyện thành công khỏi hệ thống!");
    } catch (error) {
      console.error("Lỗi xóa truyện: ", error);
      showMsg(`Không thể xoá truyện: ${error.message}`);
    }
  };

  const handlePublishChapterFromEditor = async () => {
    if (!editorState.title.trim() || !editorState.content.trim()) { showMsg("Vui lòng nhập đầy đủ tiêu đề và nội dung chương!"); return; }
    const targetBook = books.find(b => b.id === editorState.bookId);
    if (!targetBook) return;

    let updatedChapters = [...(targetBook.chapters || [])];
    if (editorState.mode === 'create') {
      updatedChapters.push({ id: Date.now(), title: editorState.title, content: editorState.content, sao: 0, views: 0 });
    } else {
      updatedChapters = updatedChapters.map(c => c.id === editorState.chapterId ? { ...c, title: editorState.title, content: editorState.content } : c);
    }

    try {
      showMsg("Đang lưu chương...");
      await updateDoc(doc(db, "books", targetBook.id), { chapters: updatedChapters });
      setBooks(books.map(b => b.id === targetBook.id ? { ...b, chapters: updatedChapters } : b));
      
      const draftKey = `t714_draft_${editorState.bookId}_${editorState.chapterId || 'new'}`;
      localStorage.removeItem(draftKey);
      setEditorState({ active: false, mode: 'create', bookId: null, chapterId: null, title: '', content: '' });
      showMsg(editorState.mode === 'create' ? "Đã xuất bản chương mới!" : "Đã lưu cập nhật nội dung chương!");
    } catch (error) {
      console.error("Lỗi lưu chương: ", error);
      showMsg("Có lỗi xảy ra khi lưu chương!");
    }
  };

  const handleDeleteChapter = async (bookId, chapterId) => {
    if (!window.confirm("Bạn muốn xóa chương này?")) return;
    const targetBook = books.find(b => b.id === bookId);
    if (!targetBook) return;

    const updatedChapters = (targetBook.chapters || []).filter(c => c.id !== chapterId);
    try {
      await updateDoc(doc(db, "books", bookId), { chapters: updatedChapters });
      setBooks(books.map(b => b.id === bookId ? { ...b, chapters: updatedChapters } : b));
      showMsg("Đã xoá chương!");
    } catch (error) {
      console.error("Lỗi xóa chương: ", error);
      showMsg("Lỗi khi xóa chương!");
    }
  };

  const handleImageUpload = async (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!currentUser?.uid) {
      showMsg('Vui lòng đăng nhập trước khi tải ảnh bìa.');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showMsg('Vui lòng chọn một tệp hình ảnh.');
      e.target.value = '';
      return;
    }
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const imageRef = ref(storage, `book-covers/${currentUser.uid}/${Date.now()}_${safeName}`);
      await uploadBytes(imageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(imageRef);
      callback(downloadUrl);
    } catch (error) {
      console.error('Lỗi tải ảnh lên Firebase Storage:', error);
      showMsg(`Không thể tải ảnh lên: ${error.message}`);
    }
  };

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

  const handleDeleteReview = (reviewId) => {
    setReviews(reviews.filter(r => r.id !== reviewId));
    showMsg("Đã xoá bài đăng trên diễn đàn.");
  };

  const renderHome = () => {
    const topSaoBooks = [...books].sort((a, b) => (b.sao || 0) - (a.sao || 0)).slice(0, 10);
    return (
      <div className="max-w-6xl mx-auto space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 animate-pulse" />
            <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-500 to-[#FF9AA2] bg-clip-text text-transparent">Top 10 Bảng Xếp Hạng</h2>
          </div>
          {isFetchingBooks ? (
             <div className="text-center py-12"><p className="text-slate-500 font-bold animate-pulse">Đang kết nối Đám Mây lấy truyện...</p></div>
          ) : topSaoBooks.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-[#FFB7B2]/50">
              <p className="text-slate-500 font-medium">Kho truyện trống rỗng. Hãy trở thành người chắp bút đầu tiên nha ^^</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topSaoBooks.map((book, idx) => (
                <div key={book.id} onClick={() => { setSelectedBook(book); setActiveTab('books'); }} className="group flex bg-white dark:bg-slate-800 rounded-2xl p-3 border border-[#E2F0CB] hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1 overflow-hidden relative">
                  <div className="absolute top-0 right-0 bg-[#FF9AA2] text-white font-black px-3 py-1 rounded-bl-xl z-10 shadow-sm">#{idx + 1}</div>
                  <img src={book.cover} alt="cover" className="w-24 h-32 object-cover rounded-xl shadow-md group-hover:scale-105 transition-transform" />
                  <div className="ml-4 flex-1 py-1">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 line-clamp-1">{book.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-2">Tác giả: {book.author}</p>
                    <div className="flex items-center gap-3 text-xs font-bold text-[#D37340]">
                      <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> {book.sao || 0} Khí vận</span>
                      <span className="flex items-center gap-1 text-slate-400"><Eye className="w-4 h-4" /> {book.views || 0} Lượt xem</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="py-16 text-center bg-gradient-to-br from-[#FFDAC1]/40 to-[#FFB7B2]/40 rounded-3xl shadow-inner border border-white/50 relative overflow-hidden">
          <Wand2 className="absolute -top-10 -right-10 w-48 h-48 text-[#FF9AA2]/20 rotate-12" />
          <h2 className="text-3xl font-black mb-4 text-[#D37340]">Gieo Quẻ Khám Phá</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto">Không biết nên đọc gì? Hãy để thiên ý chọn giúp bạn một tác phẩm xuất sắc nhất từ kệ truyện!</p>
          <button onClick={handleRoll} className="px-8 py-4 bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white font-black rounded-full shadow-[0_8px_30px_rgb(255,154,162,0.5)] transition-all hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-2 mx-auto text-lg">
            <Shuffle className="w-6 h-6" /> Bắt Đầu Gieo Quẻ
          </button>
        </section>
      </div>
    );
  };

  const renderReadingView = () => {
    const chapter = selectedBook.chapters[readingChapterIndex];
    if (!chapter) return null;
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

        <div className="p-8 md:p-12 font-sans">
          {paras.map((para, idx) => {
             const commentKey = `${selectedBook.id}_${chapter.id}_${idx}`;
             const parasComments = inlineComments[commentKey] || [];
             const isCommenting = activeTab === `comment_${commentKey}`;
             
             return (
               <div key={idx} className="relative group mb-6">
                 <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap">{para}</p>
                 
                 <button 
                    onClick={() => setActiveTab(isCommenting ? 'reading' : `comment_${commentKey}`)}
                    className="absolute -right-2 top-0 md:-right-10 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[#FFDAC1]/50 text-[#D37340] rounded-full hover:bg-[#FFDAC1] shadow-sm z-10"
                 >
                    <MessageCircle className="w-4 h-4" />
                    {parasComments.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{parasComments.length}</span>}
                 </button>

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
                               const newComments = {...inlineComments, [commentKey]: [...parasComments, { author: currentUser.username, authorRole: currentUser.role, authorReputation: currentUser.reputation, text: e.target.value }]};
                               setInlineComments(newComments);
                               setDoc(doc(db, 'appData', 'globalData'), { inlineComments: newComments }, { merge: true }).catch(console.error);
                               e.target.value = '';
                            }
                         }}
                       />
                       <button 
                         onClick={() => {
                            const input = document.getElementById(`input_${commentKey}`);
                            if(input && input.value.trim()) {
                               if(!currentUser) { showMsg("Vui lòng đăng nhập để bình luận."); return; }
                               const newComments = {...inlineComments, [commentKey]: [...parasComments, { author: currentUser.username, authorRole: currentUser.role, authorReputation: currentUser.reputation, text: input.value }]};
                               setInlineComments(newComments);
                               setDoc(doc(db, 'appData', 'globalData'), { inlineComments: newComments }, { merge: true }).catch(console.error);
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

        <div className="py-12 border-t border-[#FFDAC1]/50 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/20">
          <p className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Hết Chương</p>
          <button onClick={() => handleAddSaoSongTu(selectedBook.id, chapter.id)} className="group flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-[#FF9AA2] p-0.5 shadow-lg group-hover:scale-110 transition-transform">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 group-hover:animate-spin-slow" />
              </div>
            </div>
            <span className="font-bold text-[#D37340] text-sm group-hover:text-[#FF9AA2] transition-colors">Tặng Sao Song Tử</span>
            <span className="text-xs font-black bg-[#FFDAC1] text-[#D37340] px-3 py-1 rounded-full">{chapter.sao || 0} Lượt Thích</span>
          </button>
        </div>

        <div className="bg-[#FFDAC1]/20 p-4 border-t border-[#FFDAC1]/50 flex items-center justify-between">
          <button 
            disabled={readingChapterIndex === 0}
            onClick={() => { 
              const nextIdx = readingChapterIndex - 1;
              setReadingChapterIndex(nextIdx); 
              saveReadingProgress(selectedBook.id, nextIdx);
              increaseView(selectedBook.id, selectedBook.chapters[nextIdx].id); 
              window.scrollTo(0,0); 
            }}
            className="px-4 py-2 font-bold text-sm text-slate-600 disabled:opacity-30 flex items-center gap-1 hover:text-[#FF9AA2]"
          >
            <ChevronLeft className="w-4 h-4"/> Chương trước
          </button>
          <button 
            disabled={readingChapterIndex === selectedBook.chapters.length - 1}
            onClick={() => { 
              const nextIdx = readingChapterIndex + 1;
              setReadingChapterIndex(nextIdx); 
              saveReadingProgress(selectedBook.id, nextIdx);
              increaseView(selectedBook.id, selectedBook.chapters[nextIdx].id); 
              window.scrollTo(0,0); 
            }}
            className="px-4 py-2 font-bold text-sm text-slate-600 disabled:opacity-30 flex items-center gap-1 hover:text-[#FF9AA2]"
          >
            Chương sau <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      </div>
    );
  };

  if (editorState.active) {
    const wordCount = editorState.content.trim() ? editorState.content.trim().split(/\s+/).length : 0;
    const targetBook = books.find(b => b.id === editorState.bookId);

    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
        <header className={`sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setEditorState({ active: false, mode: 'create', bookId: null, chapterId: null, title: '', content: '' })} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-red-500 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Trở về Quản lý
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">{targetBook?.title || 'Đang sáng tác'}</span>
              <span className="text-sm font-black text-[#FF9AA2]">{editorState.mode === 'create' ? 'Tạo chương mới' : 'Chỉnh sửa chương'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {saveStatus === 'saving' && <span className="text-amber-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5 animate-spin"/> Đang tự động lưu...</span>}
              {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5"/> Đã lưu nháp</span>}
              {saveStatus === 'unsaved' && <span className="text-slate-400">Đang gõ...</span>}
            </div>
            <button onClick={handlePublishChapterFromEditor} className="px-5 py-2 bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white font-black rounded-xl shadow-md text-sm transition-transform hover:scale-105 flex items-center gap-2">
              <Save className="w-4 h-4"/> {editorState.mode === 'create' ? 'Xuất Bản Chương' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col">
          <div className={`flex-1 rounded-2xl shadow-xl p-8 md:p-12 flex flex-col border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <input type="text" placeholder="Nhập tiêu đề chương (VD: Chương 1: Cuộc chạm trán)..." value={editorState.title} onChange={e => setEditorState({ ...editorState, title: e.target.value })} className="text-2xl md:text-3xl font-black mb-6 pb-3 border-b border-slate-100 dark:border-slate-800 outline-none bg-transparent text-[#D37340] placeholder-slate-300 dark:placeholder-slate-600" />
            <textarea placeholder="Bắt đầu viết câu chuyện của bạn tại đây... (Nội dung sẽ tự động lưu lại theo thời gian thực)" value={editorState.content} onChange={e => setEditorState({ ...editorState, content: e.target.value })} className="flex-1 w-full text-lg leading-relaxed outline-none resize-none bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 font-sans min-h-[500px]" />
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>Đã tự động bảo vệ chữ gõ tránh rớt mạng</span>
              <span>Tổng số từ: <strong className="text-[#FF9AA2]">{wordCount}</strong> từ</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/90 border-[#FFB7B2]/30 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div onClick={() => { setActiveTab('home'); setSelectedBook(null); setReadingChapterIndex(null); }} className="flex items-center gap-3 cursor-pointer">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md border-2 border-[#FF9AA2] shrink-0 bg-[#FFDAC1]">
              <img src={DEFAULT_LOGO_URL} alt="T714 Logo" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://placehold.co/150x150/FF9AA2/white?text=T714"; }} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#FF9AA2] to-[#D37340] bg-clip-text text-transparent hidden sm:inline-block">Sau thứ sáu ngày mười ba (T714)</span>
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
                <button onClick={() => setShowChangePass(true)} title="Đổi mật khẩu" className="p-2 rounded-xl border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors"><Lock className="w-4 h-4" /></button>
                <button onClick={handleLogout} title="Đăng xuất" className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"><LogOut className="w-4 h-4" /></button>
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
              ...(currentUser ? [{ id: 'bookshelf', label: 'Tủ sách của tôi', IconComp: Bookmark }] : []),
              { id: 'forum', label: 'Diễn đàn', IconComp: MessageSquare },
              ...(userRole === 'Author' || userRole === 'Admin' ? [
                { id: 'manage', label: 'Quản lý truyện', IconComp: Settings },
                { id: 'publish', label: 'Đăng Truyện', IconComp: PlusCircle }
              ] : [])
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedBook(null); setReadingChapterIndex(null); }} className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-[#FF9AA2] text-[#FF9AA2]' : 'border-transparent text-slate-500 hover:text-[#FFB7B2]'}`}>
                <tab.IconComp className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedBook ? (
          readingChapterIndex !== null ? renderReadingView() : (
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-xl border border-[#FFDAC1]/30">
              <div className="flex flex-col md:flex-row gap-8">
                <img src={selectedBook.cover} alt="Cover" className="w-48 h-72 object-cover rounded-2xl shadow-lg shrink-0 mx-auto md:mx-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">{selectedBook.title}</h1>
                    <button onClick={() => toggleSaveBook(selectedBook.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${isBookSaved(selectedBook.id) ? 'bg-[#FF9AA2] text-white border-[#FF9AA2]' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      <Bookmark className="w-4 h-4" /> {isBookSaved(selectedBook.id) ? 'Đã lưu' : 'Lưu truyện'}
                    </button>
                  </div>

                  <p className="text-lg font-bold text-slate-600 mb-4 flex items-center">
                    Tác giả: <span className="text-[#FF9AA2] ml-2">{selectedBook.author}</span>
                    {getAuthorKhiVanBadge(selectedBook.sao || 0)}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedBook.tags.map(tag => <span key={tag} className="px-3 py-1 bg-[#E2F0CB] text-emerald-800 text-xs font-bold rounded-full">{tag}</span>)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-500 mb-6 border-y border-slate-100 dark:border-slate-700 py-3">
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {selectedBook.chapters.length} Chương</span>
                    <span className="flex items-center gap-1 text-[#D37340]"><Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> {selectedBook.sao || 0} Khí vận</span>
                    <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {selectedBook.views || 0} Lượt xem</span>
                  </div>

                  {currentUser && selectedBook.chapters.length > 0 && (
                    <button 
                      onClick={() => {
                        const savedIdx = getSavedChapterIndex(selectedBook.id);
                        setReadingChapterIndex(savedIdx);
                        increaseView(selectedBook.id, selectedBook.chapters[savedIdx].id);
                        window.scrollTo(0,0);
                      }}
                      className="mb-6 w-full sm:w-auto px-6 py-3 bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" /> Tiếp tục đọc (Chương {getSavedChapterIndex(selectedBook.id) + 1})
                    </button>
                  )}

                  <h3 className="font-bold text-lg mb-2">Văn án:</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedBook.summary}</p>
                  
                  {(userRole === 'Admin' || (userRole === 'Author' && selectedBook.author === currentUser?.username)) && (
                    <button onClick={() => handleDeleteBook(selectedBook.id)} className="mt-6 flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" /> Xoá Truyện Này
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
                      onClick={() => { 
                        setReadingChapterIndex(idx); 
                        saveReadingProgress(selectedBook.id, idx);
                        increaseView(selectedBook.id, ch.id); 
                        window.scrollTo(0,0); 
                      }}
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
          <>
            {activeTab === 'home' && renderHome()}

            {activeTab === 'books' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-[#FF9AA2] mb-4">Thư Viện Truyện</h2>
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

            {activeTab === 'bookshelf' && currentUser && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <h2 className="text-2xl font-black text-[#FF9AA2] mb-4 flex items-center gap-2"><Bookmark className="w-6 h-6"/> Tủ Sách Của Tôi</h2>
                {(!savedBookIds[currentUser.username] || savedBookIds[currentUser.username].length === 0) ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500">Tủ sách của bạn đang trống. Hãy tìm truyện yêu thích và bấm nút "Lưu truyện" nhé!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {books.filter(b => isBookSaved(b.id)).map(book => {
                      const lastChapterIdx = getSavedChapterIndex(book.id);
                      return (
                        <div key={book.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4">
                          <img src={book.cover} alt="cover" className="w-20 h-28 object-cover rounded-xl shrink-0" />
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{book.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">Tác giả: {book.author}</p>
                              <p className="text-xs text-[#FF9AA2] font-bold mt-2">Đang đọc: {book.chapters[lastChapterIdx]?.title || 'Chương 1'}</p>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => { setSelectedBook(book); setReadingChapterIndex(lastChapterIdx); saveReadingProgress(book.id, lastChapterIdx); increaseView(book.id, book.chapters[lastChapterIdx]?.id); window.scrollTo(0,0); }}
                                className="px-3 py-1.5 bg-[#FF9AA2] text-white text-xs font-bold rounded-lg hover:bg-[#FFB7B2]"
                              >
                                Tiếp tục đọc
                              </button>
                              <button onClick={() => toggleSaveBook(book.id)} className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100">Bỏ lưu</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manage' && (userRole === 'Author' || userRole === 'Admin') && (
              <div className="max-w-5xl mx-auto space-y-6">
                <h2 className="text-2xl font-black text-[#FF9AA2] mb-4 flex items-center gap-2"><Settings className="w-6 h-6"/> Quản Lý Truyện Đã Đăng</h2>

                {books.filter(b => userRole === 'Admin' || b.author === currentUser.username).length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500">Bạn chưa đăng tác phẩm nào. Hãy bấm sang tab "Đăng Truyện" để sáng tác nhé!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {books.filter(b => userRole === 'Admin' || b.author === currentUser.username).map(book => (
                      <div key={book.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-md">
                        <div className="flex flex-col md:flex-row gap-6">
                          <img src={book.cover} alt="cover" className="w-32 h-44 object-cover rounded-2xl shrink-0 mx-auto md:mx-0 shadow-md" />
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap justify-between items-start gap-2">
                              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{book.title}</h3>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingBook(book)} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-blue-100"><Edit3 className="w-3.5 h-3.5" /> Sửa ảnh & văn án</button>
                                <button onClick={() => handleDeleteBook(book.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /> Xoá truyện</button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{book.summary}</p>
                            <div className="flex gap-2">
                              {book.tags.map(t => <span key={t} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded-full">{t}</span>)}
                            </div>
                            <div className="border-t pt-4 mt-4">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">Danh sách chương ({book.chapters.length})</h4>
                                <button onClick={() => openChapterEditor('create', book.id)} className="px-3 py-1.5 bg-[#FF9AA2] text-white font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-[#FFB7B2]"><PlusCircle className="w-3.5 h-3.5" /> Viết chương mới</button>
                              </div>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {book.chapters.map(ch => (
                                  <div key={ch.id} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-bold">
                                    <span className="truncate pr-4">{ch.title}</span>
                                    <div className="flex gap-3 shrink-0">
                                      <button onClick={() => openChapterEditor('edit', book.id, ch)} className="text-blue-500 hover:underline">Sửa chương</button>
                                      <button onClick={() => handleDeleteChapter(book.id, ch.id)} className="text-red-500 hover:underline">Xoá</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'forum' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-2xl font-black text-[#FF9AA2] mb-4">Diễn Đàn Độc Giả</h2>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-[#FFDAC1] shadow-sm">
                  <textarea rows="3" placeholder="Viết cảm nghĩ, đề cử truyện của bạn..." value={newReviewText} onChange={e => setNewReviewText(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-sm" />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-slate-400">Tự do chia sẻ cảm xúc về tác phẩm</span>
                    <button 
                      onClick={() => {
                        if(!currentUser) { showMsg("Vui lòng đăng nhập để gửi bài!"); return; }
                        if(!newReviewText.trim()) return;
                        setReviews([{ id: Date.now(), author: currentUser.username, authorRole: currentUser.role, authorReputation: currentUser.reputation, text: newReviewText, likes: 0 }, ...reviews]);
                        setNewReviewText('');
                      }}
                      className="px-4 py-2 bg-[#FF9AA2] text-white font-bold rounded-xl text-sm shadow-md hover:bg-[#FFB7B2]"
                    >
                      Đăng bài
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative group">
                      {userRole === 'Admin' && <button onClick={() => handleDeleteReview(r.id)} className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Xoá bài đăng này"><Trash2 className="w-4 h-4" /></button>}
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">{r.author} {getReputationBadge(r.authorReputation, r.authorRole)}</div>
                        <button onClick={() => handleLikeReview(r.id)} className={`flex items-center gap-1 text-xs font-bold text-[#FF9AA2] bg-[#FFDAC1]/30 px-3 py-1 rounded-full ${userRole === 'Admin' ? 'mr-10' : ''}`}><Heart className="w-3.5 h-3.5 fill-[#FF9AA2]" /> {r.likes}</button>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'publish' && (userRole === 'Author' || userRole === 'Admin') && (
              <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-[#FFDAC1]/50">
                <h2 className="text-2xl font-black text-[#FF9AA2] mb-6 flex items-center gap-2"><PlusCircle className="w-6 h-6"/> Đăng Tác Phẩm Mới</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Tên truyện</label>
                    <input type="text" placeholder="Tên truyện..." value={bookForm.title} onChange={e=>setBookForm({...bookForm, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:border-[#FF9AA2] bg-slate-50 dark:bg-slate-900 outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Tải Ảnh Bìa Lên</label>
                    <div className="flex items-center gap-4">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (imgData) => setBookForm({...bookForm, cover: imgData}))} className="w-full px-4 py-2 rounded-xl border focus:border-[#FF9AA2] bg-slate-50 dark:bg-slate-900 outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#FFDAC1] file:text-[#D37340] hover:file:bg-[#FFB7B2] cursor-pointer" />
                      {bookForm.cover && <div className="shrink-0"><img src={bookForm.cover} alt="Preview" className="w-12 h-16 object-cover rounded-md shadow-md" /></div>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Thể loại</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['Trinh thám', 'Kinh dị', 'Tình cảm', 'Cổ đại', 'Huyền huyễn'].map(tag => (
                        <button key={tag} type="button" onClick={() => setFormTags(formTags.includes(tag) ? formTags.filter(t=>t!==tag) : [...formTags, tag])} className={`px-3 py-1 rounded-full text-xs font-bold border ${formTags.includes(tag) ? 'bg-[#FF9AA2] text-white border-[#FF9AA2]' : 'bg-slate-100 text-slate-600'}`}>{tag}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Gõ tag tự chỉnh (VD: Trọng sinh, Ngược văn)..." value={customTagInput} onChange={e => setCustomTagInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddCustomTag(); } }} className="flex-1 px-4 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none" />
                      <button type="button" onClick={handleAddCustomTag} className="px-4 py-2 bg-[#D37340] text-white font-bold rounded-xl text-xs">Thêm Tag</button>
                    </div>
                    {formTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs font-bold text-slate-400">Tag đã thêm:</span>
                        {formTags.map(t => <span key={t} className="px-2.5 py-0.5 bg-[#E2F0CB] text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">{t} <X className="w-3 h-3 cursor-pointer" onClick={() => setFormTags(formTags.filter(item => item !== t))} /></span>)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Văn án</label>
                    <textarea rows="4" placeholder="Giới thiệu về tác phẩm..." value={bookForm.summary} onChange={e=>setBookForm({...bookForm, summary: e.target.value})} className="w-full px-4 py-3 rounded-xl border focus:border-[#FF9AA2] bg-slate-50 dark:bg-slate-900 outline-none text-sm" />
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="font-bold text-lg mb-4">Nội dung Chương 1</h3>
                    <input type="text" placeholder="Tên chương (VD: Chương 1: Mở đầu)" value={chaptersForm[0].title} onChange={e => setChaptersForm([{...chaptersForm[0], title: e.target.value}])} className="w-full px-4 py-2 mb-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm font-bold" />
                    <textarea rows="8" placeholder="Nội dung câu chuyện..." value={chaptersForm[0].content} onChange={e => setChaptersForm([{...chaptersForm[0], content: e.target.value}])} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm" />
                  </div>
                  <button onClick={handlePublish} className="w-full py-4 bg-[#FF9AA2] hover:bg-[#FFB7B2] text-white font-black rounded-2xl shadow-lg transition-all text-lg">Xuất Bản Ngay</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {editingBook && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative border border-blue-200">
            <button onClick={() => setEditingBook(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            <h3 className="text-xl font-black text-blue-500 mb-4">Sửa Thông Tin Truyện</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Tên truyện</label>
                <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border text-sm font-bold bg-slate-50 dark:bg-slate-900 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Thay đổi Ảnh Bìa</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, (imgData) => setEditingBook({...editingBook, cover: imgData}))} className="w-full text-xs"/>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Văn án</label>
                <textarea rows="5" value={editingBook.summary} onChange={e => setEditingBook({...editingBook, summary: e.target.value})} className="w-full px-4 py-2 rounded-xl border text-sm bg-slate-50 dark:bg-slate-900 outline-none" />
              </div>
              <button onClick={handleSaveBookDetails} className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-md">Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-[#FFDAC1]">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            <h3 className="text-2xl font-black text-[#FF9AA2] mb-2 text-center">{authMode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h3>
            <p className="text-xs text-slate-400 text-center mb-6">Tham gia cộng đồng đọc truyện T714</p>
            {authError && <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-xs font-bold text-center">{authError}</div>}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Tên tài khoản</label>
                <input type="text" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm font-bold" placeholder="Nhập tên..." />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Mật khẩu</label>
                <input type="password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm font-bold" placeholder="Nhập mật khẩu..." />
              </div>
              {authMode === 'register' && (
                <p className="text-xs text-slate-500">Tài khoản mới mặc định là Độc giả. Quản trị viên sẽ cấp quyền Tác giả sau khi đăng ký.</p>
              )}
              <button type="submit" className="w-full py-3 bg-[#FF9AA2] text-white font-bold rounded-xl shadow-md hover:bg-[#FFB7B2] transition-colors mt-2">
                {authMode === 'login' ? 'Vào Hệ Thống' : 'Hoàn Tất Đăng Ký'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-xs font-bold text-[#D37340] hover:underline">
                {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePass && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-blue-200">
            <button onClick={() => { setShowChangePass(false); setChangePassMsg({type:'', text:''}); setChangePassForm({oldPass:'', newPass:'', confirmPass:''}); }} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            <h3 className="text-2xl font-black text-blue-500 mb-6 text-center">Đổi Mật Khẩu</h3>
            {changePassMsg.text && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-bold text-center ${changePassMsg.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{changePassMsg.text}</div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Mật khẩu cũ</label>
                <input type="password" value={changePassForm.oldPass} onChange={e => setChangePassForm({...changePassForm, oldPass: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Mật khẩu mới</label>
                <input type="password" value={changePassForm.newPass} onChange={e => setChangePassForm({...changePassForm, newPass: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Xác nhận mật khẩu mới</label>
                <input type="password" value={changePassForm.confirmPass} onChange={e => setChangePassForm({...changePassForm, confirmPass: e.target.value})} className="w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 outline-none text-sm font-bold" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-md hover:bg-blue-600 transition-colors mt-2">Cập Nhật Mật Khẩu</button>
            </form>
          </div>
        </div>
      )}

      {showMessageModal.show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-xl border border-[#FFDAC1]">
            <p className="font-bold text-slate-800 dark:text-slate-100 mb-4">{showMessageModal.text}</p>
            <button onClick={() => setShowMessageModal({ show: false, text: '' })} className="px-6 py-2 bg-[#FF9AA2] text-white font-bold rounded-xl text-sm">Đóng</button>
          </div>
        </div>
      )}

      {randomBookModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative border border-yellow-400">
            <button onClick={() => setRandomBookModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-2 animate-bounce" />
            <h3 className="text-lg font-black text-yellow-600 mb-1">Quẻ Hạp Duyên!</h3>
            <img src={randomBookModal.cover} alt="Cover" className="w-32 h-48 object-cover rounded-xl mx-auto my-3 shadow-md" />
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{randomBookModal.title}</h4>
            <p className="text-xs text-slate-500 mb-4">Tác giả: {randomBookModal.author}</p>
            <button onClick={() => { setSelectedBook(randomBookModal); setRandomBookModal(null); setActiveTab('books'); }} className="w-full py-3 bg-[#FF9AA2] text-white font-bold rounded-xl shadow-md">Đọc Truyện Ngay</button>
          </div>
        </div>
      )}
    </div>
  );
}
