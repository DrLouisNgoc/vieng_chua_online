# Milestone 7: ngày/đêm, đèn lồng, tụng kinh, mõ tự gõ, âm thanh

## Đã làm
- Trời sáng/tối theo giờ máy bạn; tối thì đèn lồng đỏ dọc lối đi và trước
  điện sáng lên. Muốn xem trước ban đêm lúc đang ban ngày: thêm `?gio=21`
  vào địa chỉ (ví dụ http://localhost:5173/?gio=21).
- Nút "Tu tập" góc trên bên phải: chọn bài (Niệm A Di Đà Phật, Niệm Quán
  Thế Âm, Bát Nhã Tâm Kinh), Bắt đầu/Dừng tụng. Chữ sáng lên theo từng
  tiếng mõ; số câu/biến được đếm và lưu trên máy. Đang tụng thì nhân vật
  chắp tay, người khác cũng thấy. Đi lại là dừng tụng.
- Mõ tự gõ (Bật/Tắt) và Âm thanh nền (Bật/Tắt) trong cùng bảng.
- Đến gần lầu chuông, bấm E "Thỉnh chuông".

## Cần bạn làm
1. **Tải 3 file âm thanh miễn phí (CC0)** từ BigSoundBank (trang này chặn
   tải tự động nên mình không tự tải). Trên mỗi trang, chọn định dạng MP3
   rồi bấm tải, đổi tên và đặt vào `app/public/thirdparty/audio/`:
   - https://bigsoundbank.com/campagne-s0097.html → `ambience-countryside.mp3`
   - https://bigsoundbank.com/gong-strong-2-s1484.html → `bell-gong.mp3`
   - https://bigsoundbank.com/tibetan-bowl-struck-s1110.html → `bowl-struck.mp3`

   Xong báo mình để mình thử và đánh dấu đã dùng.
2. **Soát lại Bát Nhã Tâm Kinh** trong `app/src/chant-texts.ts`: mình gõ
   theo bản phiên âm Hán-Việt quen thuộc nhưng chưa đối chiếu với sách.

## Lưu ý
- Ban ngày tốc độ gần như không đổi; ban đêm có thể chậm hơn vài ms.
- Tiếng chuông chỉ người thỉnh nghe, người khác chưa nghe được.
