# HƯỚNG DẪN DỌN DẸP PYTHONANYWHERE & TRIỂN KHAI TỪ GITHUB
**Link repository:** `https://github.com/tupham27031999/mp3.git`

---

## PHẦN 1: DỌN DẸP & RESET SẠCH SẼ BỘ NHỚ CŨ (GIẢI PHÓNG 512MB)

Tài khoản miễn phí của PythonAnywhere có hạn mức 512MB. Trước khi tải dự án mới lên, bạn nên dọn dẹp sạch sẽ theo các bước sau:

### Bước 1: Mở cửa sổ dòng lệnh (Bash Console)
1. Đăng nhập vào [PythonAnywhere](https://www.pythonanywhere.com/).
2. Nhấp vào tab **Consoles** trên thanh menu.
3. Trong mục **Recent consoles** nếu có các console cũ đang mở, bạn bấm nút **X** bên cạnh để tắt hết đi.
4. Bấm vào chữ **Bash** để mở một cửa sổ dòng lệnh mới.

### Bước 2: Kiểm tra dung lượng hiện tại
Gõ lệnh sau vào cửa sổ Bash và nhấn Enter:
```bash
quota -s
```
*(Lệnh này hiển thị xem bạn đang dùng bao nhiêu MB trên tổng số 512MB).*

### Bước 3: Xoá sạch các thư mục rác ngốn bộ nhớ
Chạy lần lượt các lệnh sau để dọn dẹp:

```bash
# 1. Xoá bộ nhớ đệm của pip (Cực kỳ quan trọng, thường ngốn 100 - 300MB)
rm -rf ~/.cache

# 2. Xoá các môi trường ảo cũ nếu có
rm -rf ~/.virtualenvs/*

# 3. Liệt kê các thư mục cũ đang có trong tài khoản
ls -la

# 4. Xoá các thư mục dự án cũ (Ví dụ nếu có thư mục cũ tên là mysite hoặc test):
# Thay "ten_thu_muc_cu" bằng tên thư mục bạn muốn xoá:
# rm -rf ten_thu_muc_cu
```
*Lưu ý: Không xoá các file hệ thống ẩn bắt đầu bằng dấu chấm như `.bashrc`, `.profile`.*

### Bước 4: Xoá cấu hình Web App cũ (Nếu muốn làm mới từ đầu)
1. Nhấp vào tab **Web** trên thanh menu.
2. Nếu trang này đang có một Web App cũ: Kéo xuống dưới cùng, bấm nút màu đỏ: **"Delete <username>.pythonanywhere.com"** để xoá sạch cấu hình web cũ.

---

## PHẦN 2: TẢI CODE TỪ GITHUB VỀ PYTHONANYWHERE

Vẫn tại cửa sổ **Bash Console** (trong tab Consoles):

### Bước 1: Kéo code từ GitHub về
Gõ lệnh sau:
```bash
cd ~
git clone https://github.com/tupham27031999/mp3.git
```
Sau khi tải xong, bạn gõ `ls` sẽ thấy xuất hiện thư mục `mp3`.

### Bước 2: Cài đặt thư viện cần thiết
Dùng lệnh sau (lưu ý cờ `--no-cache-dir` để **tiết kiệm 100% dung lượng đệm**, không bị đầy 512MB):
```bash
cd ~/mp3
pip install --user --no-cache-dir -r requirements.txt
```

---

## PHẦN 3: CẤU HÌNH VÀ CHẠY WEB APP

### Bước 1: Tạo Web App mới
1. Nhấp vào tab **Web** trên thanh menu.
2. Bấm nút màu xanh: **"Add a new web app"**.
3. Bấm **Next** ➔ Chọn **Manual configuration (not Django)** ➔ Chọn **Python 3.11** (hoặc 3.10).
4. Bấm **Next** để hoàn tất tạo web app.

### Bước 2: Cấu hình đường dẫn thư mục
Kéo xuống phần thông tin cấu hình:
- **Source code:** Điền `/home/tupham/mp3`
- **Working directory:** Điền `/home/tupham/mp3`

### Bước 3: Cấu hình file WSGI (Rất quan trọng)
1. Tại phần **Code**, tìm dòng chữ xanh có định dạng: `/var/www/tupham_pythonanywhere_com_wsgi.py` và nhấp vào nó.
2. Xoá **toàn bộ** nội dung đang có trong file đó và thay bằng đoạn mã sau:

```python
import sys
import os

# Đường dẫn thư mục dự án
project_home = '/home/tupham/mp3'
if project_home not in sys.path:
    sys.path.append(project_home)

# Nạp ứng dụng Flask từ app.py
from app import app as application
```
3. Bấm nút màu xanh **"Save"** ở góc trên bên phải.

### Bước 4: Cấu hình Static Files (Để tải CSS và JavaScript)
1. Quay lại tab **Web**, kéo xuống mục **Static files**.
2. Thêm một dòng mới:
   - Cột **URL:** `/static/`
   - Cột **Directory:** `/home/tupham/mp3/static`
3. Nhấn vào dấu tích xanh để lưu lại.

### Bước 5: Bật Web
1. Kéo lên đầu trang tab **Web**, bấm nút màu xanh lớn: **"Reload tupham.pythonanywhere.com"**.
2. Mở trình duyệt trên máy tính hoặc điện thoại, truy cập vào:
   👉 **`https://tupham.pythonanywhere.com`**

---

## PHẦN 4: CÁCH CẬP NHẬT CODE SAU NÀY
Mỗi khi bạn sửa code ở máy tính và đẩy lên Git (`git push`), bạn chỉ cần làm 2 bước đơn giản để web trên PythonAnywhere tự cập nhật:
1. Mở **Bash Console** trên PythonAnywhere gõ:
   ```bash
   cd ~/mp3 && git pull
   ```
2. Vào tab **Web** ➔ Bấm nút **Reload**.
Xong! Web của bạn sẽ được cập nhật phiên bản mới nhất ngay lập tức.
