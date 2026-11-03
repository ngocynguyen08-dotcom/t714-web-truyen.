                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* CÁC MODAL KHÁC */}
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
