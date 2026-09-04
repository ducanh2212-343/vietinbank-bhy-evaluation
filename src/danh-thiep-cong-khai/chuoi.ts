/**
 * Chữ trên giao diện trang danh thiếp công khai — 6 ngôn ngữ.
 * Nội dung nghiệp vụ (tên, chức danh, đơn vị) KHÔNG nằm ở đây: chúng đến từ từ
 * điển trong CSDL qua nc_resolve_card(). Ở đây chỉ có nhãn nút và câu thông báo.
 */
import type { MaNgonNgu } from '@/lib/danhThiep/ngonNgu';

export interface ChuoiGiaoDien {
  luuDanhBa: string;
  themVaoWallet: string;
  goi: string;
  guiEmail: string;
  chiDuong: string;
  ketNoi: string;
  quetDeThem: string;
  dong: string;
  diDong: string;
  coQuan: string;
  diaChi: string;
  website: string;
  dangTai: string;
  loiMang: string;
  thuLai: string;
  khongTimThay: string;
  daChuyenCongTac: string;
  lienHeChiNhanh: string;
  thueNgoai: string;
  ctv: string;
  thucTap: string;
  chonNgonNgu: string;
}

export const CHUOI: Record<MaNgonNgu, ChuoiGiaoDien> = {
  vi: {
    luuDanhBa: 'Lưu vào danh bạ',
    themVaoWallet: 'Thêm vào Google Wallet',
    goi: 'Gọi điện',
    guiEmail: 'Gửi email',
    chiDuong: 'Chỉ đường',
    ketNoi: 'Kết nối',
    quetDeThem: 'Mở {app}, quét mã này để thêm bạn',
    dong: 'Đóng',
    diDong: 'Di động',
    coQuan: 'Điện thoại cơ quan',
    diaChi: 'Địa chỉ',
    website: 'Website',
    dangTai: 'Đang tải danh thiếp…',
    loiMang: 'Không tải được danh thiếp. Vui lòng kiểm tra kết nối và thử lại.',
    thuLai: 'Thử lại',
    khongTimThay: 'Không tìm thấy danh thiếp này.',
    daChuyenCongTac: 'Cán bộ này đã chuyển công tác.',
    lienHeChiNhanh: 'Vui lòng liên hệ Chi nhánh',
    thueNgoai: 'Đơn vị hợp tác cung cấp dịch vụ tại VietinBank Bắc Hưng Yên',
    ctv: 'Cộng tác viên của VietinBank Bắc Hưng Yên',
    thucTap: 'Thực tập sinh tại VietinBank Bắc Hưng Yên',
    chonNgonNgu: 'Ngôn ngữ',
  },
  en: {
    luuDanhBa: 'Save contact',
    themVaoWallet: 'Add to Google Wallet',
    goi: 'Call',
    guiEmail: 'Email',
    chiDuong: 'Directions',
    ketNoi: 'Connect',
    quetDeThem: 'Open {app} and scan this code to add me',
    dong: 'Close',
    diDong: 'Mobile',
    coQuan: 'Office phone',
    diaChi: 'Address',
    website: 'Website',
    dangTai: 'Loading business card…',
    loiMang: 'Could not load the card. Please check your connection and try again.',
    thuLai: 'Retry',
    khongTimThay: 'This business card was not found.',
    daChuyenCongTac: 'This staff member has moved to another position.',
    lienHeChiNhanh: 'Please contact the branch',
    thueNgoai: 'Service partner working at VietinBank Bac Hung Yen',
    ctv: 'Collaborator of VietinBank Bac Hung Yen',
    thucTap: 'Intern at VietinBank Bac Hung Yen',
    chonNgonNgu: 'Language',
  },
  zh_hans: {
    luuDanhBa: '保存到通讯录',
    themVaoWallet: '添加到 Google Wallet',
    goi: '拨打电话',
    guiEmail: '发送邮件',
    chiDuong: '导航',
    ketNoi: '联系方式',
    quetDeThem: '打开{app}扫描此二维码添加好友',
    dong: '关闭',
    diDong: '手机',
    coQuan: '办公电话',
    diaChi: '地址',
    website: '网站',
    dangTai: '正在加载名片…',
    loiMang: '无法加载名片，请检查网络后重试。',
    thuLai: '重试',
    khongTimThay: '未找到该名片。',
    daChuyenCongTac: '该员工已调离岗位。',
    lienHeChiNhanh: '请联系分行',
    thueNgoai: '越南工商银行北兴安分行服务合作单位',
    ctv: '越南工商银行北兴安分行合作人员',
    thucTap: '越南工商银行北兴安分行实习生',
    chonNgonNgu: '语言',
  },
  zh_hant: {
    luuDanhBa: '儲存至通訊錄',
    themVaoWallet: '加入 Google Wallet',
    goi: '撥打電話',
    guiEmail: '寄送郵件',
    chiDuong: '導航',
    ketNoi: '聯絡方式',
    quetDeThem: '開啟{app}掃描此二維碼加為好友',
    dong: '關閉',
    diDong: '手機',
    coQuan: '辦公電話',
    diaChi: '地址',
    website: '網站',
    dangTai: '正在載入名片…',
    loiMang: '無法載入名片，請檢查網路後重試。',
    thuLai: '重試',
    khongTimThay: '找不到此名片。',
    daChuyenCongTac: '該員工已調離崗位。',
    lienHeChiNhanh: '請聯絡分行',
    thueNgoai: '越南工商銀行北興安分行服務合作單位',
    ctv: '越南工商銀行北興安分行合作人員',
    thucTap: '越南工商銀行北興安分行實習生',
    chonNgonNgu: '語言',
  },
  ko: {
    luuDanhBa: '연락처 저장',
    themVaoWallet: 'Google Wallet에 추가',
    goi: '전화 걸기',
    guiEmail: '이메일 보내기',
    chiDuong: '길찾기',
    ketNoi: '연결하기',
    quetDeThem: '{app}에서 이 QR 코드를 스캔하여 친구 추가',
    dong: '닫기',
    diDong: '휴대전화',
    coQuan: '사무실 전화',
    diaChi: '주소',
    website: '웹사이트',
    dangTai: '명함을 불러오는 중…',
    loiMang: '명함을 불러올 수 없습니다. 연결 상태를 확인한 후 다시 시도해 주세요.',
    thuLai: '다시 시도',
    khongTimThay: '해당 명함을 찾을 수 없습니다.',
    daChuyenCongTac: '해당 직원은 다른 부서로 이동하였습니다.',
    lienHeChiNhanh: '지점으로 연락해 주십시오',
    thueNgoai: '베트남 공상은행 박흥옌 지점 서비스 협력업체',
    ctv: '베트남 공상은행 박흥옌 지점 협력 파트너',
    thucTap: '베트남 공상은행 박흥옌 지점 인턴',
    chonNgonNgu: '언어',
  },
  ja: {
    luuDanhBa: '連絡先に保存',
    themVaoWallet: 'Google ウォレットに追加',
    goi: '電話をかける',
    guiEmail: 'メールを送る',
    chiDuong: '道順',
    ketNoi: 'つながる',
    quetDeThem: '{app}でこのQRコードを読み取って友だち追加',
    dong: '閉じる',
    diDong: '携帯電話',
    coQuan: '会社電話',
    diaChi: '住所',
    website: 'ウェブサイト',
    dangTai: '名刺を読み込んでいます…',
    loiMang: '名刺を読み込めませんでした。通信状況を確認して再度お試しください。',
    thuLai: '再試行',
    khongTimThay: 'この名刺は見つかりませんでした。',
    daChuyenCongTac: 'この担当者は異動しました。',
    lienHeChiNhanh: '支店までご連絡ください',
    thueNgoai: 'ベトナム工商銀行バクフンイエン支店 サービス提携先',
    ctv: 'ベトナム工商銀行バクフンイエン支店 協力パートナー',
    thucTap: 'ベトナム工商銀行バクフンイエン支店 インターン',
    chonNgonNgu: '言語',
  },
};

/** Tên hiển thị của kênh chat theo ngôn ngữ (WeChat = 微信 với khách Trung Quốc). */
export function tenKenh(type: string, lang: MaNgonNgu): string {
  if (type === 'wechat') return lang === 'zh_hans' ? '微信' : lang === 'zh_hant' ? '微信' : 'WeChat';
  if (type === 'kakaotalk') return lang === 'ko' ? '카카오톡' : 'KakaoTalk';
  if (type === 'line') return 'LINE';
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'linkedin') return 'LinkedIn';
  return 'Zalo';
}
