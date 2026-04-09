# Cấu hình Google Drive cho “Thi thử 4 kỹ năng” (OAuth refresh token)

Web lưu bài nộp lên **Google Drive** của một tài khoản Google (thường admin trung tâm), dùng **OAuth 2.0** với **refresh token** lưu trên server. Không dùng service account.

**Biến môi trường cần có (đủ tất cả):**

| Biến | Ý nghĩa |
|------|---------|
| `GOOGLE_CLIENT_ID` | Client ID từ Google Cloud |
| `GOOGLE_CLIENT_SECRET` hoặc `GOOGLE_SECRET` | Client secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token (bí mật, không commit) |
| `GOOGLE_DRIVE_FOLDER_ID` **hoặc** `MOCK_SKILL_DRIVE_PARENT_FOLDER_ID` | ID thư mục gốc trên Drive (nơi tạo folder con cho từng bài nộp) |
| `GOOGLE_OAUTH_REDIRECT_URI` | *Tuỳ chọn.* Chỉ cần nếu bạn **không** lấy token qua OAuth Playground (mặc định code dùng URI của Playground). |

Scope phải bao gồm quyền ghi Drive, ví dụ: `https://www.googleapis.com/auth/drive`.

---

## Lỗi `redirect_uri_mismatch` (400) khi bấm Authorize trên OAuth Playground

Google chỉ chấp nhận redirect URI đã **khai báo trước** cho đúng OAuth Client. Playground luôn dùng URI cố định sau (sao chép nguyên, **không** thêm `/` cuối):

`https://developers.google.com/oauthplayground`

**Làm ngay:**

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Mở **OAuth 2.0 Client ID** mà bạn đang dán vào Playground (phải là loại **Web application**, không phải Desktop).
3. Mục **Authorized redirect URIs** → **ADD URI** → dán **chính xác**:
   - `https://developers.google.com/oauthplayground`
4. **Save** (Lưu). Đợi 1–5 phút rồi thử **Authorize APIs** lại trên Playground.
5. Nếu vẫn lỗi: kiểm tra bạn đang dùng đúng **Client ID / Secret** của client **vừa thêm URI** (đôi khi có nhiều client trong project).

Sau khi có `refresh_token`, app Next.js của bạn mặc định cũng dùng cùng redirect đó trong code (`getOAuthRedirectUri`), nên **không** cần đổi `GOOGLE_OAUTH_REDIRECT_URI` nếu lấy token qua Playground.

---

## Bước 1: Google Cloud — tạo / chọn project

1. Mở [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn project có sẵn hoặc **Tạo project** mới (ví dụ `ielts-center-drive`).
3. Ghi nhớ **Project** này — Client ID/Secret gắn với project.

---

## Bước 2: Bật Google Drive API

1. Menu **APIs & Services** → **Library**.
2. Tìm **Google Drive API** → **Enable**.

---

## Bước 3: Màn hình đồng ý OAuth (OAuth consent screen)

1. **APIs & Services** → **OAuth consent screen**.
2. Chọn **External** (hoặc Internal nếu chỉ tổ chức Google Workspace).
3. Điền tên ứng dụng, email hỗ trợ, developer contact.
4. **Scopes** → **Add or Remove Scopes** → tìm và thêm:
   - `https://www.googleapis.com/auth/drive`  
   (hoặc `.../auth/drive.file` nếu bạn cố ý chỉ tạo file app quản lý — cần test kỹ; hướng dẫn này dùng `drive` cho đơn giản.)
5. **Test users** (khi app ở chế độ *Testing*): **Add users** → thêm **đúng Gmail** bạn sẽ bấm “Allow” khi xin token (thường là chủ thư mục Drive).
6. Lưu.

---

## Bước 4: Tạo OAuth Client ID (kiểu Web)

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. Nếu được hỏi, chọn **Application type** = **Web application**.
3. **Name**: ví dụ `Drive upload — local/dev`.
4. **Authorized redirect URIs** → **Add URI** (bắt buộc để Playground hoạt động):
   - `https://developers.google.com/oauthplayground`
   - Không thêm path khác, không `http`, không dấu `/` thừa ở cuối.
5. **Create** → copy **Client ID** và **Client Secret**.

**Không dùng loại “Desktop”** cho flow Playground + refresh token trong hướng dẫn này — hãy tạo client **Web application** và URI như trên. Nếu Google báo **redirect_uri_mismatch**: xem mục cùng tên ở đầu file.

---

## Bước 5: Lấy Refresh token (OAuth 2.0 Playground)

1. Mở [https://developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Góc phải trên → biểu tượng **⚙ (OAuth 2.0 configuration)**:
   - Bật **Use your own OAuth credentials**.
   - Dán **OAuth Client ID** và **OAuth Client secret** (từ bước 4).
   - **Close**.
3. **Step 1 — Select & authorize APIs**:
   - Trong ô tìm kiếm scope, chọn **Drive API v3** → tick scope dùng `https://www.googleapis.com/auth/drive` (hoặc đúng scope bạn đã thêm ở consent screen).
   - **Authorize APIs** → đăng nhập Gmail **đã nằm trong Test users** (nếu app đang Testing) → **Allow**.
4. **Step 2 — Exchange authorization code for tokens**:
   - **Exchange authorization code for tokens**.
5. Ở cột phải xem JSON phản hồi: copy giá trị **`refresh_token`** (chuỗi dài, bắt đầu thường giống `1//0g...`).

**Lưu ý:**

- Nếu **không thấy** `refresh_token` lần đầu: Google đôi khi chỉ trả khi người dùng **đồng ý lần đầu**. Thử **Thu hồi quyền** app tại [Google Account — Security — Third-party access](https://myaccount.google.com/permissions) rồi làm lại bước Authorize.
- Playground mặc định dùng redirect `https://developers.google.com/oauthplayground` — trùng với URI bạn đã thêm ở GCP.

---

## Bước 6: Thư mục Google Drive gốc & Folder ID

1. Đăng nhập **cùng Gmail** đã authorize ở bước 5.
2. [Google Drive](https://drive.google.com/) → tạo thư mục mới, ví dụ `Mock thi thử — bài nộp`.
3. Mở thư mục — trên thanh địa chỉ URL dạng:
   `https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXX`
   → phần `XXXXXXXXXXXXXXXX` là **Folder ID** → dùng cho `GOOGLE_DRIVE_FOLDER_ID` hoặc `MOCK_SKILL_DRIVE_PARENT_FOLDER_ID`.

App sẽ tạo **thư mục con** cho từng lần nộp bên trong thư mục này.

---

## Bước 7: Gán vào `.env.local` (local) hoặc hosting (production)

Trong thư mục `web/`, file `.env.local` (không commit):

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REFRESH_TOKEN=1//0...
GOOGLE_DRIVE_FOLDER_ID=XXXXXXXXXXXXXXXX
```

Nếu bạn lấy refresh token **không** qua Playground (ví dụ `http://localhost:3000/...`): thêm:

```env
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/your-callback-path
```

(phải trùng URI đã cấu hình trên GCP và dùng khi đổi code.)

Khởi động lại `npm run dev`.

**Deploy (Vercel, v.v.):** thêm cùng các biến trong phần Environment Variables của project — không commit vào Git.

---

## Bước 8: Dev tạm không upload Drive

```env
MOCK_SKILL_SKIP_DRIVE=true
```

Khi bật, nộp bài vẫn lưu Supabase / điểm nhưng **không** gọi Drive (tiện khi chưa xong OAuth).

---

## Sự cố thường gặp

| Triệu chứng | Hướng xử lý |
|-------------|-------------|
| `redirect_uri_mismatch` | Trên GCP → OAuth client, **Authorized redirect URIs** phải có **chính xác** URI của flow bạn dùng (Playground hoặc localhost). |
| `invalid_grant` | Refresh token bị thu hồi / Client secret đổi / sai `GOOGLE_OAUTH_REDIRECT_URI`. Làm lại bước Playground, cập nhật env. |
| `access_denied` | Consent screen: Gmail chưa trong **Test users** (app đang Testing). |
| Upload 403 / không thấy file | Folder ID sai; hoặc Gmail authorize khác Gmail sở hữu thư mục. Dùng cùng một tài khoản hoặc folder được share đủ quyền. |

---

## Bảo mật

- **Client secret** và **refresh token** là bí mật: chỉ lưu trên server / secret manager, không đưa vào repo hay `NEXT_PUBLIC_*`.
- Nếu lộ refresh token: xóa quyền app trên tài khoản Google, tạo lại client secret (nếu cần), lấy refresh token mới.
