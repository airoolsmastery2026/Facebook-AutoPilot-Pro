
# Facebook AutoPilot Pro – Trợ lý AI 24/7

Một ứng dụng thông minh để tự động hóa mọi hoạt động trên Facebook 24/7, sử dụng AI để tạo và đăng nội dung, tương tác với bài viết, tham gia nhóm và tối ưu hóa tương tác.

## Tính năng

-   **Trợ lý Nội dung**: Tạo các bài đăng Facebook hấp dẫn từ một chủ đề.
-   **Trợ lý Hình ảnh**: Tạo hình ảnh độc đáo, do AI tạo ra cho nội dung của bạn.
-   **Trợ lý Video**: Sản xuất video từ mô tả văn bản và hình ảnh tham khảo tùy chọn.
-   **Trợ lý Lên lịch**: Lên lịch đăng bài vào các thời điểm tối ưu.
-   **Trợ lý Tương tác**: Tự động thích và tương tác với các bài đăng.
-   **Trợ lý Nhóm**: Tìm và tham gia các nhóm Facebook có liên quan.
-   **Nhật ký Hoạt động**: Theo dõi tất cả các hoạt động của trợ lý trong thời gian thực.

## Bắt đầu

Làm theo các hướng dẫn sau để có một bản sao của dự án và chạy trên máy cục bộ của bạn cho mục đích phát triển và thử nghiệm.

### Yêu cầu

-   [Node.js](https://nodejs.org/) (khuyến nghị phiên bản 18.x trở lên)
-   [npm](https://www.npmjs.com/) (thường đi kèm với Node.js)

### Cài đặt

1.  **Sao chép kho mã nguồn:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Cài đặt các gói phụ thuộc:**
    Đây là một bước quan trọng bị thiếu. Nó cài đặt Vite và tất cả các gói cần thiết khác.
    ```bash
    npm install
    ```

### Biến môi trường

Dự án này yêu cầu một khóa API Google Gemini để hoạt động.

Trong môi trường triển khai của bạn (ví dụ: Vercel, Netlify), bạn phải cấu hình khóa này dưới dạng một biến môi trường có tên **`VITE_API_KEY`**.

**Quan trọng:** Tên phải bắt đầu bằng `VITE_` để ứng dụng có thể truy cập được nó.

### Chạy ứng dụng

1.  **Khởi động máy chủ phát triển:**
    ```bash
    npm run dev
    ```
    Lệnh này sẽ khởi động máy chủ phát triển Vite. Mở trình duyệt của bạn và truy cập vào URL được cung cấp (thường là `http://localhost:5173`).

2.  **Xây dựng cho môi trường sản phẩm:**
    ```bash
    npm run build
    ```
    Đây là lệnh mà nền tảng triển khai của bạn sẽ chạy. Nó đóng gói ứng dụng vào thư mục `dist/`, sẵn sàng để triển khai.

---

Dự án này hiện đã được cấu hình đúng cách để đẩy lên một kho chứa Git và triển khai trên bất kỳ nhà cung cấp dịch vụ lưu trữ hiện đại nào.
