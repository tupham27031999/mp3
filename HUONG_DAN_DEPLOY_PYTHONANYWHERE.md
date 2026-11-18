# HƯỚNG DẪN TRIỂN KHAI LÊN PYTHONANYWHERE (BẢN MIỄN PHÍ)

Hướng dẫn từng bước chi tiết giúp bạn đưa trang web học tiếng Trung qua bài hát lên mạng Internet hoàn toàn miễn phí, truy cập được từ mọi điện thoại và máy tính.

---

## BƯỚC 1: ĐĂNG KÝ TÀI KHOẢN PYTHONANYWHERE
1. Truy cập: [https://www.pythonanywhere.com/](https://www.pythonanywhere.com/)
2. Bấm **"Pricing & signup"** ➔ Chọn cột **"Create a Beginner account"** (Miễn phí 100%).
3. Điền Tên đăng nhập (`Username`), Email và Mật khẩu.
   * *Lưu ý:* Địa chỉ web của bạn sau này sẽ có dạng: `https://<tên-đăng-nhập>.pythonanywhere.com`.

---

## BƯỚC 2: TẢI CODE LÊN PYTHONANYWHERE

### Cách 1: Tải file Zip qua giao diện Web (Dễ nhất cho người mới)
1. Trên máy tính của bạn, nén toàn bộ thư mục `c:\tupn\code\mp3` thành file `mp3.zip`.
2. Đăng nhập vào PythonAnywhere ➔ Vào mục **Files**.
3. Bấm **"Upload a file"** và chọn tải file `mp3.zip` lên thư mục `/home/<username>/`.
4. Mở tab **Consoles** ➔ Bấm vào **"Bash"** để mở cửa sổ lệnh.
5. Gõ lệnh sau để giải nén:
   ```bash
   unzip mp3.zip -d mp3
   ```

### Cách 2: Cài đặt thư viện cần thiết
Vẫn trong cửa sổ **Bash Console** ở trên, gõ lệnh sau để cài đặt `pypinyin`:
```bash
pip install --user pypinyin
```

---

## BƯỚC 3: CẤU HÌNH WEB APP

1. Vào tab **Web** trên thanh menu của PythonAnywhere.
2. Bấm nút màu xanh **"Add a new web app"**.
3. Bấm **Next** ➔ Chọn **Manual configuration (not Django)** ➔ Chọn **Python 3.10** hoặc **Python 3.11**.
4. Bấm **Next** để hoàn tất khởi tạo.

---

## BƯỚC 4: CẤU HÌNH ĐƯỜNG DẪN VÀ FILE WSGI

### 1. Cấu hình Source code & Working directory:
Tại trang tab **Web** vừa tạo:
- **Source code:** Điền `/home/<username>/mp3`
- **Working directory:** Điền `/home/<username>/mp3`

### 2. Cấu hình file WSGI (Rất quan trọng):
- Tìm mục **Code** ➔ Nhấp vào liên kết đường dẫn file có chữ: `/var/www/<username>_pythonanywhere_com_wsgi.py`.
- Xoá hết toàn bộ nội dung cũ trong file đó và dán đoạn code sau vào:

```python
import sys
import os

# Đường dẫn đến thư mục dự án
project_home = '/home/<username>/mp3'
if project_home not in sys.path:
    sys.path.append(project_home)

# Nạp ứng dụng Flask từ file app.py
from app import app as application
```
*(Nhớ thay `<username>` bằng tên tài khoản PythonAnywhere của bạn).*
- Bấm nút **Save** màu xanh ở góc trên bên phải.

### 3. Cấu hình Static Files (Để tải giao diện CSS/JS mượt mà):
Kéo xuống mục **Static files**:
- Dòng 1:
  - **URL:** `/static/`
  - **Directory:** `/home/<username>/mp3/static`

---

## BƯỚC 5: TẬN HƯỞNG TRANG WEB!
1. Kéo lên đầu trang tab **Web**, bấm nút màu xanh to bản: **"Reload <username>.pythonanywhere.com"**.
2. Mở trình duyệt trên điện thoại hoặc máy tính, truy cập:
   👉 `https://<username>.pythonanywhere.com`
3. Bạn đã có thể học từng câu bài *"Quan Sơn Tửu"*, *"Đồng Thoại"* hoặc tự thêm bài mới mọi lúc mọi nơi!
