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
  { id: '1', restaurant: 'banquet', name: '会席Aコース', price: 4000 },
  { id: '2', restaurant: 'banquet', name: '会席Bコース', price: 6000 },
  { id: '3', restaurant: 'banquet', name: '飲み放題', price: 2000 },
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
    notes: '甲殻類アレルギー対応1名',
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
    notes: '',
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
    notes: 'Birthday',
  },
];
