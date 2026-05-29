class ApiConfig {
  // Change this to your backend domain or IP
  static const String baseDomain = "snowiness-nucleus-majestic.ngrok-free.dev";

  static String get baseUrl {
    return 'https://$baseDomain/api/delivery';
  }

  static String get login => '$baseUrl/login';
  static String get orders => '$baseUrl/orders';
  static String get fcmRegister => '$baseUrl/fcm-token';
  static String get fcmUnregister => '$baseUrl/fcm-token';

  static String orderDetail(int id) => '$baseUrl/orders/$id';
  static String orderStatus(int id) => '$baseUrl/orders/$id/status';
}
