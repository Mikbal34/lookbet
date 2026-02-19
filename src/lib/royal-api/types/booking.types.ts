export interface RoomSearchRequest {
  feedId: string;
  currency: string;
  nationality: string;
  checkIn: string;
  checkOut: string;
  hotelCode: string;
  rooms: { adult: number; childAges?: number[] }[];
}

export interface RoomSearchResponse {
  roomSearchId: string;
  expiresAt: string; // 30 min validity
  rooms: RoomResult[];
}

export interface RoomResult {
  roomCode: string;
  roomName: string;
  boardType: string;
  boardTypeName: string;
  priceCode: string;
  totalPrice: number;
  nightlyPrice: number;
  currency: string;
  cancellationPolicies: CancellationPolicy[];
  attributes: RoomAttributeItem[];
  images: string[];
  allotment: number;
}

export interface CancellationPolicy {
  fromDate: string;
  toDate: string;
  penalty: number;
  penaltyCurrency: string;
  description: string;
}

export interface RoomAttributeItem {
  id: number;
  categoryName: string;
  name: string;
}

export interface CreateBookingRequest {
  feedId: string;
  roomSearchId: string;
  priceCode: string;
  clientReferenceId: string;
  contact: BookingContact;
  rooms: BookingRoom[];
}

export interface BookingContact {
  name: string;
  surname: string;
  email: string;
  phone: string;
}

export interface BookingRoom {
  guests: BookingGuest[];
}

export interface BookingGuest {
  name: string;
  surname: string;
  type: "Adult" | "Child";
  age?: number;
  gender: "Male" | "Female";
  nationality: string;
}

export interface CreateBookingResponse {
  bookingNumber: string;
  status: string;
  hotelConfirmationNumber: string;
  roomConfirmationCodes: string[];
  totalPrice: number;
  currency: string;
}

export interface ReservationDetailResponse {
  bookingNumber: string;
  clientReferenceId: string;
  status: string;
  hotelCode: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  boardType: string;
  roomType: string;
  totalPrice: number;
  currency: string;
  contact: BookingContact;
  guests: BookingGuest[];
  cancellationPolicies: CancellationPolicy[];
  roomConfirmationCodes: string[];
  createdAt: string;
}

export interface CancelBookingRequest {
  bookingNumber: string;
}

export interface CancelBookingResponse {
  bookingNumber: string;
  status: string;
  cancellationFee: number;
  currency: string;
}
