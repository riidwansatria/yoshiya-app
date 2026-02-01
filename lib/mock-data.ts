export const restaurants = [
  { id: 'banquet', name: 'Banquet Hall', icon: '🎋' },
  { id: 'fine_dining', name: 'Fine Dining', icon: '🍷' },
  { id: 'local', name: 'Local Specialty', icon: '🍜' },
  { id: 'skewers', name: 'Skewers Shop', icon: '🍢' },
];

export const halls = [
  { id: '1', restaurant: 'banquet', name: '桜の間', capacity: 30 },
  { id: '2', restaurant: 'banquet', name: '松の間', capacity: 20 },
  { id: '3', restaurant: 'banquet', name: '竹の間', capacity: 15 },
  { id: '4', restaurant: 'banquet', name: '梅の間', capacity: 10 },
  { id: '5', restaurant: 'banquet', name: '菊の間', capacity: 8 },
];

export const customers = [
  { id: '1', name: '田中 太郎', email: 'tanaka@email.com', phone: '090-1234-5678', visits: 12 },
  { id: '2', name: '佐藤 花子', email: 'sato@email.com', phone: '080-2345-6789', visits: 5 },
  { id: '3', name: 'Honda Ken', email: 'honda@email.com', phone: '070-3456-7890', visits: 1 },
];

export const menus = [
  { id: '1', restaurant: 'banquet', name: '会席Aコース', description: '前菜・椀物・刺身・焼物・煮物・食事・デザート', price: 4000 },
  { id: '2', restaurant: 'banquet', name: '会席Bコース', description: '特選会席 - 旬の食材を使った贅沢なコース', price: 6000 },
  { id: '3', restaurant: 'banquet', name: '飲み放題', description: '2時間飲み放題（ビール・日本酒・焼酎・ソフトドリンク）', price: 2000 },
];

export const reservations = [
  {
    id: '1',
    restaurant: 'banquet',
    customerId: '1',
    hallId: '1',
    menuId: '1',
    date: '2026-01-30',
    startTime: '12:00',
    endTime: '15:00',
    partySize: 20,
    status: 'confirmed',
    serviceNotes: '甲殻類アレルギー対応1名',
    // Extended Client Info
    agencyName: 'JTB',
    branchName: '新宿支店',
    agencyTel: '03-1234-5678',
    agencyFax: '03-1234-5679',
    agencyAddress: '東京都新宿区...',
    groupName: '鈴木様御一行',
    arrangerName: '佐藤 (JTB)',
    repName: '鈴木 一郎',
    tourConductorCount: 1,
    crewCount: 0,
  },
  {
    id: '2',
    restaurant: 'banquet',
    customerId: '2',
    hallId: '4',
    menuId: '2',
    date: '2026-01-30',
    startTime: '15:00',
    endTime: '18:00',
    partySize: 30,
    status: 'deposit_paid',
    serviceNotes: '',
  },
  {
    id: '3',
    restaurant: 'banquet',
    customerId: '3',
    hallId: '2',
    menuId: '1',
    date: '2026-01-31',
    startTime: '18:00',
    endTime: '21:00',
    partySize: 15,
    status: 'pending',
    serviceNotes: 'Birthday',
    agencyName: 'HIS',
    branchName: '渋谷支店',
    agencyTel: '03-9876-5432',
    agencyFax: '03-9876-5433',
    agencyAddress: '東京都渋谷区...',
    groupName: 'Honda Group',
    arrangerName: '田中 (HIS)',
    repName: '本田 健',
    tourConductorCount: 1,
    crewCount: 1,
  },
];
