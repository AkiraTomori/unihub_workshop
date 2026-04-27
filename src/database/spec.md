Đặc tả CSDL:
Dự kiến là dùng SQL bởi vì hệ thống này có liên quan đến thanh toán tiền và đặt chỗ.
Tiền thì sẽ rất cần độ chính xác cao nên không thể dùng NoSQl.
Đặt chỗ thì có liên quan đến độ chính xác và Race Condition
Một số cái khác có thể sử dụng đa hệ quản trị nếu có thể.

Nhưng dự kiến sẽ là sử dụng duy nhất một cái với PostgreSQL Supabase
Ngoài ra có thể sẽ sử dụng Redis để tăng tốc độ truy xuất và giải quyết bài toán HIT và Miss
(Redis sẽ dùng image và containers)